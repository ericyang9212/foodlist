import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Foodprint } from '../types';

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

// 把有座標的足跡標在深色地圖上（金色圓點，避免 Leaflet 預設 marker 圖檔在打包後失效）。
export function FoodprintsMap({ items }: { items: Foodprint[] }) {
  const elRef = useRef<HTMLDivElement>(null);
  const withCoords = items.filter(
    p => typeof p.restaurantLat === 'number' && typeof p.restaurantLng === 'number'
  ).length;

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    const map = L.map(el, { attributionControl: true });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19,
    }).addTo(map);

    const latlngs: [number, number][] = [];
    items.forEach(p => {
      if (typeof p.restaurantLat !== 'number' || typeof p.restaurantLng !== 'number') return;
      const ll: [number, number] = [p.restaurantLat, p.restaurantLng];
      latlngs.push(ll);
      L.circleMarker(ll, { radius: 7, color: '#0a0a0a', weight: 2, fillColor: '#c9a961', fillOpacity: 0.95 })
        .addTo(map)
        .bindPopup(
          `<div style="font-weight:600">${escapeHtml(p.foodName)}</div>` +
          (p.restaurantName ? `<div style="color:#888;font-size:12px">${escapeHtml(p.restaurantName)}</div>` : '')
        );
    });

    if (latlngs.length > 0) {
      map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40], maxZoom: 15 });
    } else {
      map.setView([23.7, 121], 7); // 台灣全景
    }

    // 容器在分頁切換後尺寸才確定，補一次 invalidateSize 避免灰屏
    const t = setTimeout(() => map.invalidateSize(), 60);

    return () => { clearTimeout(t); map.remove(); };
  }, [items]);

  return (
    <div>
      <div
        ref={elRef}
        className="w-full rounded-[10px] overflow-hidden border border-[#1f1f1f] bg-[#0d0d0d]"
        style={{ height: '60vh' }}
      />
      {withCoords < items.length && (
        <p className="text-[11px] text-[#666] tracking-wider mt-3 text-center">
          {items.length - withCoords} 筆足跡沒有位置資訊，未顯示在地圖上
        </p>
      )}
    </div>
  );
}
