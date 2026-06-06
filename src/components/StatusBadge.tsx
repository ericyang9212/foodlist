import { STATUS_STYLES, STATUS_LABELS } from '../types';
import type { Status } from '../types';

interface Props {
  status: Status;
}

export function StatusBadge({ status }: Props) {
  return (
    <span className={`inline-flex items-center text-[12px] tracking-[0.25em] px-2.5 py-1 rounded-sm border ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
