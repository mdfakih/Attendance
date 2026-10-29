'use client';

import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/http';

interface Named {
  id: string;
  name: string;
}

export function useBranches() {
  return useQuery({ queryKey: ['branches'], queryFn: () => api.get<Named[]>('/branches'), staleTime: 300_000 });
}
export function useDepartments() {
  return useQuery({ queryKey: ['departments'], queryFn: () => api.get<Named[]>('/departments'), staleTime: 300_000 });
}
export function useSites() {
  return useQuery({ queryKey: ['sites'], queryFn: () => api.get<Array<Named & { lat: number; lng: number; radiusM: number; active: boolean }>>('/sites'), staleTime: 300_000 });
}
export function useShifts() {
  return useQuery({ queryKey: ['shifts'], queryFn: () => api.get<Array<Named & { startTime: string; endTime: string; dutyMinutes: number }>>('/shifts'), staleTime: 300_000 });
}

interface SelectProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly options: readonly Named[] | undefined;
  readonly allLabel?: string;
  readonly required?: boolean;
  readonly error?: string;
  readonly sx?: object;
}

export function NamedSelect({ label, value, onChange, options, allLabel = 'All', required, error, sx }: SelectProps) {
  return (
    <TextField select label={label} value={value} onChange={(e) => onChange(e.target.value)} sx={{ minWidth: 0, ...sx }} required={required} error={!!error} helperText={error}>
      {!required && <MenuItem value="">{allLabel}</MenuItem>}
      {(options ?? []).map((o) => (
        <MenuItem key={o.id} value={o.id}>
          {o.name}
        </MenuItem>
      ))}
    </TextField>
  );
}
