'use client';

import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { FeatureCategory, FeatureKey } from '@attendance/contracts';

export interface FeatureRow {
  key: FeatureKey;
  label: string;
  description: string;
  category?: FeatureCategory;
  enabled: boolean;
  locked?: boolean;
  requires?: readonly FeatureKey[];
}

interface FeatureListProps {
  readonly features: readonly FeatureRow[];
  /** Every feature, for naming requirements that live in the other list. */
  readonly all: readonly FeatureRow[];
  readonly editable: boolean;
  readonly pendingKey: FeatureKey | null;
  readonly onToggle: (key: FeatureKey, enabled: boolean) => void;
}

/** Switch rows for company modules or options; locked rows are read-only. */
export function FeatureList({ features, all, editable, pendingKey, onToggle }: FeatureListProps) {
  const byKey = new Map(all.map((f) => [f.key, f]));
  return (
    <Box>
      {features.map((f, i) => {
        const missing = (f.requires ?? []).map((k) => byKey.get(k)).filter((r): r is FeatureRow => !!r && !r.enabled);
        const blocked = !f.enabled && missing.length > 0;
        const disabled = !editable || !!f.locked || blocked || pendingKey !== null;
        return (
          <Stack key={f.key} direction="row" spacing={2} sx={{ alignItems: 'center', py: 1.5, borderTop: i === 0 ? 0 : 1, borderColor: 'divider' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                <Typography sx={{ fontWeight: 600 }}>{f.label}</Typography>
                {f.locked && (
                  <Tooltip title="Managed by your service provider">
                    <LockOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary' }} aria-label="Locked" />
                  </Tooltip>
                )}
              </Stack>
              <Typography variant="body2" color="text.secondary">{f.description}</Typography>
              {f.locked && <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Managed by your service provider</Typography>}
              {!f.locked && missing.length > 0 && (
                <Typography variant="caption" color="warning.main" sx={{ fontWeight: 600 }}>
                  Needs {missing.map((m) => m.label).join(' and ')}{blocked ? ' — turn it on first' : ''}
                </Typography>
              )}
            </Box>
            <Box sx={{ width: 58, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
              {pendingKey === f.key ? (
                <CircularProgress size={22} />
              ) : (
                <Switch
                  checked={f.enabled}
                  disabled={disabled}
                  onChange={(e) => onToggle(f.key, e.target.checked)}
                  slotProps={{ input: { 'aria-label': f.label } }}
                />
              )}
            </Box>
          </Stack>
        );
      })}
    </Box>
  );
}
