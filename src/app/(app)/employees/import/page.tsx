'use client';

import { useState, type ReactNode } from 'react';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import GroupAddOutlinedIcon from '@mui/icons-material/GroupAddOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { GridColDef } from '@mui/x-data-grid';
import { useMutation } from '@tanstack/react-query';
import { DataTable } from '@/components/common/data-table';
import { FeatureGate } from '@/components/common/feature-gate';
import { PageHeader } from '@/components/common/page-header';
import { useSnackbar } from '@/components/common/snackbar';
import { SoftChip } from '@/components/common/status-chip';
import { api } from '@/lib/http';
import { tint } from '@/lib/tone';

interface ImportRow {
  rowNo: number;
  status: string;
  raw: Record<string, string>;
  errors: string[];
}

interface ImportPreview {
  id: string;
  fileName: string;
  status: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  committedRows: number;
  rows: ImportRow[];
}

function Step({ n, title, text, done, children }: { n: number; title: string; text: string; done?: boolean; children: ReactNode }) {
  return (
    <Card sx={{ height: '100%', p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Box sx={(t) => ({ width: 30, height: 30, borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 14, color: done ? 'success.main' : 'primary.main', bgcolor: tint(t, done ? 'success' : 'primary', 0.12) })}>{n}</Box>
        <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>{text}</Typography>
      <Box>{children}</Box>
    </Card>
  );
}

const ROW_STATUS: Record<string, { label: string; tone: 'error' | 'success' | 'info' | 'default' }> = {
  ERROR: { label: 'Has problems', tone: 'error' },
  VALID: { label: 'Ready', tone: 'info' },
  COMMITTED: { label: 'Created', tone: 'success' },
};

function ImportEmployees() {
  const { notify, notifyError } = useSnackbar();
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [downloading, setDownloading] = useState<'template' | 'codes' | null>(null);
  const upload = useMutation({ mutationFn: (file: File) => api.upload<ImportPreview>('/employee-imports', file), onSuccess: setPreview, onError: notifyError });
  const commit = useMutation({
    mutationFn: (id: string) => api.post<ImportPreview>(`/employee-imports/${id}/commit`),
    onSuccess: (p) => { setPreview(p); notify(`${p.committedRows} employees created`); },
    onError: notifyError,
  });
  const download = async (kind: 'template' | 'codes') => {
    setDownloading(kind);
    try {
      if (kind === 'template') await api.download('/employee-imports/template', 'employee-upload-template.xlsx');
      else if (preview) await api.download(`/employee-imports/${preview.id}/codes`, 'activation-codes.xlsx');
    } catch (e) {
      notifyError(e);
    } finally {
      setDownloading(null);
    }
  };

  const columns: GridColDef<ImportRow>[] = [
    { field: 'rowNo', headerName: 'Row', width: 70 },
    { field: 'status', headerName: 'Status', width: 140, renderCell: (p) => { const s = ROW_STATUS[p.row.status] ?? { label: p.row.status, tone: 'default' as const }; return <SoftChip label={s.label} tone={s.tone} dot />; } },
    { field: 'fullName', headerName: 'Name', width: 180, valueGetter: (_, r) => r.raw['fullName'] },
    { field: 'phone', headerName: 'Mobile', width: 140, valueGetter: (_, r) => r.raw['phone'] },
    { field: 'branch', headerName: 'Branch', width: 140, valueGetter: (_, r) => r.raw['branch'] },
    { field: 'errors', headerName: 'Problems', flex: 1, minWidth: 300, renderCell: (p) => (p.row.errors.length ? <Typography variant="body2" color="error.main">{p.row.errors.join('; ')}</Typography> : null) },
  ];
  const committed = preview?.status === 'COMMITTED';

  return (
    <>
      <PageHeader title="Bulk upload employees" subtitle="Add many employees at once from an Excel sheet — check everything before anything is created." breadcrumbs={[{ label: 'Employees', href: '/employees' }, { label: 'Bulk upload' }]} />
      <Stack spacing={2.5}>
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Step n={1} title="Download the template" text="One row per employee. Branch, department, site and shift names must match what you have set up.">
              <Button variant="outlined" startIcon={<FileDownloadOutlinedIcon />} loading={downloading === 'template'} loadingPosition="start" onClick={() => download('template')}>Download template</Button>
            </Step>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Step n={2} title="Upload the filled sheet" text="We check every row and show any problems. Nothing is created yet." done={!!preview}>
              <Button variant="contained" component="label" startIcon={<CloudUploadOutlinedIcon />} loading={upload.isPending} loadingPosition="start">
                {preview ? 'Upload another file' : 'Upload .xlsx file'}
                <input hidden type="file" accept=".xlsx" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ''; }} />
              </Button>
            </Step>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Step n={3} title={committed ? 'Share activation codes' : 'Create the employees'} text={committed ? 'Download everyone’s one-time code to share with them.' : 'Only rows without problems are created. Fix the rest and upload again.'} done={committed}>
              {committed ? (
                <Button variant="contained" color="success" startIcon={<FileDownloadOutlinedIcon />} loading={downloading === 'codes'} loadingPosition="start" onClick={() => download('codes')}>Download activation codes</Button>
              ) : (
                <Button variant="contained" startIcon={<GroupAddOutlinedIcon />} disabled={!preview || preview.status !== 'VALIDATED' || preview.validRows === 0} loading={commit.isPending} loadingPosition="start" onClick={() => preview && commit.mutate(preview.id)}>
                  {preview && preview.status === 'VALIDATED' ? `Create ${preview.validRows} employees` : 'Create employees'}
                </Button>
              )}
            </Step>
          </Grid>
        </Grid>
        {preview && (
          <>
            <Alert severity={preview.errorRows > 0 ? 'warning' : 'success'}>
              <strong>{preview.fileName}</strong>: {preview.totalRows} rows · {preview.validRows} ready · {preview.errorRows} with problems
              {committed && ` · ${preview.committedRows} created`}
            </Alert>
            <DataTable rows={preview.rows} columns={columns} getRowId={(r) => r.rowNo} height={520} emptyText="The file has no rows." />
          </>
        )}
      </Stack>
    </>
  );
}

export default function ImportPage() {
  return (
    <FeatureGate feature="BULK_IMPORT">
      <ImportEmployees />
    </FeatureGate>
  );
}
