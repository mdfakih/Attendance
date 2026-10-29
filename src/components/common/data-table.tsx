'use client';

import { DataGrid, type DataGridProps, type GridColDef, type GridValidRowModel } from '@mui/x-data-grid';
import Paper from '@mui/material/Paper';
import { EmptyState } from './loading';

interface DataTableProps<R extends GridValidRowModel> extends Omit<DataGridProps<R>, 'rows' | 'columns'> {
  readonly rows: readonly R[];
  readonly columns: GridColDef<R>[];
  readonly total?: number;
  readonly page?: number;
  readonly pageSize?: number;
  readonly onPageChange?: (page: number, pageSize: number) => void;
  readonly height?: number | string;
  /** Shown when there are no rows. */
  readonly emptyText?: string;
}

function NoRows({ text }: { text: string }) {
  return <EmptyState compact title={text} />;
}

/** Server-paginated DataGrid with sane defaults. `page` is 1-based (matches the API). */
export function DataTable<R extends GridValidRowModel>({ rows, columns, total, page = 1, pageSize = 25, onPageChange, height = 560, loading, emptyText = 'Nothing to show yet.', sx, slots, slotProps, ...rest }: DataTableProps<R>) {
  const serverPaged = total !== undefined && onPageChange !== undefined;
  return (
    <Paper variant="outlined" sx={{ height, width: '100%', borderRadius: 3.5, overflow: 'hidden' }}>
      <DataGrid<R>
        rows={rows as R[]}
        columns={columns}
        loading={loading}
        disableRowSelectionOnClick
        rowHeight={48}
        columnHeaderHeight={44}
        pageSizeOptions={[25, 50, 100]}
        paginationMode={serverPaged ? 'server' : 'client'}
        rowCount={serverPaged ? total : undefined}
        paginationModel={serverPaged ? { page: page - 1, pageSize } : undefined}
        onPaginationModelChange={serverPaged ? (m) => onPageChange(m.page + 1, m.pageSize) : undefined}
        slots={{ noRowsOverlay: NoRows as never, ...slots }}
        slotProps={{ loadingOverlay: { variant: 'skeleton', noRowsVariant: 'skeleton' }, noRowsOverlay: { text: emptyText } as never, ...slotProps }}
        sx={[
          (t) => ({
            border: 0,
            '--DataGrid-containerBackground': t.vars?.palette.background.default,
            '--DataGrid-rowBorderColor': t.vars?.palette.divider,
            '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: t.vars?.palette.text.secondary },
            '& .MuiDataGrid-cell': { display: 'flex', alignItems: 'center' },
            '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within, & .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within': { outline: 'none' },
            '& .MuiDataGrid-row:hover': { bgcolor: `rgba(${t.vars?.palette.primary.mainChannel} / 0.04)` },
            '& .MuiDataGrid-footerContainer': { borderColor: t.vars?.palette.divider },
            '& a': { color: t.vars?.palette.primary.main, fontWeight: 600 },
            '& a:hover': { textDecoration: 'underline' },
          }),
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
        {...rest}
      />
    </Paper>
  );
}
