'use client';

import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import AddIcon from '@mui/icons-material/Add';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormDialog } from '@/components/common/form-dialog';
import { useBranches } from '@/components/common/filters';
import { Loading } from '@/components/common/loading';
import { PageHeader } from '@/components/common/page-header';
import { useSnackbar } from '@/components/common/snackbar';
import { api } from '@/lib/http';
import { useSession } from '@/lib/session';

const PunchMap = dynamic(() => import('@/components/map/punch-map'), { ssr: false, loading: () => <Loading minHeight={320} /> });

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
  const useMyLocation = () => navigator.geolocation?.getCurrentPosition((p) => setForm((f) => (f ? { ...f, lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) } : f)));
  const preview = form && form.lat && form.lng ? [{ id: 'new', name: form.name || 'New site', lat: Number(form.lat), lng: Number(form.lng), radiusM: Number(form.radiusM) || 100 }] : [];

  return (
    <>
      <PageHeader title="Sites & geofences" subtitle="Employees can punch only inside the radius of a site assigned to them." actions={can('SITES', 'create') && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setForm(empty)}>Add site</Button>} />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card><CardContent>
            {sites.isLoading ? <Loading /> : (sites.data?.length ?? 0) === 0 ? <Typography color="text.secondary">No sites yet. Add the first one — punching is blocked until employees have a site.</Typography> : (
              <Table size="small">
                <TableHead><TableRow><TableCell>Site</TableCell><TableCell>Branch</TableCell><TableCell align="right">Radius</TableCell><TableCell align="right">Employees</TableCell><TableCell /></TableRow></TableHead>
                <TableBody>
                  {sites.data?.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.name}{!s.active && ' (inactive)'}<Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{s.address ?? `${s.lat.toFixed(5)}, ${s.lng.toFixed(5)}`}</Typography></TableCell>
                      <TableCell>{s.branch?.name ?? '—'}</TableCell>
                      <TableCell align="right">{s.radiusM} m</TableCell>
                      <TableCell align="right">{s._count.employees}</TableCell>
                      <TableCell align="right">{can('SITES', 'edit') && <Button size="small" onClick={() => setForm({ id: s.id, name: s.name, address: s.address ?? '', branchId: s.branch?.id ?? '', lat: String(s.lat), lng: String(s.lng), radiusM: String(s.radiusM), maxAccuracyM: String(s.maxAccuracyM), active: s.active })}>Edit</Button>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          {sites.data && <PunchMap sites={sites.data.filter((s) => s.active)} height={420} />}
        </Grid>
      </Grid>

      <FormDialog open={!!form} title={form?.id ? 'Edit site' : 'Add site'} busy={save.isPending} onClose={() => setForm(null)} onSubmit={() => form && save.mutate(form)} maxWidth="md">
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
                <Button size="small" onClick={useMyLocation}>Use my current location</Button>
                <Stack direction="row" spacing={1}>
                  <TextField label="Radius (m)" value={form.radiusM} onChange={(e) => setForm({ ...form, radiusM: e.target.value })} helperText="20–2000. 100–150 suits an office; larger for factories" />
                  <TextField label="Max GPS error (m)" value={form.maxAccuracyM} onChange={(e) => setForm({ ...form, maxAccuracyM: e.target.value })} helperText="Punches with worse accuracy are refused" />
                </Stack>
                <TextField select label="Status" value={form.active ? 'yes' : 'no'} onChange={(e) => setForm({ ...form, active: e.target.value === 'yes' })}><MenuItem value="yes">Active</MenuItem><MenuItem value="no">Inactive</MenuItem></TextField>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 7 }}>
              <Typography variant="caption" color="text.secondary">Click the map to place the site.</Typography>
              <PunchMap sites={preview.length ? preview : (sites.data ?? []).slice(0, 1)} height={380} onClick={onMapClick} />
            </Grid>
          </Grid>
        )}
      </FormDialog>
    </>
  );
}
