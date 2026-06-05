// 食物優先：心情是「我對這道食物的感覺」
export type Status = 'want' | 'tried' | 'skip';
export type PriceRange = '$' | '$$' | '$$$' | '$$$$';
export type Occasion = 'date' | 'late-night' | 'group' | 'solo' | 'family';
export type Tab = 'list' | 'inbox' | 'nearby';

export interface Restaurant {
  id: string;
  name: string;
  googleMapsUrl?: string;
  address?: string;
  area?: string;
  priceRange?: PriceRange;
  note?: string;
  lat?: number;
  lng?: number;
}

// 主角：「想吃的食物」
export interface FoodItem {
  id: string;
  name: string;
  description?: string;
  status: Status;
  cuisineType?: string;
  occasions: Occasion[];
  restaurants: Restaurant[];
  mustOrder: string[];
  notes?: string;
  waitTime?: string;
  rating?: 1 | 2 | 3 | 4 | 5;
  inspirationIds?: string[];   // 來自哪些靈感（可多）
  createdAt: string;
  updatedAt: string;
}

// 靈感收集匣：截圖、貼文連結、隨手筆記
export interface Inspiration {
  id: string;
  imageUrl?: string;
  sourceUrl?: string;
  platform?: string;            // ig / threads / friend / other
  note?: string;
  convertedFoodId?: string;     // 已轉成 food item 的話
  createdAt: string;
}

export const STATUS_LABELS: Record<Status, string> = {
  want: '想吃',
  tried: '嘗過',
  skip: '沒興趣',
};

export const STATUS_STYLES: Record<Status, string> = {
  want: 'text-[#e6c87a] border-[#c9a961]/40',
  tried: 'text-[#8a8478] border-[#3a3a3a]',
  skip: 'text-[#555] border-[#2a2a2a]',
};

export const OCCASION_LABELS: Record<Occasion, string> = {
  date: '約會',
  'late-night': '宵夜',
  group: '聚餐',
  solo: '一個人',
  family: '家庭',
};

export const CUISINE_TYPES = [
  '日式', '韓式', '台式', '中式', '義式', '美式',
  '泰式', '越式', '法式', '印式', '素食', '甜點', '飲料', '其他',
];

export const PLATFORM_LABELS: Record<string, string> = {
  ig: 'Instagram',
  threads: 'Threads',
  fb: 'Facebook',
  friend: '朋友推薦',
  other: '其他',
};
