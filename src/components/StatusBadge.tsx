import { STATUS_LABELS } from '../lib/labels';
import type { StatusId } from '../lib/types';

export function StatusBadge({ status }: { status: StatusId }) {
  return (
    <span className={`badge badge--${status}`}>
      <span className="badge__dot" aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
}
