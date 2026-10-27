'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useQuery } from '@tanstack/react-query';
import { NamedSelect, useBranches, useSites } from '@/components/common/filters';
import { Loading } from '@/components/common/loading';
import { PageHeader } from '@/components/common/page-header';
import type { MapPoint, MapSite } from '@/components/map/punch-map';
import { todayIso } from '@/lib/format';
import { api } from '@/lib/http';

const PunchMap = dynamic(() => import('@/components/map/punch-map'), { ssr: false, loading: () => <Loading minHeight={520} /> });

export default function LiveMapPage() {
  const [date, setDate] = useState(todayIso());
  const [branchId, setBranchId] = useState('');
  const [siteId, setSiteId] = useState('');
  const params = { date, branchId: branchId || undefined, siteId: siteId || undefined };
  const data = useQuery({ queryKey: ['dashboard', 'map', params], queryFn: () => api.get<{ sites: MapSite[]; points: MapPoint[] }>('/dashboard/map', params), refetchInterval: 60_000 });
  const branches = useBranches();
  const sites = useSites();
  return (
    <>
      <PageHeader title="Live map" subtitle={`${data.data?.points.length ?? 0} punches · ${data.data?.sites.length ?? 0} sites`} />
      <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap', mb: 2 }}>
        <TextField type="date" label="Date" value={date} onChange={(e) => setDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 170 }} />
        <NamedSelect label="Branch" value={branchId} onChange={setBranchId} options={branches.data} />
        <NamedSelect label="Site" value={siteId} onChange={setSiteId} options={sites.data} />
      </Stack>
      {data.data ? <PunchMap sites={data.data.sites} points={data.data.points} height="calc(100vh - 260px)" /> : <Loading minHeight={520} />}
    </>
  );
}
