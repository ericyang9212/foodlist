import { STATUS_STYLES, STATUS_LABELS } from '../types';
import type { Status } from '../types';

interface Props {
  status: Status;
}

const DOT: Record<Status, string> = {
  want: 'bg-[#d6b974]',
  tried: 'bg-[#6b6553]',
  skip: 'bg-[#444]',
};

export function StatusBadge({ status }: Props) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] tracking-[0.18em] px-2.5 py-1 rounded-full border ${STATUS_STYLES[status]}`}>
      <span className={`w-[5px] h-[5px] rounded-full ${DOT[status]}`} />
      {STATUS_LABELS[status]}
    </span>
  );
}
