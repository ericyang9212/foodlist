import { useState, useMemo, useEffect, useRef, lazy, Suspense } from 'react';
import { Footprints, List, Images, Bell, Sparkles, Stars } from 'lucide-react';
import { FoodprintsPage } from './FoodprintsPage';
import { TonightModal } from '../components/TonightModal';
import { QuickAddRegularSheet } from '../components/QuickAddRegularSheet';
import type { FoodItem, Foodprint, Inspiration } from '../types';

// 清單與靈感匣不是預設段落：進到那裡才下載，首屏維持只載足跡（含台灣地圖）
const ListView = lazy(() => import('./ListView').then(m => ({ default: m.ListView })));
const InboxPage = lazy(() => import('./InboxPage').then(m => ({ default: m.InboxPage })));

interface Props {
  items: FoodItem[];
  foodprints: Foodprint[];
  inspirations: Inspiration[];
  inspirationsLoading: boolean;
  imageByFoodId: Record<string, string>;
  lastEatenByFoodId: Record<string, string>;
  foodById: Record<string, FoodItem>;
  unreadAnnouncements: number;
  onOpen: (item: FoodItem) => void;
  onOpenAnnouncements: () => void;
  onAddRegular: (item: FoodItem) => Promise<boolean>;
  onDeleteFoodprint: (id: string) => void;
  onQuickLog: () => void;
  onOpenWishPool: () => void;
  openWishCount: number;
  onUploadInspiration: (file: File, note: string) => Promise<void>;
  onDeleteInspiration: (id: string) => void;
  onUpdateInspiration: (insp: Inspiration) => void;
  onConvertInspiration: (insp: Inspiration) => void;
  onOpenFood: (foodId: string) => void;
}

type Section = 'foodprints' | 'list' | 'inbox';
type ListTab = 'want' | 'tried' | 'all';

// 每個段落有自己的點題色（chip 選中時上色），整頁才不會只剩黑白灰
const SECTIONS: {
  value: Section; label: string; icon: typeof Footprints; accent: 'rose' | 'gold' | 'mauve';
}[] = [
  { value: 'foodprints', label: '足跡', icon: Footprints, accent: 'gold' },
  { value: 'list', label: '清單', icon: List, accent: 'rose' },
  { value: 'inbox', label: '靈感匣', icon: Images, accent: 'mauve' },
];

const CITY_FILTER_KEY = 'foodlist_city_filter';

// 段落切換列吸頂位置：剛好停在跑馬燈（safe area + 56px）下方
const SECTION_BAR_TOP = 'calc(env(safe-area-inset-top) + 56px)';
const SECTION_BAR_HEIGHT = 52;
// 清單段落自己的搜尋 / 篩選列再往下吸，疊在段落切換列底下
const LIST_STICKY_TOP = `calc(env(safe-area-inset-top) + ${56 + SECTION_BAR_HEIGHT}px)`;

