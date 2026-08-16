import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw } from 'lucide-react';

// 偵測到部署了新版時，跳一條 in-app 橫幅讓使用者點一下就更新。
// （web app 沒有系統推播，更新提示只能在開著／重新打開 App 時出現。）
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      // App 長時間開著時，每小時主動檢查一次有沒有新版
      if (registration) {
        setInterval(() => { void registration.update(); }, 60 * 60 * 1000);
      }
    },
  });

  if (!needRefresh) return null;

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-32px)] max-w-[400px] bg-surface border border-separator rounded-[14px] shadow-[var(--shadow-raised)] px-5 py-4 flex items-center gap-3"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 100px)' }}
    >
      <RefreshCw size={20} className="text-tint flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[14px] text-text">有新版本</div>
        <div className="text-[11px] text-muted mt-0.5">點更新載入最新功能</div>
      </div>
      <button
        onClick={() => void updateServiceWorker(true)}
        className="btn-primary px-4 py-2 text-[13px] flex-shrink-0"
      >
        更新
      </button>
      <button
        onClick={() => setNeedRefresh(false)}
        className="text-muted text-[12px] flex-shrink-0 px-1"
      >
        稍後
      </button>
    </div>
  );
}
