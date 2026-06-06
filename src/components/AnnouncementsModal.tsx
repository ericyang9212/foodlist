import { useEffect, useState } from 'react';
import { X, Bell, Download, Cloud, ExternalLink } from 'lucide-react';
import type { Announcement } from '../store/useAnnouncements';
import { supabase } from '../lib/supabase';

interface Props {
  items: Announcement[];
  readIds: Set<string>;
  onMarkAllRead: () => void;
  onClose: () => void;
}

async function downloadBackup() {
  const tables = ['food_items', 'inspirations', 'announcements'] as const;
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

export function AnnouncementsModal({ items, readIds, onMarkAllRead, onClose }: Props) {
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => onMarkAllRead(), 600);
    return () => clearTimeout(t);
  }, [onMarkAllRead]);

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
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-[#c9a961]/40 text-3xl tracking-[0.5em] mb-3">— —</div>
            <p className="text-[#777] text-[14px] tracking-wider">目前沒有公告</p>
          </div>
        ) : (
          <div className="space-y-8">
            {items.map(a => {
              const isUnread = !readIds.has(a.id);
              const paragraphs = (a.body ?? '').split(/\n\n+/).filter(Boolean);
              return (
                <article
                  key={a.id}
                  className={`relative ${
                    isUnread
                      ? 'bg-gradient-to-br from-[#1a1612] to-[#0f0d0a] border-[#c9a961]/35'
                      : 'bg-[#121212] border-[#1a1a1a]'
                  } border px-7 py-7`}
                >
                  {isUnread && (
                    <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 text-[9px] tracking-[0.4em] text-[#c9a961]/90">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#c9a961]" />
                      NEW
                    </span>
                  )}

                  {/* 裝飾線 */}
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[#c9a961]/50 text-[12px] tracking-[0.4em]">✦</span>
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-[#c9a961]/40 to-transparent" />
                  </div>

                  {/* 標題：襯線體放大 */}
                  <h3
                    className="text-gold-gradient text-[26px] leading-[1.3] tracking-[0.04em] mb-3"
                    style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 500 }}
                  >
                    {a.title}
                  </h3>

                  {/* 日期：低調的編號感 */}
                  <div className="flex items-center gap-2 text-[10px] tracking-[0.45em] text-[#555] mb-6">
                    <span>
                      {new Date(a.createdAt).toLocaleDateString('zh-TW', {
                        year: 'numeric', month: '2-digit', day: '2-digit',
                      }).replace(/\//g, ' · ')}
                    </span>
                  </div>

                  {/* 內文：段落間有呼吸 */}
                  {paragraphs.length > 0 && (
                    <div
                      className="space-y-4 text-[#d6d0c0] text-[15.5px] leading-[1.85] tracking-wide whitespace-pre-line"
                      style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 400 }}
                    >
                      {paragraphs.map((p, i) => (
                        <p key={i} className={i === 0 ? 'first-letter:text-[#c9a961] first-letter:text-[20px] first-letter:font-medium' : ''}>
                          {p}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* 底部裝飾 */}
                  <div className="flex items-center gap-3 mt-6">
                    <div className="h-[1px] flex-1 bg-gradient-to-l from-[#c9a961]/30 to-transparent" />
                    <span className="text-[#c9a961]/40 text-[10px] tracking-[0.4em]">END</span>
                  </div>
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
                  看備份 repo
                  <ExternalLink size={11} />
                </a>
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
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}
