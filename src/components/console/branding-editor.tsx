'use client';

import { useState } from 'react';
import { BRAND_PRESETS, type Branding } from '@attendance/contracts';
import CheckIcon from '@mui/icons-material/Check';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { TenantAvatar } from '@/components/brand/tenant-avatar';
import { contrastText } from '@/lib/theme';

const HEX = /^#[0-9A-Fa-f]{6}$/;

export type BrandingErrors = Partial<Record<keyof Branding, string>>;

interface ColorFieldProps {
  readonly label: string;
  readonly helper: string;
  readonly value: string;
  readonly error?: string;
  readonly disabled?: boolean;
  readonly onChange: (hex: string) => void;
}

/** Native colour picker plus a hex box that only commits complete colours. */
function ColorField({ label, helper, value, error, disabled, onChange }: ColorFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? value;
  return (
    <TextField
      label={label}
      value={text}
      disabled={disabled}
      error={!!error || (draft !== null && !HEX.test(draft))}
      helperText={error ?? (draft !== null && !HEX.test(draft) ? 'Use 6 hex digits, e.g. #4F46E5' : helper)}
      onChange={(e) => {
        const next = e.target.value.trim();
        const withHash = next.startsWith('#') ? next : `#${next}`;
        if (HEX.test(withHash)) {
          onChange(withHash.toUpperCase());
          setDraft(null);
        } else {
          setDraft(next);
        }
      }}
      onBlur={() => setDraft(null)}
      slotProps={{
        htmlInput: { maxLength: 7, spellCheck: false, style: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', textTransform: 'uppercase' } },
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <Box
                component="label"
                sx={{ position: 'relative', width: 26, height: 26, borderRadius: 1.5, bgcolor: value, border: 1, borderColor: 'divider', cursor: disabled ? 'default' : 'pointer', overflow: 'hidden' }}
                title={`Pick ${label.toLowerCase()}`}
              >
                <Box
                  component="input"
                  type="color"
                  value={value.toLowerCase()}
                  disabled={disabled}
                  onChange={(e) => onChange(e.target.value.toUpperCase())}
                  aria-label={`Pick ${label.toLowerCase()}`}
                  sx={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'inherit', width: '100%', height: '100%', border: 0, p: 0 }}
                />
              </Box>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}

interface BrandingEditorProps {
  readonly value: Branding;
  readonly onChange: (next: Branding) => void;
  readonly companyName: string;
  readonly errors?: BrandingErrors;
  readonly disabled?: boolean;
}

export function BrandingEditor({ value, onChange, companyName, errors, disabled }: BrandingEditorProps) {
  const lightPrimary = contrastText(value.primaryColor) !== '#FFFFFF';
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 0.25 }}>Colour theme</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Pick a ready-made theme, or fine-tune the colours below.</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 1 }}>
          {BRAND_PRESETS.map((preset) => {
            const selected = preset.primaryColor === value.primaryColor && preset.accentColor === value.accentColor;
            return (
              <ButtonBase
                key={preset.key}
                disabled={disabled}
                onClick={() => onChange({ ...value, primaryColor: preset.primaryColor, accentColor: preset.accentColor })}
                aria-pressed={selected}
                sx={{
                  justifyContent: 'flex-start',
                  gap: 1,
                  p: 1,
                  borderRadius: 2.5,
                  border: 2,
                  borderColor: selected ? 'primary.main' : 'divider',
                  bgcolor: 'background.paper',
                  transition: 'border-color .15s',
                  '&:hover': { borderColor: selected ? 'primary.main' : 'text.disabled' },
                }}
              >
                <Box sx={{ position: 'relative', width: 30, height: 30, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: `linear-gradient(135deg, ${preset.primaryColor} 50%, ${preset.accentColor} 50%)` }}>
                  {selected && <CheckIcon sx={{ position: 'absolute', inset: 0, m: 'auto', fontSize: 16, color: '#fff' }} />}
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{preset.label}</Typography>
              </ButtonBase>
            );
          })}
        </Box>
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <ColorField label="Main colour" helper="Buttons, links and the active menu" value={value.primaryColor} error={errors?.primaryColor} disabled={disabled} onChange={(primaryColor) => onChange({ ...value, primaryColor })} />
        <ColorField label="Accent colour" helper="Highlights and status badges" value={value.accentColor} error={errors?.accentColor} disabled={disabled} onChange={(accentColor) => onChange({ ...value, accentColor })} />
      </Stack>
      {lightPrimary && (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: 'warning.main' }}>
          <InfoOutlinedIcon fontSize="small" />
          <Typography variant="body2">This main colour is light, so buttons will use dark text. A deeper shade usually looks better.</Typography>
        </Stack>
      )}

      <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
        <TenantAvatar name={companyName || 'Company'} logoUrl={value.logoUrl} color={value.primaryColor} size={56} />
        <TextField
          label="Logo link (optional)"
          placeholder="https://example.com/logo.png"
          value={value.logoUrl ?? ''}
          disabled={disabled}
          error={!!errors?.logoUrl}
          helperText={errors?.logoUrl ?? 'A square PNG, SVG or JPG on an https:// link. Leave empty to show the company initials.'}
          onChange={(e) => onChange({ ...value, logoUrl: e.target.value.trim() ? e.target.value.trim() : null })}
        />
      </Stack>
    </Stack>
  );
}
