'use client';

import { useState } from 'react';
import DownloadIcon from '@mui/icons-material/Download';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { GridColDef } from '@mui/x-data-grid';
import { useMutation } from '@tanstack/react-query';
import { DataTable } from '@/components/common/data-table';
import { PageHeader } from '@/components/common/page-header';
import { useSnackbar } from '@/components/common/snackbar';
import { api } from '@/lib/http';

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

export default function ImportPage() {
  const { notify, notifyError } = useSnackbar();
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const upload = useMutation({ mutationFn: (file: File) => api.upload<ImportPreview>('/employee-imports', file), onSuccess: setPreview, onError: notifyError });
  const commit = useMutation({
    mutationFn: (id: string) => api.post<ImportPreview>(`/employee-imports/${id}/commit`),
    onSuccess: (p) => { setPreview(p); notify(`${p.committedRows} employees created`); },
    onError: notifyError,
  });

  const columns: GridColDef<ImportRow>[] = [
    { field: 'rowNo', headerName: 'Row', width: 70 },
    { field: 'status', headerName: 'Status', width: 120, renderCell: (p) => <Chip size="small" label={p.value} color={p.value === 'ERROR' ? 'error' : p.value === 'COMMITTED' ? 'success' : 'default'} /> },
    { field: 'fullName', headerName: 'Name', width: 180, valueGetter: (_, r) => r.raw['fullName'] },
    { field: 'phone', headerName: 'Mobile', width: 130, valueGetter: (_, r) => r.raw['phone'] },
    { field: 'branch', headerName: 'Branch', width: 140, valueGetter: (_, r) => r.raw['branch'] },
    { field: 'errors', headerName: 'Problems', flex: 1, minWidth: 300, valueGetter: (_, r) => r.errors.join('; ') },
  ];

  return (
    <>
      <PageHeader title="Bulk upload employees" subtitle="Download the template, fill one row per employee, upload, review, then confirm." />
      <Stack spacing={2}>
        <Card>
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => api.download('/employee-imports/template', 'employee-upload-template.xlsx').catch(notifyError)}>
                1. Download template
              </Button>
              <Button variant="contained" component="label" disabled={upload.isPending}>
                2. Upload filled template
                <input hidden type="file" accept=".xlsx" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ''; }} />
              </Button>
              <Typography variant="body2" color="text.secondary">
                Branch, department, site and shift names must match what you have set up. Mobile numbers must be unique.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
        {preview && (
          <>
            <Alert severity={preview.errorRows > 0 ? 'warning' : 'success'} action={
              preview.status === 'VALIDATED' ? (
                <Button color="inherit" size="small" variant="outlined" disabled={preview.validRows === 0 || commit.isPending} onClick={() => commit.mutate(preview.id)}>
                  3. Create {preview.validRows} employees
                </Button>
              ) : preview.status === 'COMMITTED' ? (
                <Button color="inherit" size="small" variant="outlined" onClick={() => api.download(`/employee-imports/${preview.id}/codes`, 'activation-codes.xlsx').catch(notifyError)}>
                  Download activation codes
                </Button>
              ) : undefined
            }>
              {preview.fileName}: {preview.totalRows} rows · {preview.validRows} valid · {preview.errorRows} with problems
              {preview.status === 'COMMITTED' && ` · ${preview.committedRows} created`}
            </Alert>
            <DataTable rows={preview.rows} columns={columns} getRowId={(r) => r.rowNo} height={520} />
          </>
        )}
      </Stack>
    </>
  );
}
