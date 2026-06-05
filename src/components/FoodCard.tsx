import { MapPin, Star, Clock, ChevronRight } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { OCCASION_LABELS } from '../types';
import type { FoodItem, Status } from '../types';

interface Props {
  item: FoodItem;
  onOpen: (item: FoodItem) => void;
  onStatusChange: (id: string, status: Status) => void;
}

export function FoodCard({ item, onOpen, onStatusChange }: Props) {
  const nextStatus: Record<Status, Status> = {
    want: 'visited',
    visited: 'revisit',
    revisit: 'want',
    avoid: 'unsure',
    unsure: 'want',
  };

  return (
    <div
      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 cursor-pointer active:scale-[0.99] transition-transform"
      onClick={() => onOpen(item)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <StatusBadge status={item.status} size="sm" />
            {item.cuisineType && (
              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                {item.cuisineType}
              </span>
            )}
            {item.priceRange && (
              <span className="text-xs text-gray-400">{item.priceRange}</span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 text-base leading-tight mt-1">{item.name}</h3>
          {item.description && (
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{item.description}</p>
          )}
        </div>
        <ChevronRight size={18} className="text-gray-300 flex-shrink-0 mt-1" />
      </div>

      {item.restaurants.length > 0 && (
        <div className="flex items-center gap-1 mt-2">
          <MapPin size={12} className="text-gray-400 flex-shrink-0" />
          <span className="text-xs text-gray-500 truncate">
            {item.restaurants[0].name}
            {item.restaurants.length > 1 && ` +${item.restaurants.length - 1}`}
            {item.restaurants[0].area && ` · ${item.restaurants[0].area}`}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          {item.rating && (
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={12}
                  className={i < item.rating! ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}
                />
              ))}
            </div>
          )}
          {item.waitTime && (
            <div className="flex items-center gap-1">
              <Clock size={12} className="text-gray-400" />
              <span className="text-xs text-gray-400">{item.waitTime}</span>
            </div>
          )}
          {item.occasions.slice(0, 2).map(o => (
            <span key={o} className="text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">
              {OCCASION_LABELS[o]}
            </span>
          ))}
        </div>

        <button
          onClick={e => {
            e.stopPropagation();
            onStatusChange(item.id, nextStatus[item.status]);
          }}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-1 rounded-lg hover:bg-gray-50"
        >
          切換狀態
        </button>
      </div>
    </div>
  );
}
