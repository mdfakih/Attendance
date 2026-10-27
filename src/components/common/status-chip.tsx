import Chip from '@mui/material/Chip';
import { STATUS_COLOR, STATUS_LABEL } from '@/lib/format';

export function StatusChip({ status, size = 'small' }: { status: string; size?: 'small' | 'medium' }) {
  return <Chip size={size} label={STATUS_LABEL[status] ?? status} color={STATUS_COLOR[status] ?? 'default'} variant={STATUS_COLOR[status] === 'default' ? 'outlined' : 'filled'} />;
}
