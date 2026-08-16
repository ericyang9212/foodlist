import { STATUS_LABELS } from '../types';
import type { Status } from '../types';

interface Props {
  status: Status;
}

// 淡色底 + 同色系文字的 iOS 標籤；三個狀態各自一個色相
const STYLES: Record<Status, string> = {
  want: 'bg-coral-soft text-coral',
  tried: 'bg-teal-soft text-teal',
  skip: 'bg-fill text-muted',
};

export function StatusBadge({ status }: Props) {
  return (
    <span className={`inline-flex items-center text-[12px] font-semibold px-2.5 py-1 rounded-full ${STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