// 合併後的單一主畫面：足跡是主軸，清單與靈感匣是同一頁的另外兩個段落。
// 三者共用這裡的捲動容器、品牌抬頭與抽籤入口，底部只留新增按鈕。
export function HomePage({
  items, foodprints, inspirations, inspirationsLoading,
  imageByFoodId, lastEatenByFoodId, foodById, unreadAnnouncements,
  onOpen, onOpenAnnouncements, onAddRegular,
  onDeleteFoodprint, onQuickLog, onOpenWishPool, openWishCount,
  onUploadInspiration, onDeleteInspiration, onUpdateInspiration, onConvertInspiration, onOpenFood,
}: Props) {
  const [section, setSection] = useState<Section>('foodprints');
  const [showTonight, setShowTonight] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  // 清單的篩選狀態放在這裡：抽籤 / 快速加店完成後要能直接把清單切到對的分頁
  const [listTab, setListTab] = useState<ListTab>('want');
  const [activeCity, setActiveCity] = useState<string | null>(() => {
    try { return localStorage.getItem(CITY_FILTER_KEY); } catch { return null; }
  });

  // 持久化縣市選擇
  useEffect(() => {
    if (activeCity) localStorage.setItem(CITY_FILTER_KEY, activeCity);
    else localStorage.removeItem(CITY_FILTER_KEY);
  }, [activeCity]);

  const wantItems = useMemo(() => items.filter(i => i.status === 'want'), [items]);
  // 回訪池：吃過的安心牌（不含標了「不好吃」的）
  const triedItems = useMemo(() => items.filter(i => i.status === 'tried'), [items]);
  const pendingInspirations = useMemo(
    () => inspirations.filter(i => !i.convertedFoodId).length,
    [inspirations]
  );

  const canDraw = wantItems.length > 0 || triedItems.length > 0;

  // 切段落時捲回頂端：三個段落共用同一個捲動容器，
  // 不歸零的話會帶著上一段的捲動位置進到新段落，落在半途很難懂
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectSection = (next: Section) => {
    setSection(next);
    scrollRef.current?.scrollTo({ top: 0 });
  };

  return (
    // 整頁單一捲動容器：抬頭會隨內容往上滑走，段落切換列則吸在跑馬燈下方
    <div ref={scrollRef} className="h-full overflow-y-auto bg-bg">
      <div
        className="px-6 pb-5"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 72px)' }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 flex items-center gap-3 min-w-0">
            {/* iOS app icon 的作法：圖放進圓角方塊，不讓它散在背景上 */}
            <div
              className="w-12 h-12 rounded-[14px] flex items-center justify-center flex-shrink-0 overflow-hidden"
              style={{ background: 'var(--metal-rose)', boxShadow: 'var(--metal-gloss), var(--shadow-card)' }}
            >
              <img src="/logo.png" alt="" className="w-10 h-10 object-contain" />
            </div>
            {/* 標題只留字標本身：升成 h1（頁面仍要有一個標題），走襯線大字，
                不再是原本那行 12px 的灰色眉標 */}
            <h1 className="t-display min-w-0 truncate">PSJ DICE LIST</h1>
          </div>
          <button
            onClick={onOpenAnnouncements}
            className="icon-btn relative -mr-2 flex-shrink-0"
            aria-label="公告"
          >
            <Bell size={20} />
            {unreadAnnouncements > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full" />
            )}
          </button>
        </div>

        {/* 兩個動作入口並排：抽籤與許願池都是「做一件事」，不是資料段落，
            所以放這裡而不是加進下面的段落切換列（那排放第四顆會在小手機上撐爆） */}
        <div className="mt-5 flex items-center gap-2.5 flex-wrap">
          {canDraw && (
            <button
              onClick={() => setShowTonight(true)}
              className="btn-secondary flex items-center gap-2.5 px-6 py-4 t-heading"
            >
              <Sparkles size={19} />
              今晚吃什麼
            </button>
          )}
          <button
            onClick={onOpenWishPool}
            className="btn-secondary flex items-center gap-2.5 px-6 py-4 t-heading"
          >
            <Stars size={19} />
            許願池
            {openWishCount > 0 && (
              <span className="text-[13px] tabular-nums opacity-80">{openWishCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* ── 段落切換：足跡 / 清單 / 靈感匣，往下滑時固定在跑馬燈下方 ── */}
      <div
        className="sticky z-30 blur-bar border-b border-separator"
        style={{ top: SECTION_BAR_TOP }}
      >
        <div
          className="flex items-center gap-2 px-6"
          style={{ height: SECTION_BAR_HEIGHT }}
        >
          {SECTIONS.map(s => {
            const active = section === s.value;
            const Icon = s.icon;
            return (
              <button
                key={s.value}
                onClick={() => selectSection(s.value)}
                aria-current={active ? 'page' : undefined}
                data-accent={s.accent}
                className={`flex items-center gap-1.5 px-4 py-2 t-caption ${active ? 'chip chip-active' : 'chip'}`}
              >
                <Icon size={15} />
                {s.label}
                {s.value === 'inbox' && pendingInspirations > 0 && (
                  <span className="text-[11px] tabular-nums opacity-80">
                    {pendingInspirations}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* key 讓段落一切換就重播進場動畫 */}
      {section === 'foodprints' && (
        <div key="foodprints" className="animate-rise">
          <FoodprintsPage
            items={foodprints}
            imageByFoodId={imageByFoodId}
            onDelete={onDeleteFoodprint}
            onQuickLog={onQuickLog}
          />
        </div>
      )}

      {section === 'list' && (
        <Suspense fallback={<SectionLoader />}>
          <div key="list" className="animate-rise">
            <ListView
              items={items}
              imageByFoodId={imageByFoodId}
              lastEatenByFoodId={lastEatenByFoodId}
              activeTab={listTab}
              onTabChange={setListTab}
              activeCity={activeCity}
              onCityChange={setActiveCity}
              stickyTop={LIST_STICKY_TOP}
              onOpen={onOpen}
              onQuickAdd={() => setShowQuickAdd(true)}
            />
          </div>
        </Suspense>
      )}

      {section === 'inbox' && (
        <Suspense fallback={<SectionLoader />}>
          <div key="inbox" className="animate-rise">
            <InboxPage
              items={inspirations}
              loading={inspirationsLoading}
              onUpload={onUploadInspiration}
              onDelete={onDeleteInspiration}
              onUpdate={onUpdateInspiration}
              onConvertToFood={onConvertInspiration}
              foodById={foodById}
              onOpenFood={onOpenFood}
            />
          </div>
        </Suspense>
      )}

      {showTonight && (
        <TonightModal
          wantItems={wantItems}
          triedItems={triedItems}
          lastEatenByFoodId={lastEatenByFoodId}
          onOpen={onOpen}
          onClose={() => setShowTonight(false)}
          onQuickAdd={() => { setShowTonight(false); setShowQuickAdd(true); }}
        />
      )}

      {showQuickAdd && (
        <QuickAddRegularSheet
          onSave={async (item) => {
            // 新增失敗（store 已跳 toast 並回滾）就留在表單，不假裝成功
            const ok = await onAddRegular(item);
            if (!ok) return;
            setShowQuickAdd(false);
            // 加完切到清單的「嘗過」且清掉縣市篩選，確保剛加的一定看得到
            selectSection('list');
            setListTab('tried');
            setActiveCity(null);
          }}
          onClose={() => setShowQuickAdd(false)}
        />
      )}
    </div>
  );
}

// 段落 chunk 還在下載時的佔位：只佔一小塊，不整頁閃白
function SectionLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <p className="eyebrow">LOADING</p>
    </div>
  );
}
