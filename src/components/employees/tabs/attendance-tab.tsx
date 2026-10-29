'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { ErrorAlert, Loading } from '@/components/common/loading';
import { MonthPicker } from '@/components/common/month-picker';
import { SoftChip } from '@/components/common/status-chip';
import { formatMinutes, formatOutside, REG_STATE_LABEL, STATUS_COLOR, STATUS_LABEL, thisMonth, todayIso } from '@/lib/format';
import { api } from '@/lib/http';
import { tint, type Tone } from '@/lib/tone';
import { DayDetailDialog } from './day-detail-dialog';

interface MonthDay {
  date: string;
  status: string;
  statusSource: string;
  dayType: string;
  holidayName: string | null;
  punchCount: number;
  firstPunchAt: string | null;
  lastPunchAt: string | null;
  workedMinutes: number;
  outsideMinutes: number;
  regState: string;
  isLate: boolean;
  isMissingOut: boolean;
  flags: string[];
}

interface MonthView {
  month: string;
  days: MonthDay[];
  totals: { workedMinutes: number; present: number; halfDay: number; absent: number; leave: number; late: number };
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toneOf(status: string): Tone | null {
  const c = STATUS_COLOR[status];
  return !c || c === 'default' ? null : c;
}

export function EmployeeAttendanceTab({ employeeId }: { employeeId: string }) {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(thisMonth());
  const [selected, setSelected] = useState<string | null>(null);
  const view = useQuery({ queryKey: ['employee-month', employeeId, month], queryFn: () => api.get<MonthView>(`/attendance/employees/${employeeId}/month`, { month }) });
  const refresh = () => { queryClient.invalidateQueries({ queryKey: ['employee-month', employeeId] }); queryClient.invalidateQueries({ queryKey: ['employee-day', employeeId] }); };

  const first = dayjs(`${month}-01`);
  const leading = first.day();
  const byDate = new Map(view.data?.days.map((d) => [d.date, d]) ?? []);
  const daysInMonth = first.daysInMonth();
  const today = todayIso();
  const t = view.data?.totals;

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} useFlexGap sx={{ flexWrap: 'wrap', alignItems: { sm: 'center' } }}>
        <MonthPicker value={month} onChange={setMonth} />
        {t && (
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            <SoftChip label={`Present ${t.present}`} tone="success" />
            <SoftChip label={`Half day ${t.halfDay}`} tone="warning" />
            <SoftChip label={`Absent ${t.absent}`} tone="error" />
            <SoftChip label={`Leave ${t.leave}`} tone="secondary" />
            <SoftChip label={`Late ${t.late}`} tone="warning" />
            <SoftChip label={`${formatMinutes(t.workedMinutes)} worked`} tone="primary" />
          </Stack>
        )}
      </Stack>
      {view.error ? <ErrorAlert error={view.error} onRetry={() => view.refetch()} /> : view.isLoading ? <Loading minHeight={420} /> : (
        <Card sx={{ p: { xs: 1, sm: 2 } }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: { xs: 0.5, sm: 0.75 } }}>
            {WEEKDAYS.map((d) => <Typography key={d} variant="caption" color="text.secondary" sx={{ textAlign: 'center', fontWeight: 700, pb: 0.5 }}>{d}</Typography>)}
            {Array.from({ length: leading }).map((_, i) => <Box key={`b${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const date = first.add(i, 'day').format('YYYY-MM-DD');
              const d = byDate.get(date);
              const tone = d ? toneOf(d.status) : null;
              const future = date > today;
              return (
                <Box
                  key={date}
                  role="button"
                  tabIndex={future ? -1 : 0}
                  aria-label={`${dayjs(date).format('D MMMM')}${d ? `, ${STATUS_LABEL[d.status] ?? d.status}` : ''}`}
                  onClick={() => !future && setSelected(date)}
                  onKeyDown={(e) => { if (!future && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setSelected(date); } }}
                  sx={(th) => ({
                    cursor: future ? 'default' : 'pointer',
                    opacity: future ? 0.45 : 1,
                    borderRadius: 2,
                    border: 1,
                    borderColor: selected === date ? 'primary.main' : date === today ? 'primary.light' : 'divider',
                    p: { xs: 0.5, sm: 0.85 },
                    minHeight: { xs: 54, sm: 72 },
                    bgcolor: tone ? tint(th, tone, 0.08) : 'transparent',
                    borderTop: `3px solid ${tone ? th.vars?.palette[tone].main : th.vars?.palette.divider}`,
                    transition: 'background-color .15s',
                    '&:hover': future ? undefined : { bgcolor: tone ? tint(th, tone, 0.16) : 'action.hover' },
                    '&:focus-visible': { outline: `2px solid ${th.vars?.palette.primary.main}`, outlineOffset: 1 },
                  })}
                >
                  <Typography variant="caption" sx={{ fontWeight: 800 }}>{i + 1}</Typography>
                  <Typography variant="caption" sx={{ display: { xs: 'none', sm: 'block' }, color: tone ? `${tone}.main` : 'text.secondary', lineHeight: 1.2, fontWeight: 600 }} noWrap>{d ? STATUS_LABEL[d.status] ?? d.status : ''}</Typography>
                  {d && d.workedMinutes > 0 && <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.2 }} noWrap>{formatMinutes(d.workedMinutes)}{d.isLate ? ' · late' : ''}</Typography>}
                  {d && d.outsideMinutes > 0 && <Typography variant="caption" title={formatOutside(d.outsideMinutes, d.regState)} sx={{ display: { xs: 'none', md: 'block' }, lineHeight: 1.2, color: 'warning.main' }} noWrap>+{formatMinutes(d.outsideMinutes)} · {REG_STATE_LABEL[d.regState] ?? d.regState}</Typography>}
                </Box>
              );
            })}
          </Box>
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1.5 }}>Tap a day to see punches, selfies and manual changes.</Typography>
        </Card>
      )}
      <DayDetailDialog employeeId={employeeId} date={selected} onClose={() => setSelected(null)} onChanged={refresh} />
    </Stack>
  );
}
