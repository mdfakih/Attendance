'use client';

import { useState } from 'react';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import { bestUnit, fromMinutes, toMinutes, UNIT_LABEL, UNIT_MINUTES, type DurationUnit } from '@/lib/duration';
import { formatMinutes } from '@/lib/format';

interface DurationFieldProps {
  readonly label: string;
  /** Always whole minutes, whatever unit is picked. */
  readonly value: number | null;
  readonly onChange: (minutes: number | null) => void;
  readonly units?: readonly DurationUnit[];
  readonly help?: string;
  readonly error?: string;
  readonly autoFocus?: boolean;
}

/** Number field with a unit picker (min / hrs / days); the parent only ever sees minutes. */
export function DurationField({ label, value, onChange, units = ['min', 'h'], help, error, autoFocus }: DurationFieldProps) {
  const [unit, setUnit] = useState<DurationUnit>(() => bestUnit(value, units));
  const [text, setText] = useState(() => fromMinutes(value, bestUnit(value, units)));
  const [seen, setSeen] = useState(value);
  // The parent may replace the value (e.g. clearing falls back to 0); show it unless it is what was typed.
  if (value !== seen) {
    setSeen(value);
    if (value !== toMinutes(text, unit)) setText(fromMinutes(value, unit));
  }

  const minutes = toMinutes(text, unit);
  const exact = unit !== 'min' && minutes !== null && minutes > 0 && minutes % UNIT_MINUTES[unit] !== 0 ? `= ${formatMinutes(minutes)}` : '';
  const helperText = error || [exact, help].filter(Boolean).join(' · ') || undefined;

  const type = (next: string) => {
    setText(next);
    onChange(toMinutes(next, unit));
  };
  const changeUnit = (next: DurationUnit) => {
    setUnit(next);
    setText(fromMinutes(value, next));
  };

  return (
    <TextField
      type="number"
      label={label}
      value={text}
      onChange={(e) => type(e.target.value)}
      error={!!error}
      helperText={helperText}
      autoFocus={autoFocus}
      slotProps={{
        htmlInput: { min: 0, step: unit === 'min' ? 1 : 'any' },
        input: {
          endAdornment: units.length > 1 ? (
            <InputAdornment position="end">
              <Select variant="standard" disableUnderline value={unit} onChange={(e) => changeUnit(e.target.value)} inputProps={{ 'aria-label': `${label} unit` }} sx={{ fontSize: 'inherit' }}>
                {units.map((u) => <MenuItem key={u} value={u}>{UNIT_LABEL[u]}</MenuItem>)}
              </Select>
            </InputAdornment>
          ) : (
            <InputAdornment position="end">{UNIT_LABEL[units[0]]}</InputAdornment>
          ),
        },
      }}
    />
  );
}
