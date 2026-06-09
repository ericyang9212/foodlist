import { useEffect, useState } from 'react';
import { X, Bell, Download, Cloud, ExternalLink, LogOut, ChevronDown, BookOpen } from 'lucide-react';
import type { Announcement } from '../store/useAnnouncements';
import { supabase } from '../lib/supabase';

interface Props {
  items: Announcement[];
  readIds: Set<string>;
  onMarkAllRead: () => void;
  onSignOut: () => void;
  onClose: () => void;
}

// 使用說明內容（靜態、固定置頂）
const GUIDE: { label: string; desc: string }[] = [
  { label: '清單', desc: '你想吃的食物都在這。上方切「想吃 / 嘗過 / 全部」，也能用搜尋或縣市篩選；點卡片看詳情、編輯。' },
  { label: '＋ 新增', desc: '中間金色按鈕新增一道想吃的。可加多家候選店家——貼上 Google Maps 連結就會自動定位；也能填必點、評分、場合。' },
  { label: '今晚吃什麼', desc: '清單頁上方按一下，從「想吃」裡隨機幫你抽一家，選擇障礙救星。' },
  { label: '靈感匣', desc: '看到想吃的截圖先丟進靈感匣（清單頁的未整理截圖入口），有空再一鍵轉成正式的想吃。' },
  { label: '足跡', desc: '吃過後在詳情頁按「今天吃了」，就會記進「足跡」分頁，累積成你的美食統計與時間軸。' },
  { label: '備份', desc: '這頁最下方可看每日自動異地備份、手動下載 JSON、以及登出。' },
];

