import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import {
  CUISINE_TYPES, OCCASION_LABELS, STATUS_LABELS, AREAS,
} from '../types';
import type { FoodItem, Status, PriceRange, Occasion, Restaurant } from '../types';

interface Props {
  item?: FoodItem;
  onSave: (item: FoodItem) => void;
  onClose: () => void;
}

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

const STATUSES: Status[] = ['want', 'visited', 'revisit', 'avoid', 'unsure'];
const PRICE_RANGES: PriceRange[] = ['$', '$$', '$$$', '$$$$'];
const OCCASIONS = Object.keys(OCCASION_LABELS) as Occasion[];

export function AddEditPage({ item, onSave, onClose }: Props) {
  const isEdit = !!item;

  const [name, setName] = useState(item?.name ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [status, setStatus] = useState<Status>(item?.status ?? 'want');
  const [cuisineType, setCuisineType] = useState(item?.cuisineType ?? '');
  const [priceRange, setPriceRange] = useState<PriceRange | ''>(item?.priceRange ?? '');
  const [occasions, setOccasions] = useState<Occasion[]>(item?.occasions ?? []);
  const [notes, setNotes] = useState(item?.notes ?? '');
  const [waitTime, setWaitTime] = useState(item?.waitTime ?? '');
  const [mustOrderInput, setMustOrderInput] = useState('');
  const [mustOrder, setMustOrder] = useState<string[]>(item?.mustOrder ?? []);
  const [restaurants, setRestaurants] = useState<Restaurant[]>(item?.restaurants ?? []);
  const [rating, setRating] = useState<number | undefined>(item?.rating);

  // New restaurant form
  const [showRestForm, setShowRestForm] = useState(false);
  const [restName, setRestName] = useState('');
  const [restArea, setRestArea] = useState('');
  const [restAddress, setRestAddress] = useState('');
  const [restUrl, setRestUrl] = useState('');

  const toggleOccasion = (o: Occasion) => {
    setOccasions(prev => prev.includes(o) ? prev.filter(x => x !== o) : [...prev, o]);
  };

  const addMustOrder = () => {
    const v = mustOrderInput.trim();
    if (v && !mustOrder.includes(v)) {
      setMustOrder(prev => [...prev, v]);
      setMustOrderInput('');
    }
  };

  const addRestaurant = () => {
    if (!restName.trim()) return;
    const newRest: Restaurant = {
      id: makeId(),
      name: restName.trim(),
      area: restArea || undefined,
      address: restAddress || undefined,
      googleMapsUrl: restUrl || undefined,
    };
    setRestaurants(prev => [...prev, newRest]);
    setRestName(''); setRestArea(''); setRestAddress(''); setRestUrl('');
    setShowRestForm(false);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const now = new Date().toISOString();
    const saved: FoodItem = {
      id: item?.id ?? makeId(),
      name: name.trim(),
      description: description.trim() || undefined,
      status,
      cuisineType: cuisineType || undefined,
      priceRange: (priceRange as PriceRange) || undefined,
      occasions,
      restaurants,
      mustOrder,
      notes: notes.trim() || undefined,
      waitTime: waitTime.trim() || undefined,
      rating: rating as FoodItem['rating'],
      createdAt: item?.createdAt ?? now,
      updatedAt: now,
    };
    onSave(saved);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white" style={{ maxWidth: 430, margin: '0 auto' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
        <button onClick={onClose} className="p-1">
          <X size={20} className="text-gray-600" />
        </button>
        <h2 className="font-semibold text-gray-900">{isEdit ? '編輯品項' : '新增品項'}</h2>
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="text-orange-500 font-semibold text-sm disabled:opacity-40"
        >
          儲存
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-5 space-y-6">

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              品項名稱 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="例如：炙燒鮭魚握壽司"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              簡短描述
            </label>
            <input
              type="text"
              placeholder="一句話形容這道菜..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              狀態
            </label>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                    status === s ? 'bg-gray-900 text-white border-transparent' : 'border-gray-200 text-gray-600'
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Cuisine + Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                料理類型
              </label>
              <select
                value={cuisineType}
                onChange={e => setCuisineType(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
              >
                <option value="">選擇...</option>
                {CUISINE_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                價位
              </label>
              <div className="flex gap-1">
                {PRICE_RANGES.map(p => (
                  <button
                    key={p}
                    onClick={() => setPriceRange(priceRange === p ? '' : p)}
                    className={`flex-1 py-2 text-xs rounded-lg border transition-colors ${
                      priceRange === p ? 'bg-gray-900 text-white border-transparent' : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Occasions */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              適合情境
            </label>
            <div className="flex flex-wrap gap-2">
              {OCCASIONS.map(o => (
                <button
                  key={o}
                  onClick={() => toggleOccasion(o)}
                  className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                    occasions.includes(o) ? 'bg-indigo-500 text-white border-transparent' : 'border-gray-200 text-gray-600'
                  }`}
                >
                  {OCCASION_LABELS[o]}
                </button>
              ))}
            </div>
          </div>

          {/* Must order */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              必點品項
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="輸入品項名稱"
                value={mustOrderInput}
                onChange={e => setMustOrderInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addMustOrder()}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
              <button
                onClick={addMustOrder}
                className="px-3 py-2 bg-gray-100 rounded-xl text-gray-600 text-sm font-medium"
              >
                新增
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {mustOrder.map(m => (
                <span key={m} className="flex items-center gap-1 text-sm bg-orange-50 text-orange-700 px-2.5 py-1 rounded-full">
                  {m}
                  <button onClick={() => setMustOrder(prev => prev.filter(x => x !== m))}>
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Restaurants */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              對應店家
            </label>
            <div className="space-y-2 mb-2">
              {restaurants.map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{r.name}</p>
                    {r.area && <p className="text-xs text-gray-500">{r.area}{r.address && ` · ${r.address}`}</p>}
                  </div>
                  <button
                    onClick={() => setRestaurants(prev => prev.filter(x => x.id !== r.id))}
                    className="text-gray-400 p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            {showRestForm ? (
              <div className="border border-gray-200 rounded-xl p-3 space-y-2">
                <input
                  type="text"
                  placeholder="店名 *"
                  value={restName}
                  onChange={e => setRestName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
                <select
                  value={restArea}
                  onChange={e => setRestArea(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
                >
                  <option value="">區域（選填）</option>
                  {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <input
                  type="text"
                  placeholder="地址（選填）"
                  value={restAddress}
                  onChange={e => setRestAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
                <input
                  type="url"
                  placeholder="Google Maps 連結（選填）"
                  value={restUrl}
                  onChange={e => setRestUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
                <div className="flex gap-2">
                  <button
                    onClick={addRestaurant}
                    className="flex-1 py-2 bg-gray-900 text-white text-sm rounded-lg font-medium"
                  >
                    確認新增
                  </button>
                  <button
                    onClick={() => setShowRestForm(false)}
                    className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg"
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowRestForm(true)}
                className="flex items-center gap-2 text-sm text-orange-500 font-medium py-2"
              >
                <Plus size={16} />
                新增店家
              </button>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              個人筆記
            </label>
            <textarea
              placeholder="排隊時間、推薦時段、雷點、適合對象..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
            />
          </div>

          {/* Wait time + Rating */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                等待時間
              </label>
              <input
                type="text"
                placeholder="例如：30分鐘"
                value={waitTime}
                onChange={e => setWaitTime(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                評分
              </label>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setRating(rating === n ? undefined : n)}
                    className={`text-xl transition-colors ${n <= (rating ?? 0) ? 'text-amber-400' : 'text-gray-200'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}
