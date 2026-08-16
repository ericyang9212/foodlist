// 空狀態的小飾紋：淡色圓底 + 中央小點，取代原本的金線菱星
export function EmptyMark({ className = 'mb-4' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <span className="w-12 h-12 rounded-full bg-fill flex items-center justify-center">
        <span className="w-2.5 h-2.5 rounded-full bg-fill-strong" />
      </span>
    </div>
  );
}