async function downloadBackup() {
  const tables = ['food_items', 'inspirations', 'announcements', 'foodprints', 'marquee'] as const;
  const dump: Record<string, unknown> = { _backed_up_at: new Date().toISOString() };
  for (const t of tables) {
    const { data } = await supabase.from(t).select('*');
    dump[t] = data ?? [];
  }
  const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `foodlist-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AnnouncementsModal({ items, readIds, onMarkAllRead, onSignOut, onClose }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  // 預設只展開「未讀」的公告，讀過的收合；點標題可自由展開/收合
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(items.filter(a => !readIds.has(a.id)).map(a => a.id))
  );

  useEffect(() => {
    const t = setTimeout(() => onMarkAllRead(), 600);
    return () => clearTimeout(t);
  }, [onMarkAllRead]);

  const toggle = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadBackup();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0a0a]" style={{ maxWidth: 430, margin: '0 auto' }}>
      <div
        className="flex items-center justify-between px-6 pb-4 border-b border-[#1f1f1f]"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}
      >
        <button onClick={onClose} className="icon-btn">
          <X size={22} />
        </button>
        <div className="flex items-center gap-2 text-[12px] tracking-[0.4em] text-[#c9a961]/80">
          <Bell size={13} />
          公告
        </div>
        <div className="w-7" />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* ── 使用說明（固定置頂、可折疊） ── */}
        <div className="border border-[#c9a961]/30 bg-gradient-to-br from-[#141210] to-[#0d0c0a] rounded-[6px] overflow-hidden mb-8">
          <button
            onClick={() => setGuideOpen(o => !o)}
            className="w-full flex items-center gap-3 px-5 py-4 text-left"
          >
            <BookOpen size={18} className="text-[#c9a961] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[15px] text-[#f5f1e8] tracking-[0.15em] font-medium">使用說明</div>
              <div className="text-[11px] text-[#777] tracking-wider mt-0.5">第一次用？點開看怎麼操作</div>
            </div>
            <ChevronDown
              size={18}
              className={`text-[#c9a961]/70 flex-shrink-0 transition-transform ${guideOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {guideOpen && (
            <div className="px-5 pb-5 pt-1 space-y-4">
              {GUIDE.map(g => (
                <div key={g.label} className="flex flex-col gap-1">
                  <span className="text-[13px] text-[#c9a961] tracking-[0.15em]">{g.label}</span>
                  <p className="text-[13px] text-[#b8b2a4] tracking-wide leading-relaxed">{g.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 公告列表（點標題展開） ── */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-[#c9a961]/40 text-3xl tracking-[0.5em] mb-3">— —</div>
            <p className="text-[#777] text-[14px] tracking-wider">目前沒有公告</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map(a => {
              const isUnread = !readIds.has(a.id);
              const isOpen = expanded.has(a.id);
              const paragraphs = (a.body ?? '').split(/\n\n+/).filter(Boolean);
              const dateStr = new Date(a.createdAt)
                .toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })
                .replace(/\//g, ' · ');
              return (
                <article
                  key={a.id}
                  className={`border rounded-[6px] overflow-hidden transition-colors ${
                    isUnread
                      ? 'bg-gradient-to-br from-[#1a1612] to-[#0f0d0a] border-[#c9a961]/35'
                      : 'bg-[#121212] border-[#1a1a1a]'
                  }`}
                >
                  {/* 標題列：點一下展開 */}
                  <button
                    onClick={() => toggle(a.id)}
                    className="w-full flex items-start gap-3 px-6 py-5 text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-[10px] tracking-[0.45em] text-[#555] mb-1.5">
                        <span>{dateStr}</span>
                        {isUnread && (
                          <span className="inline-flex items-center gap-1 text-[#c9a961]/90">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#c9a961]" />
                            NEW
                          </span>
                        )}
                      </div>
                      <h3
                        className="text-gold-gradient text-[21px] leading-[1.35] tracking-[0.04em]"
                        style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 500 }}
                      >
                        {a.title}
                      </h3>
                    </div>
                    <ChevronDown
                      size={18}
                      className={`text-[#c9a961]/60 flex-shrink-0 mt-1 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* 內文：展開才顯示 */}
                  {isOpen && paragraphs.length > 0 && (
                    <div className="px-6 pb-6">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-[#c9a961]/50 text-[12px] tracking-[0.4em]">✦</span>
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-[#c9a961]/40 to-transparent" />
                      </div>
                      <div
                        className="space-y-4 text-[#d6d0c0] text-[15.5px] leading-[1.85] tracking-wide whitespace-pre-line"
                        style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 400 }}
                      >
                        {paragraphs.map((p, i) => (
                          <p key={i}>{p}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {/* 資料備份區 */}
        <div className="mt-10 pt-6 border-t border-[#1f1f1f]">
          <div className="text-[11px] tracking-[0.4em] text-[#c9a961]/70 mb-4">MY DATA</div>

          {/* 自動備份說明 */}
          <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-[6px] p-4 mb-3">
            <div className="flex items-start gap-3">
              <Cloud size={20} className="text-[#c9a961] flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-[14px] text-[#f5f1e8] tracking-wider mb-1">每日自動異地備份</div>
                <p className="text-[12px] text-[#777] tracking-wider leading-relaxed">
                  資料每天台灣早上 8 點自動備份到 GitHub 私人 repo（含圖片）。Supabase 全掛了也救得回來。
                </p>
                <a
                  href="https://github.com/ericyang9212/foodlist-backup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[12px] text-[#c9a961] tracking-wider mt-2"
                >
                  看備份 repo（私人 · 需登入 GitHub）
                  <ExternalLink size={11} />
                </a>
                <p className="text-[11px] text-[#666] tracking-wider leading-relaxed mt-1">
                  是私人 repo，沒登入 GitHub 點進去會顯示 404，屬正常。
                </p>
              </div>
            </div>
          </div>

          {/* 手動下載 */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full flex items-center gap-3 bg-[#0f0f0f] border border-[#2a2a2a] hover:border-[#c9a961]/40 hover:bg-[#c9a961]/5 rounded-[6px] px-4 py-4 transition-all disabled:opacity-50"
          >
            <Download size={18} className="text-[#c9a961] flex-shrink-0" />
            <div className="flex-1 text-left">
              <div className="text-[14px] text-[#f5f1e8] tracking-wider">
                {downloading ? '下載中...' : '立刻下載 JSON 備份'}
              </div>
              <div className="text-[11px] text-[#777] tracking-wider mt-0.5">想自己留一份在本機隨時可下載</div>
            </div>
          </button>

          {/* 登出 */}
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-3 mt-3 border border-[#2a2a2a] hover:border-[#a85959]/50 rounded-[6px] px-4 py-3.5 transition-all"
          >
            <LogOut size={17} className="text-[#8a8478] flex-shrink-0" />
            <span className="text-[14px] text-[#8a8478] tracking-wider">登出</span>
          </button>
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}
