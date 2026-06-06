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
        className="relative w-full max-w-sm bg-[#0f0f0f] border border-[#c9a961]/30 rounded-[8px] shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_40px_rgba(201,169,97,0.15)] px-8 py-10"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 icon-btn">
          <X size={18} />
        </button>

        <div className="text-center mb-10">
          <div className="text-[13px] tracking-[0.5em] text-[#c9a961]/70 mb-3">TONIGHT</div>
          <div className="h-[1px] w-12 bg-[#c9a961]/40 mx-auto" />
        </div>

        {current ? (
          <>
            <div className={`text-center mb-12 transition-opacity ${shuffling ? 'opacity-60' : 'opacity-100'}`}>
              <h2 className="text-[36px] text-gold-gradient font-medium tracking-[0.1em] leading-tight mb-4">
                {current.name}
              </h2>
              <div className="flex items-center justify-center gap-2.5 text-[14px] text-[#8a8478] tracking-widest">
                {current.cuisineType && <span>{current.cuisineType}</span>}
                {current.restaurants.length > 0 && (
                  <>
                    {current.cuisineType && <span className="text-[#3a3a3a]">·</span>}
                    <span>{current.restaurants.length} 家候選</span>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => { onOpen(current); onClose(); }}
                className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-[15px] tracking-[0.3em]"
              >
                就決定它了
                <ChevronRight size={18} strokeWidth={2.5} />
              </button>
              <button
                onClick={shuffle}
                disabled={candidates.length <= 1 || shuffling}
                className="btn-secondary w-full flex items-center justify-center gap-2 py-4 text-[14px] tracking-[0.3em] disabled:opacity-40"
              >
                <Shuffle size={16} />
                再抽一個
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-[#777] text-[15px] tracking-wider mb-2">沒有想吃的食物</p>
            <p className="text-[#555] text-[13px] tracking-widest">先去清單新增幾個吧</p>
          </div>
        )}
      </div>
    </div>
  );
}
