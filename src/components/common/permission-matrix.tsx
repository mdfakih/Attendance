'use client';

import {
  FEATURE_REGISTRY,
  MODULE_LABELS,
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  type FeatureKey,
  type PermissionAction,
  type PermissionModule,
} from '@attendance/contracts';
import CheckIcon from '@mui/icons-material/Check';
import Checkbox from '@mui/material/Checkbox';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { toggleCell, toggleRow, type PermissionMatrixValue } from '@/lib/permission-matrix';
import { SoftChip } from './status-chip';

export type { PermissionMatrixValue };

/** Permission modules that only matter while a company module is switched on. */
const MODULE_FEATURE: Partial<Record<PermissionModule, FeatureKey>> = {
  LEAVE: 'LEAVE',
  LEAVE_SETUP: 'LEAVE',
  PAY: 'PAY_MONITORING',
  REPORTS: 'EXPORTS',
};

const ACTION_LABELS: Readonly<Record<PermissionAction, string>> = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
  export: 'Export',
};

interface PermissionMatrixProps {
  readonly value: PermissionMatrixValue;
  /** Leave out for a read-only matrix. */
  readonly onChange?: (next: PermissionMatrixValue) => void;
  /** The company's module switches, to flag rows that have no effect while a module is off. */
  readonly features?: Readonly<Partial<Record<FeatureKey, boolean>>>;
  readonly disabled?: boolean;
}

/** Module × action grid of what a Manager role may do. */
export function PermissionMatrix({ value, onChange, features, disabled }: PermissionMatrixProps) {
  const editable = !!onChange && !disabled;
  return (
    <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 3 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Module</TableCell>
            {onChange && <TableCell align="center">All</TableCell>}
            {PERMISSION_ACTIONS.map((a) => <TableCell key={a} align="center">{ACTION_LABELS[a]}</TableCell>)}
          </TableRow>
        </TableHead>
        <TableBody>
          {PERMISSION_MODULES.map((m) => {
            const actions = value[m] ?? [];
            const feature = MODULE_FEATURE[m];
            const off = !!feature && features?.[feature] === false;
            return (
              <TableRow key={m} hover>
                <TableCell>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: off ? 'text.secondary' : 'text.primary' }}>{MODULE_LABELS[m]}</Typography>
                    {off && feature && (
                      <Tooltip title={`${FEATURE_REGISTRY[feature].label} is switched off for this company, so these permissions have no effect until it is on.`}>
                        <span><SoftChip label="Module off" tone="warning" /></span>
                      </Tooltip>
                    )}
                  </Stack>
                </TableCell>
                {onChange && (
                  <TableCell align="center" padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={actions.length === PERMISSION_ACTIONS.length}
                      indeterminate={actions.length > 0 && actions.length < PERMISSION_ACTIONS.length}
                      disabled={!editable}
                      onChange={(e) => onChange(toggleRow(value, m, e.target.checked))}
                      slotProps={{ input: { 'aria-label': `${MODULE_LABELS[m]}: all actions` } }}
                    />
                  </TableCell>
                )}
                {PERMISSION_ACTIONS.map((a) => (
                  <TableCell key={a} align="center" padding="checkbox">
                    {onChange ? (
                      <Checkbox
                        size="small"
                        checked={actions.includes(a)}
                        disabled={!editable}
                        onChange={() => onChange(toggleCell(value, m, a))}
                        slotProps={{ input: { 'aria-label': `${MODULE_LABELS[m]}: ${ACTION_LABELS[a]}` } }}
                      />
                    ) : actions.includes(a) ? (
                      <CheckIcon fontSize="small" color="primary" aria-label={`${MODULE_LABELS[m]}: ${ACTION_LABELS[a]} allowed`} />
                    ) : (
                      <Typography variant="body2" color="text.disabled" aria-hidden>–</Typography>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
