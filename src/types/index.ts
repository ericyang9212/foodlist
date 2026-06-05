export type Status = 'want' | 'visited' | 'revisit' | 'avoid' | 'unsure';
export type PriceRange = '$' | '$$' | '$$$' | '$$$$';
export type Occasion = 'date' | 'late-night' | 'group' | 'solo' | 'family';
export type Tab = 'list' | 'nearby';

export interface Restaurant {
  id: string;
  name: string;
  googleMapsUrl?: string;
  address?: string;
  area?: string;
  lat?: number;
  lng?: number;
}

export interface FoodItem {
  id: string;
  name: string;
  description?: string;
  status: Status;
  cuisineType?: string;
  priceRange?: PriceRange;
  occasions: Occasion[];
  restaurants: Restaurant[];
  mustOrder: string[];
  notes?: string;
  waitTime?: string;
  rating?: 1 | 2 | 3 | 4 | 5;
  createdAt: string;
  updatedAt: string;
}

export const STATUS_LABELS: Record<Status, string> = {
  want: '想吃',
  visited: '已去過',
  revisit: '再訪',
  avoid: '踩雷',
  unsure: '不確定',
};

export const STATUS_COLORS: Record<Status, string> = {
  want: 'bg-orange-100 text-orange-700',
  visited: 'bg-green-100 text-green-700',
  revisit: 'bg-blue-100 text-blue-700',
  avoid: 'bg-red-100 text-red-700',
  unsure: 'bg-gray-100 text-gray-500',
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

export const AREAS = [
  '信義區', '大安區', '中山區', '松山區', '內湖區',
  '士林區', '北投區', '文山區', '南港區', '萬華區',
  '中正區', '大同區', '其他',
];
