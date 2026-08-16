import { useEffect, useState } from 'react';
import { X, Bell, Download, Cloud, ExternalLink, LogOut, ChevronDown, BookOpen } from 'lucide-react';
import type { Announcement } from '../store/useAnnouncements';
import { supabase } from '../lib/supabase';
import { toast } from '../lib/toast';
import { EmptyMark } from './EmptyMark';

interface Props {
  items: Announcement[];
  readIds: Set<string>;
  onMarkAllRead: () => void;
  onSignOut: () => void;
  onClose: () => void;
}

// 使用說明內容（靜態、固定置頂）
const GUIDE: { label: string; desc: string }[] = [
  { label: '清單', desc: '想吃與吃過的都在這。上方切「想吃 / 嘗過 / 全部」，可搜尋、按縣市篩選，也能切「店家」視角以店彙整；點卡片看詳情、編輯。' },
  { label: '＋ 新增', desc: '中間金色按鈕新增：填店家名稱、點「吃什麼」類別，選縣市或貼 Google 地圖連結會自動定位；其他分店和更多細節收在選填。' },
  { label: '今晚吃什麼', desc: '清單上方按一下開抽籤：來源可切「想吃 / 回訪 / 全部」，想去哪個縣市先選再抽；抽到能直接「帶我去」或再抽一個。' },
  { label: '靈感匣', desc: '看到想吃的截圖先丟進靈感匣（清單右上角圖示），有空再一鍵轉成正式的想吃；整理過的截圖會收進相簿。' },
  { label: '足跡', desc: '在詳情頁按「今天吃了」，或在足跡頁右上「記一筆」直接記（清單沒有的店也行，會一併加進嘗過）。累積成台灣縣市地圖與時間軸，點縣市能看你們在那裡吃過什麼。' },
  { label: '備份', desc: '這頁最下方可看每日自動異地備份、手動下載 JSON、以及登出。' },
];

async function downloadBackup() {
  const tables = ['food_items', 'inspirations', 'announcements', 'foodprints', 'marquee'] as const;
  const dump: Record<string, unknown> = { _backed_up_at: new Date().toISOString() };
  for (const t of tables) {
    // 任何一張表讀失敗就整份中止：寧可沒下載，也不要下載到缺資料的「假備份」
    const { data, error } = await supabase.from(t).select('*');
    if (error) throw error;
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
    } catch {
      toast.error('備份下載失敗，請檢查網路後再試');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg animate-fadein" style={{ maxWidth: 430, margin: '0 auto' }}>
      <div
        className="flex items-center justify-between px-6 pb-4 border-b border-separator"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}
      >
        <button onClick={onClose} className="icon-btn" aria-label="關閉">
          <X size={22} />
        </button>
        <div className="flex items-center gap-2 text-[12px] text-tint">
          <Bell size={13} />
          公告
        </div>
        <div className="w-7" />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* ── 使用說明（固定置頂、可折疊） ── */}
        <div className="border border-separator bg-surface rounded-[16px] overflow-hidden mb-8">
          <button
            onClick={() => setGuideOpen(o => !o)}
            className="w-full flex items-center gap-3 px-5 py-4 text-left"
          >
            <BookOpen size={18} className="text-tint flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="t-heading">使用說明</div>
              <div className="text-[11px] text-muted mt-0.5">第一次用？點開看怎麼操作</div>
            </div>
            <ChevronDown
              size={18}
              className={`text-tint flex-shrink-0 transition-transform ${guideOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {guideOpen && (
            <div className="px-5 pb-5 pt-1 space-y-4">
              {GUIDE.map(g => (
                <div key={g.label} className="flex flex-col gap-1">
                  <span className="t-caption">{g.label}</span>
                  <p className="text-[13px] text-muted leading-relaxed">{g.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 公告列表（點標題展開） ── */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <EmptyMark className="mb-3" />
            <p className="text-muted text-[14px]">目前沒有公告</p>
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
                  className={`border rounded-[16px] overflow-hidden transition-colors ${
                    isUnread
                      ? 'bg-surface border-separator'
                      : 'bg-surface border-separator'
                  }`}
                >
                  {/* 標題列：點一下展開 */}
                  <button
                    onClick={() => toggle(a.id)}
                    className="w-full flex items-start gap-3 px-6 py-5 text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-[10px] text-muted mb-1.5">
                        <span>{dateStr}</span>
                        {isUnread && (
                          <span className="inline-flex items-center gap-1 text-tint">
                            <span className="w-1.5 h-1.5 rounded-full bg-tint" />
                            NEW
                          </span>
                        )}
                      </div>
                      <h3
                        className="t-title leading-[1.35]"
                        style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 500 }}
                      >
                        {a.title}
                      </h3>
                    </div>
                    <ChevronDown
                      size={18}
                      className={`text-tint flex-shrink-0 mt-1 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* 內文：展開才顯示 */}
                  {isOpen && paragraphs.length > 0 && (
                    <div className="px-6 pb-6">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-tint text-[12px]">✦</span>
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-tint to-transparent" />
                      </div>
                      <div
                        className="space-y-4 text-text-2 text-[15.5px] leading-[1.85] whitespace-pre-line"
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
        <div className="mt-10 pt-6 border-t border-separator">
          <div className="eyebrow mb-4">MY DATA</div>

          {/* 自動備份說明 */}
          <div className="bg-surface border border-separator rounded-[16px] p-4 mb-3">
            <div className="flex items-start gap-3">
              <Cloud size={20} className="text-tint flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-[14px] text-text mb-1">每日自動異地備份</div>
                <p className="text-[12px] text-muted leading-relaxed">
                  資料每天台灣早上 8 點自動備份到 GitHub 私人 repo（含圖片）。Supabase 全掛了也救得回來。
                </p>
                <a
                  href="https://github.com/ericyang9212/foodlist-backup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[12px] text-tint mt-2"
                >
                  看備份 repo（私人 · 需登入 GitHub）
                  <ExternalLink size={11} />
                </a>
                <p className="text-[11px] text-muted leading-relaxed mt-1">
                  是私人 repo，沒登入 GitHub 點進去會顯示 404，屬正常。
                </p>
              </div>
            </div>
          </div>

          {/* 手動下載 */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full flex items-center gap-3 bg-surface border border-separator hover:border-line hover:bg-fill rounded-[16px] px-4 py-4 transition-all disabled:opacity-50"
          >
            <Download size={18} className="text-tint flex-shrink-0" />
            <div className="flex-1 text-left">
              <div className="text-[14px] text-text">
                {downloading ? '下載中...' : '立刻下載 JSON 備份'}
              </div>
              <div className="text-[11px] text-muted mt-0.5">想自己留一份在本機隨時可下載</div>
            </div>
          </button>

          {/* 登出 */}
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-3 mt-3 border border-separator hover:border-danger rounded-[16px] px-4 py-3.5 transition-all"
          >
            <LogOut size={17} className="text-muted flex-shrink-0" />
            <span className="text-[14px] text-muted">登出</span>
          </button>
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}
