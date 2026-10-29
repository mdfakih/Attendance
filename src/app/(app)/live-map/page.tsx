'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { FilterBar } from '@/components/admin/filter-bar';
import { FeatureGate } from '@/components/common/feature-gate';
import { NamedSelect, useBranches, useSites } from '@/components/common/filters';
import { ErrorAlert, Loading } from '@/components/common/loading';
import { PageHeader } from '@/components/common/page-header';
import { SoftChip } from '@/components/common/status-chip';
import type { MapPoint, MapSite } from '@/components/map/punch-map';
import { formatDate, todayIso } from '@/lib/format';
import { api } from '@/lib/http';

const PunchMap = dynamic(() => import('@/components/map/punch-map'), { ssr: false, loading: () => <Loading minHeight={520} label="Loading map" /> });

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color }} />
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{label}</Typography>
    </Stack>
  );
}

function LiveMap() {
  const [date, setDate] = useState(todayIso());
  const [branchId, setBranchId] = useState('');
  const [siteId, setSiteId] = useState('');
  const params = { date, branchId: branchId || undefined, siteId: siteId || undefined };
  const data = useQuery({ queryKey: ['dashboard', 'map', params], queryFn: () => api.get<{ sites: MapSite[]; points: MapPoint[] }>('/dashboard/map', params), refetchInterval: 60_000 });
  const branches = useBranches();
  const sites = useSites();
  const points = data.data?.points ?? [];
  const ins = points.filter((p) => p.direction === 'IN').length;
  return (
    <>
      <PageHeader title="Live map" subtitle={`Where punches happened ${date === todayIso() ? 'today' : `on ${formatDate(date)}`}, against each site’s geofence. Updates every minute.`} />
      <FilterBar
        end={
          <>
            <SoftChip label={`${points.length} punches`} tone="primary" />
            <SoftChip label={`${data.data?.sites.length ?? 0} sites`} />
            <Box sx={{ flex: 1 }} />
            <Legend color="success.main" label={`Punch in (${ins})`} />
            <Legend color="warning.main" label={`Punch out (${points.length - ins})`} />
            <Legend color="primary.main" label="Site geofence" />
          </>
        }
      >
        <TextField type="date" label="Date" value={date} onChange={(e) => setDate(e.target.value || todayIso())} slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: todayIso() } }} />
        <NamedSelect label="Branch" value={branchId} onChange={setBranchId} options={branches.data} allLabel="All branches" />
        <NamedSelect label="Site" value={siteId} onChange={setSiteId} options={sites.data} allLabel="All sites" />
      </FilterBar>
      {data.error ? (
        <ErrorAlert error={data.error} onRetry={() => data.refetch()} />
      ) : data.data ? (
        <Card sx={{ p: 1 }}>
          <PunchMap sites={data.data.sites} points={data.data.points} height="calc(100vh - 330px)" />
        </Card>
      ) : (
        <Loading minHeight={520} label="Loading map" />
      )}
    </>
  );
}

export default function LiveMapPage() {
  return (
    <FeatureGate feature="LIVE_MAP">
      <LiveMap />
    </FeatureGate>
  );
}
