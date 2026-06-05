// 食物優先：心情就是「我對這道食物的感覺」，不是「店去過沒」
export type Status = 'want' | 'tried' | 'skip';
export type PriceRange = '$' | '$$' | '$$$' | '$$$$';
export type Occasion = 'date' | 'late-night' | 'group' | 'solo' | 'family';
export type Tab = 'list' | 'nearby';

export interface Restaurant {
  id: string;
  name: string;
  googleMapsUrl?: string;
  address?: string;
  area?: string;
  priceRange?: PriceRange;
  note?: string;          // 對這家的快評（例如「最便宜」「最近」「排隊久」）
  lat?: number;
  lng?: number;
}

// 主角：「想吃的食物」
export interface FoodItem {
  id: string;
  name: string;            // 食物名稱（主鍵概念）
  description?: string;    // 對這道食物的描述
  status: Status;
  cuisineType?: string;
  occasions: Occasion[];
  restaurants: Restaurant[]; // 配角：可以吃到這道食物的候選店家
  mustOrder: string[];
  notes?: string;
  waitTime?: string;
  rating?: 1 | 2 | 3 | 4 | 5;
  createdAt: string;
  updatedAt: string;
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
