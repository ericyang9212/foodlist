import { safeHttpUrl } from './url';
import type { Restaurant, FoodItem } from '../types';

// 一家店的 Google Maps 連結：優先用使用者貼的連結（已過濾 scheme），否則用店名+地區搜尋
export function mapsUrlForRestaurant(r: Restaurant): string {
  const safe = safeHttpUrl(r.googleMapsUrl);
  if (safe) return safe;
  const q = encodeURIComponent([r.name, r.city, r.area, r.address].filter(Boolean).join(' '));
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

// 一道食物的地圖連結：有候選店就帶第一家，沒有就直接搜食物名
export function mapsUrlForFood(item: FoodItem): string {
  if (item.restaurants.length > 0) return mapsUrlForRestaurant(item.restaurants[0]);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.name)}`;
}
