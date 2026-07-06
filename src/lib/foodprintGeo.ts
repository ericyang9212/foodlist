import type { Foodprint } from '../types';

// 台灣 22 縣市的標準名稱，跟 TaiwanMap.tsx 裡 SVG path 的 name 一一對應。
export const TAIWAN_COUNTIES = [
  '台北市', '新北市', '基隆市', '桃園市', '新竹市', '新竹縣', '苗栗縣',
  '台中市', '彰化縣', '南投縣', '雲林縣', '嘉義市', '嘉義縣', '台南市',
  '高雄市', '屏東縣', '宜蘭縣', '花蓮縣', '台東縣', '澎湖縣', '金門縣', '連江縣',
] as const;

// 「新竹」「嘉義」市/縣同名，簡稱無法判斷是哪一個，不放進簡稱表，只認完整名稱。
const CITY_SHORT_ALIASES: Record<string, string> = {
  '台北市': '台北', '新北市': '新北', '基隆市': '基隆', '桃園市': '桃園',
  '苗栗縣': '苗栗', '台中市': '台中', '彰化縣': '彰化', '南投縣': '南投',
  '雲林縣': '雲林', '台南市': '台南', '高雄市': '高雄', '屏東縣': '屏東',
  '宜蘭縣': '宜蘭', '花蓮縣': '花蓮', '台東縣': '台東', '澎湖縣': '澎湖',
  '金門縣': '金門', '連江縣': '連江',
};

function normalizeTw(s: string): string {
  return s.replace(/臺/g, '台');
}

// 把一筆足跡對應到 22 縣市之一：優先看縣市欄位的完整名稱，找不到再退而求其次
// 從地址、店名裡找完整名稱，最後才用無歧義的簡稱（「新竹」「嘉義」故意不猜）。
export function resolveCityName(p: Foodprint): string | undefined {
  const candidates = [p.restaurantCity, p.restaurantAddress, p.restaurantName];

  for (const raw of candidates) {
    if (!raw) continue;
    const s = normalizeTw(raw);
    const exact = TAIWAN_COUNTIES.find(c => s === c || s.includes(c));
    if (exact) return exact;
  }

  for (const raw of candidates) {
    if (!raw) continue;
    const s = normalizeTw(raw);
    for (const [full, short] of Object.entries(CITY_SHORT_ALIASES)) {
      if (s.includes(short)) return full;
    }
  }

  return undefined;
}
