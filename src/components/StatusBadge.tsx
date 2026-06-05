import { STATUS_COLORS, STATUS_LABELS } from '../types';
import type { Status } from '../types';

interface Props {
  status: Status;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: Props) {
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClass} ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
