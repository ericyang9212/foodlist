import type { Foodprint } from '../types';

// 這個檔案刻意不 import leaflet：FoodprintsMap.tsx 跟足跡頁面（時間軸抽屜）都要用同一套
// 「足跡 → 座標」邏輯，但足跡頁面本身不該為了算座標而把整個 leaflet 一起拉進主 bundle。

const BBOX = { minLng: 119.9, maxLng: 122.05, minLat: 21.85, maxLat: 25.35 };

export function inTaiwan(lng: number, lat: number): boolean {
  return lng >= BBOX.minLng && lng <= BBOX.maxLng && lat >= BBOX.minLat && lat <= BBOX.maxLat;
}

// 各縣市概略中心點：多數足跡沒有精確經緯度（短連結不含座標、店名地理編碼常失敗），
// 但幾乎都有縣市 —— 沒座標時就退回落在縣市大概位置，至少看得到。
export const CITY_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  '台北市': { lat: 25.037, lng: 121.564 },
  '新北市': { lat: 25.012, lng: 121.465 },
  '基隆市': { lat: 25.128, lng: 121.739 },
  '桃園市': { lat: 24.994, lng: 121.301 },
  '新竹市': { lat: 24.814, lng: 120.968 },
  '新竹縣': { lat: 24.839, lng: 121.018 },
  '苗栗縣': { lat: 24.560, lng: 120.821 },
  '台中市': { lat: 24.148, lng: 120.674 },
  '彰化縣': { lat: 24.052, lng: 120.516 },
  '南投縣': { lat: 23.902, lng: 120.686 },
  '雲林縣': { lat: 23.708, lng: 120.544 },
  '嘉義市': { lat: 23.480, lng: 120.449 },
  '嘉義縣': { lat: 23.452, lng: 120.256 },
  '台南市': { lat: 22.995, lng: 120.213 },
  '高雄市': { lat: 22.627, lng: 120.301 },
  '屏東縣': { lat: 22.552, lng: 120.549 },
  '宜蘭縣': { lat: 24.702, lng: 121.738 },
  '花蓮縣': { lat: 23.987, lng: 121.602 },
  '台東縣': { lat: 22.758, lng: 121.144 },
  '澎湖縣': { lat: 23.571, lng: 119.579 },
  '金門縣': { lat: 24.449, lng: 118.377 },
  '連江縣': { lat: 26.160, lng: 119.951 },
};

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// 依店名做穩定的小位移，讓同縣市的不同店不會完全疊在一起（約 ±4km）
export function jitter(seed: string): { dlng: number; dlat: number } {
  const h = hashStr(seed);
  const a = (h & 0xffff) / 0xffff;
  const b = ((h >>> 16) & 0xffff) / 0xffff;
  return { dlng: (a - 0.5) * 0.07, dlat: (b - 0.5) * 0.07 };
}

// 給時間軸卡片點擊用：算出單一足跡的地圖座標（邏輯與 FoodprintsMap 的熱力圖資料一致）
export function resolveFoodprintLocation(p: Foodprint): { lat: number; lng: number } | null {
  if (typeof p.restaurantLat === 'number' && typeof p.restaurantLng === 'number') {
    return inTaiwan(p.restaurantLng, p.restaurantLat) ? { lat: p.restaurantLat, lng: p.restaurantLng } : null;
  }
  const c = p.restaurantCity ? CITY_CENTROIDS[p.restaurantCity] : undefined;
  if (!c) return null;
  const label = p.restaurantName || p.foodName;
  const j = jitter(`${p.restaurantCity}|${label}`);
  const lat = c.lat + j.dlat;
  const lng = c.lng + j.dlng;
  return inTaiwan(lng, lat) ? { lat, lng } : null;
}
