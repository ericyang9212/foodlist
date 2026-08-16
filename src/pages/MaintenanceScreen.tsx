// 維護中整頁畫面。由資料庫的 app_config.maintenance 旗標控制（用 SQL 開關）。
export function MaintenanceScreen({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-svh bg-bg px-8 text-center">
      <img
        src="/logo.png"
        alt="PSJ dice list"
        className="w-28 h-28 object-contain mb-7 opacity-90 drop-shadow-[0_4px_22px_rgba(232,168,154,0.28)]"
      />
      <div className="eyebrow mb-3">MAINTENANCE</div>
      <h1 className="t-title mb-4">暫停服務中</h1>
      {/* 沒訊息就整段不出現（不再退回寫死的預設文案）。
          用 trim 判斷：只有空白的訊息等同沒訊息，才不會留下一段空白 <p> 撐開版面。 */}
      {message?.trim() && (
        <p className="text-muted text-[14px] leading-relaxed max-w-xs">
          {message}
        </p>
      )}
      <div className="mt-8 h-[1px] w-12 bg-separator" />
    </div>
  );
}
