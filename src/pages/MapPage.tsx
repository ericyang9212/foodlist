import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import { MapPin } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import type { FoodItem } from '../types';


interface Props {
  items: FoodItem[];
  onOpen: (item: FoodItem) => void;
}

export function MapPage({ items, onOpen }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [loaded, setLoaded] = useState(false);

  const itemsWithLocation = items.filter(
    item => item.restaurants.some(r => r.lat && r.lng)
  );

  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      if (!mapRef.current || mapInstanceRef.current) return;

      const leaflet = await import('leaflet');
      await import('leaflet/dist/leaflet.css');

      if (cancelled || !mapRef.current) return;

      // Fix default icon path
      delete (leaflet.Icon.Default.prototype as any)._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const map = leaflet.map(mapRef.current, {
        center: [25.033, 121.5654],
        zoom: 13,
        zoomControl: true,
      });

      leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;

      // Add markers
      items.forEach(item => {
        item.restaurants.forEach(r => {
          if (!r.lat || !r.lng) return;

          const statusColors: Record<string, string> = {
            want: '#f97316',
            visited: '#22c55e',
            revisit: '#3b82f6',
            avoid: '#ef4444',
            unsure: '#9ca3af',
          };

          const color = statusColors[item.status] || '#9ca3af';
          const icon = leaflet.divIcon({
            className: '',
            html: `<div style="
              width: 32px; height: 32px;
              background: ${color};
              border: 3px solid white;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              box-shadow: 0 2px 8px rgba(0,0,0,0.25);
            "></div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
          });

          const marker = leaflet.marker([r.lat, r.lng], { icon }).addTo(map);
          marker.on('click', () => setSelected(item));
        });
      });

      setLoaded(true);
    }

    initMap();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-14 pb-3 bg-[#f8f7f5]">
        <h1 className="text-2xl font-bold text-gray-900">地圖</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {itemsWithLocation.length} 個有位置資訊的品項
        </p>
      </div>

      <div className="flex-1 relative mx-4 mb-24 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
            <div className="text-gray-400 text-sm">載入地圖中...</div>
          </div>
        )}
        <div ref={mapRef} className="w-full h-full" style={{ minHeight: '400px' }} />

        {/* Selected item card */}
        {selected && (
          <div
            className="absolute bottom-4 left-4 right-4 bg-white rounded-2xl p-4 shadow-lg border border-gray-100 z-[1000] cursor-pointer"
            onClick={() => onOpen(selected)}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge status={selected.status} size="sm" />
                  {selected.cuisineType && (
                    <span className="text-xs text-gray-400">{selected.cuisineType}</span>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900">{selected.name}</h3>
                {selected.restaurants[0] && (
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin size={12} className="text-gray-400" />
                    <span className="text-xs text-gray-500">{selected.restaurants[0].name}</span>
                  </div>
                )}
              </div>
              <button
                onClick={e => { e.stopPropagation(); setSelected(null); }}
                className="text-gray-400 text-lg leading-none"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>

      {itemsWithLocation.length === 0 && loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <div className="text-4xl mb-3">📍</div>
          <p className="text-gray-500 text-sm">新增品項時加上店家地址，就會顯示在地圖上</p>
        </div>
      )}
    </div>
  );
}
