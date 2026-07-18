// 空狀態的小飾紋：細金線 ＋ 菱星，全 app 共用（取代原本的「— —」）
export function EmptyMark({ className = 'mb-4' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 text-[#c9a961]/45 ${className}`}>
      <span className="h-px w-9 bg-gradient-to-r from-transparent to-[#c9a961]/35" />
      <span className="text-[13px] leading-none">✦</span>
      <span className="h-px w-9 bg-gradient-to-l from-transparent to-[#c9a961]/35" />
    </div>
  );
}
