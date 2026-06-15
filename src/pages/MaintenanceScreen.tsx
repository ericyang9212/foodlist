// 維護中整頁畫面。由資料庫的 app_config.maintenance 旗標控制（用 SQL 開關）。
export function MaintenanceScreen({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-svh bg-[#0a0a0a] px-8 text-center">
      <img
        src="/logo.png"
        alt="PSJ dice list"
        className="w-28 h-28 object-contain mb-7 opacity-90 drop-shadow-[0_4px_20px_rgba(201,169,97,0.2)]"
      />
      <div className="text-[11px] tracking-[0.5em] text-[#c9a961]/60 mb-3">MAINTENANCE</div>
      <h1 className="text-[22px] text-gold-gradient tracking-[0.18em] font-medium mb-4">暫停服務中</h1>
      <p className="text-[#8a8478] text-[14px] tracking-wider leading-relaxed max-w-xs">
        {message || '正在進行維護，請稍後再回來。'}
      </p>
      <div className="mt-8 h-[1px] w-12 bg-[#c9a961]/30" />
    </div>
  );
}
