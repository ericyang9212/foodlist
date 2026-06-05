import { ArrowLeft, MapPin, Clock, Star, ExternalLink, Edit3, Trash2 } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { OCCASION_LABELS } from '../types';
import type { FoodItem } from '../types';

interface Props {
  item: FoodItem;
  onClose: () => void;
  onEdit: (item: FoodItem) => void;
  onDelete: (id: string) => void;
}

export function DetailPage({ item, onClose, onEdit, onDelete }: Props) {
  const handleDelete = () => {
    if (confirm(`確定要刪除「${item.name}」嗎？`)) {
      onDelete(item.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white" style={{ maxWidth: 430, margin: '0 auto' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
        <button onClick={onClose} className="p-1">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div className="flex items-center gap-3">
          <button onClick={() => onEdit(item)} className="p-1">
            <Edit3 size={18} className="text-gray-600" />
          </button>
          <button onClick={handleDelete} className="p-1">
            <Trash2 size={18} className="text-red-400" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        {/* Title area */}
        <div className="mb-5">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <StatusBadge status={item.status} />
            {item.cuisineType && (
              <span className="text-sm text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                {item.cuisineType}
              </span>
            )}
            {item.priceRange && (
              <span className="text-sm text-gray-500">{item.priceRange}</span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{item.name}</h1>
          {item.description && (
            <p className="text-gray-500 mt-1.5">{item.description}</p>
          )}
        </div>

        {/* Rating */}
        {item.rating && (
          <div className="flex items-center gap-1 mb-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={20}
                className={i < item.rating! ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}
              />
            ))}
            <span className="text-sm text-gray-500 ml-1">{item.rating}/5</span>
          </div>
        )}

        {/* Quick info */}
        <div className="flex flex-wrap gap-2 mb-5">
          {item.occasions.map(o => (
            <span key={o} className="text-sm text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full">
              {OCCASION_LABELS[o]}
            </span>
          ))}
          {item.waitTime && (
            <span className="flex items-center gap-1.5 text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
              <Clock size={14} />
              {item.waitTime}
            </span>
          )}
        </div>

        {/* Must order */}
        {item.mustOrder.length > 0 && (
          <div className="mb-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">必點</h3>
            <div className="flex flex-wrap gap-2">
              {item.mustOrder.map(m => (
                <span key={m} className="text-sm bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full font-medium">
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {item.notes && (
          <div className="mb-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">筆記</h3>
            <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded-xl leading-relaxed">{item.notes}</p>
          </div>
        )}

        {/* Restaurants */}
        {item.restaurants.length > 0 && (
          <div className="mb-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">店家</h3>
            <div className="space-y-2">
              {item.restaurants.map(r => (
                <div key={r.id} className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-800">{r.name}</p>
                      {(r.area || r.address) && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin size={12} className="text-gray-400" />
                          <p className="text-xs text-gray-500">
                            {[r.area, r.address].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                      )}
                    </div>
                    {r.googleMapsUrl && (
                      <a
                        href={r.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1 text-xs text-blue-500 font-medium bg-blue-50 px-2.5 py-1.5 rounded-lg"
                      >
                        <ExternalLink size={12} />
                        地圖
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Meta */}
        <div className="text-xs text-gray-400 border-t border-gray-100 pt-4">
          <p>建立於 {new Date(item.createdAt).toLocaleDateString('zh-TW')}</p>
          {item.updatedAt !== item.createdAt && (
            <p>更新於 {new Date(item.updatedAt).toLocaleDateString('zh-TW')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
