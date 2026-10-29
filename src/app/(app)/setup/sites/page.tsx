'use client';

import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import AddIcon from '@mui/icons-material/Add';
import MyLocationOutlinedIcon from '@mui/icons-material/MyLocationOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormDialog } from '@/components/common/form-dialog';
import { useBranches } from '@/components/common/filters';
import { EmptyState, Loading } from '@/components/common/loading';
import { PageHeader } from '@/components/common/page-header';
import { SectionCard } from '@/components/common/section-card';
import { useSnackbar } from '@/components/common/snackbar';
import { SoftChip } from '@/components/common/status-chip';
import { api } from '@/lib/http';
import { useSession } from '@/lib/session';

const PunchMap = dynamic(() => import('@/components/map/punch-map'), { ssr: false, loading: () => <Loading minHeight={320} label="Loading map" /> });

interface Site {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  radiusM: number;
  maxAccuracyM: number;
  active: boolean;
  branch: { id: string; name: string } | null;
  _count: { employees: number };
}

interface SiteForm {
  id?: string;
  name: string;
  address: string;
  branchId: string;
  lat: string;
  lng: string;
  radiusM: string;
  maxAccuracyM: string;
  active: boolean;
}

const empty: SiteForm = { name: '', address: '', branchId: '', lat: '', lng: '', radiusM: '100', maxAccuracyM: '100', active: true };

export default function SitesPage() {
  const { can } = useSession();
  const { notify, notifyError } = useSnackbar();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SiteForm | null>(null);
  const [locating, setLocating] = useState(false);
  const sites = useQuery({ queryKey: ['sites'], queryFn: () => api.get<Site[]>('/sites') });
  const branches = useBranches();
  const save = useMutation({
    mutationFn: (f: SiteForm) => {
      const body = { name: f.name, address: f.address || undefined, branchId: f.branchId || null, lat: Number(f.lat), lng: Number(f.lng), radiusM: Number(f.radiusM), maxAccuracyM: Number(f.maxAccuracyM), active: f.active };
      return f.id ? api.put(`/sites/${f.id}`, body) : api.post('/sites', body);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sites'] }); setForm(null); notify('Site saved'); },
    onError: notifyError,
  });
  const onMapClick = useCallback((lat: number, lng: number) => setForm((f) => (f ? { ...f, lat: lat.toFixed(6), lng: lng.toFixed(6) } : f)), []);
  const locateMe = () => {
    if (!navigator.geolocation) {
      notify('This browser cannot share its location.', 'warning');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setForm((f) => (f ? { ...f, lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) } : f)); setLocating(false); },
      () => { setLocating(false); notify('Could not get your location. Allow location access or click the map.', 'warning'); },
    );
  };
  const preview = form && form.lat && form.lng ? [{ id: 'new', name: form.name || 'New site', lat: Number(form.lat), lng: Number(form.lng), radiusM: Number(form.radiusM) || 100 }] : [];
  const list = sites.data ?? [];

  return (
    <>
      <PageHeader title="Sites & geofences" subtitle="Employees can punch only inside the circle of a site assigned to them." actions={can('SITES', 'create') && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setForm(empty)}>Add site</Button>} />
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <SectionCard title="Sites" icon={<PlaceOutlinedIcon />} flush>
            {sites.isLoading ? <Box sx={{ p: 2.5 }}><Loading minHeight={160} /></Box> : list.length === 0 ? (
              <EmptyState icon={<PlaceOutlinedIcon />} title="No sites yet" description="Add the first one — punching is blocked until employees have a site." action={can('SITES', 'create') ? <Button variant="contained" startIcon={<AddIcon />} onClick={() => setForm(empty)}>Add site</Button> : undefined} />
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead><TableRow><TableCell sx={{ pl: 2.5 }}>Site</TableCell><TableCell>Branch</TableCell><TableCell align="right">Radius</TableCell><TableCell align="right">Employees</TableCell><TableCell sx={{ pr: 2.5 }} /></TableRow></TableHead>
                  <TableBody>
                    {list.map((s) => (
                      <TableRow key={s.id} hover>
                        <TableCell sx={{ pl: 2.5 }}>
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{s.name}</Typography>
                            {!s.active && <SoftChip label="Inactive" />}
                          </Stack>
                          <Typography variant="caption" color="text.secondary">{s.address ?? `${s.lat.toFixed(5)}, ${s.lng.toFixed(5)}`}</Typography>
                        </TableCell>
                        <TableCell>{s.branch?.name ?? '—'}</TableCell>
                        <TableCell align="right">{s.radiusM} m</TableCell>
                        <TableCell align="right">{s._count.employees}</TableCell>
                        <TableCell align="right" sx={{ pr: 2.5 }}>{can('SITES', 'edit') && <Button size="small" onClick={() => setForm({ id: s.id, name: s.name, address: s.address ?? '', branchId: s.branch?.id ?? '', lat: String(s.lat), lng: String(s.lng), radiusM: String(s.radiusM), maxAccuracyM: String(s.maxAccuracyM), active: s.active })}>Edit</Button>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          {sites.isLoading ? <Loading minHeight={420} label="Loading map" /> : <Card sx={{ p: 1 }}><PunchMap sites={list.filter((s) => s.active)} height={420} /></Card>}
        </Grid>
      </Grid>

      <FormDialog open={!!form} title={form?.id ? 'Edit site' : 'Add site'} subtitle="Click the map to place the site, then set how big its circle is." busy={save.isPending} onClose={() => setForm(null)} onSubmit={() => form && save.mutate(form)} maxWidth="md">
        {form && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 5 }}>
              <Stack spacing={2}>
                <TextField label="Site name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
                <TextField label="Address (optional)" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                <TextField select label="Branch" value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}><MenuItem value="">None</MenuItem>{branches.data?.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}</TextField>
                <Stack direction="row" spacing={1}>
                  <TextField label="Latitude" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} />
                  <TextField label="Longitude" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} />
                </Stack>
                <Button size="small" variant="outlined" startIcon={<MyLocationOutlinedIcon />} loading={locating} loadingPosition="start" onClick={locateMe} sx={{ alignSelf: 'flex-start' }}>Use my current location</Button>
                <Stack direction="row" spacing={1}>
                  <TextField label="Radius (m)" value={form.radiusM} onChange={(e) => setForm({ ...form, radiusM: e.target.value })} helperText="20–2000. 100–150 suits an office" />
                  <TextField label="Max GPS error (m)" value={form.maxAccuracyM} onChange={(e) => setForm({ ...form, maxAccuracyM: e.target.value })} helperText="Less accurate punches are refused" />
                </Stack>
                <TextField select label="Status" value={form.active ? 'yes' : 'no'} onChange={(e) => setForm({ ...form, active: e.target.value === 'yes' })}><MenuItem value="yes">Active</MenuItem><MenuItem value="no">Inactive</MenuItem></TextField>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 7 }}>
              <PunchMap sites={preview.length ? preview : list.slice(0, 1)} height={400} onClick={onMapClick} />
            </Grid>
          </Grid>
        )}
      </FormDialog>
    </>
  );
}
