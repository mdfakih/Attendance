'use client';

import { DataGrid, type DataGridProps, type GridColDef, type GridValidRowModel } from '@mui/x-data-grid';
import Paper from '@mui/material/Paper';

interface DataTableProps<R extends GridValidRowModel> extends Omit<DataGridProps<R>, 'rows' | 'columns'> {
  readonly rows: readonly R[];
  readonly columns: GridColDef<R>[];
  readonly total?: number;
  readonly page?: number;
  readonly pageSize?: number;
  readonly onPageChange?: (page: number, pageSize: number) => void;
  readonly height?: number | string;
}

/** Server-paginated DataGrid with sane defaults. `page` is 1-based (matches the API). */
export function DataTable<R extends GridValidRowModel>({ rows, columns, total, page = 1, pageSize = 25, onPageChange, height = 560, loading, ...rest }: DataTableProps<R>) {
  const serverPaged = total !== undefined && onPageChange !== undefined;
  return (
    <Paper variant="outlined" sx={{ height, width: '100%' }}>
      <DataGrid<R>
        rows={rows as R[]}
        columns={columns}
        loading={loading}
        disableRowSelectionOnClick
        density="compact"
        pageSizeOptions={[25, 50, 100]}
        paginationMode={serverPaged ? 'server' : 'client'}
        rowCount={serverPaged ? total : undefined}
        paginationModel={serverPaged ? { page: page - 1, pageSize } : undefined}
        onPaginationModelChange={serverPaged ? (m) => onPageChange(m.page + 1, m.pageSize) : undefined}
        sx={{ border: 0, '& .MuiDataGrid-cell:focus': { outline: 'none' } }}
        {...rest}
      />
    </Paper>
  );
}
