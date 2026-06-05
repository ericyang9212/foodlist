import { useState, useEffect } from 'react';
import { X, Shuffle, ChevronRight } from 'lucide-react';
import type { FoodItem } from '../types';

interface Props {
  candidates: FoodItem[]; // 從「想吃」清單來
  onOpen: (item: FoodItem) => void;
  onClose: () => void;
}

function pickRandom<T>(arr: T[], avoid?: T): T | null {
  if (arr.length === 0) return null;
  if (arr.length === 1) return arr[0];
  let pick = arr[Math.floor(Math.random() * arr.length)];
  let tries = 0;
  while (pick === avoid && tries < 10) {
    pick = arr[Math.floor(Math.random() * arr.length)];
    tries++;
  }
  return pick;
}

export function TonightModal({ candidates, onOpen, onClose }: Props) {
  const [current, setCurrent] = useState<FoodItem | null>(null);
  const [shuffling, setShuffling] = useState(false);

  useEffect(() => {
    setCurrent(pickRandom(candidates));
  }, []);

  const shuffle = () => {
    if (candidates.length <= 1) return;
    setShuffling(true);
    // 視覺上做一個短暫的轉動感
    let count = 0;
    const interval = setInterval(() => {
      setCurrent(pickRandom(candidates, current ?? undefined));
      count++;
      if (count > 6) {
        clearInterval(interval);
        setShuffling(false);
      }
    }, 60);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center px-6"
         onClick={onClose}>
      <div
        className="relative w-full max-w-sm bg-[#0f0f0f] border border-[#c9a961]/30 px-8 py-10"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 p-1">
          <X size={18} className="text-[#666]" />
        </button>

        <div className="text-center mb-8">
          <div className="text-[10px] tracking-[0.5em] text-[#c9a961]/70 mb-2">TONIGHT</div>
          <div className="h-[1px] w-12 bg-[#c9a961]/40 mx-auto" />
        </div>

        {current ? (
          <>
            <div className={`text-center mb-10 transition-opacity ${shuffling ? 'opacity-60' : 'opacity-100'}`}>
              <h2 className="text-[32px] text-gold-gradient font-medium tracking-[0.1em] leading-tight mb-3">
                {current.name}
              </h2>
              <div className="flex items-center justify-center gap-2 text-[11px] text-[#8a8478] tracking-widest">
                {current.cuisineType && <span>{current.cuisineType}</span>}
                {current.restaurants.length > 0 && (
                  <>
                    {current.cuisineType && <span className="text-[#3a3a3a]">·</span>}
                    <span>{current.restaurants.length} 家候選</span>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => { onOpen(current); onClose(); }}
                className="w-full flex items-center justify-center gap-2 bg-[#c9a961] text-[#0a0a0a] py-3.5 text-[13px] tracking-[0.3em] font-medium active:scale-[0.98] transition-transform"
              >
                就決定它了
                <ChevronRight size={16} strokeWidth={2.5} />
              </button>
              <button
                onClick={shuffle}
                disabled={candidates.length <= 1 || shuffling}
                className="w-full flex items-center justify-center gap-2 border border-[#c9a961]/40 text-[#c9a961] py-3.5 text-[12px] tracking-[0.3em] disabled:opacity-40 active:bg-[#c9a961]/10 transition-colors"
              >
                <Shuffle size={14} />
                再抽一個
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-[#666] text-[13px] tracking-wider mb-2">沒有想吃的食物</p>
            <p className="text-[#444] text-[11px] tracking-widest">先去清單新增幾個吧</p>
          </div>
        )}
      </div>
    </div>
  );
}
