import { STATUS_STYLES, STATUS_LABELS } from '../types';
import type { Status } from '../types';

interface Props {
  status: Status;
}

export function StatusBadge({ status }: Props) {
  return (
    <span className={`inline-flex items-center text-[10px] tracking-[0.2em] uppercase px-2 py-0.5 border ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
