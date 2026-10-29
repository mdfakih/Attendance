'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from '@/components/common/snackbar';
import { consoleApi } from '@/lib/http';
import { EMPTY_ONBOARD, firstStepWithError, STEPS, validateOnboard, type OnboardErrors, type OnboardField, type OnboardForm } from './onboard-form';
import { AdminStep, BrandingStep, CompanyStep, CreatedStep, PlanStep, ReviewStep } from './onboard-steps';
import type { Plan } from './types';

const STEP_HINT = [
  'Who is the client? These details appear on their dashboard and invoices.',
  'Choose what they pay and how long they can try it for free.',
  'The first person who will manage this client’s account.',
  'Make the dashboard and employee app feel like theirs. You can change this later.',
  'Check everything, then create the client and send the invitation.',
];

interface OnboardClientDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

export function OnboardClientDialog({ open, onClose }: OnboardClientDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { notify } = useSnackbar();
  const fullScreen = useMediaQuery(useTheme().breakpoints.down('sm'));
  const [form, setForm] = useState<OnboardForm>(EMPTY_ONBOARD);
  const [errors, setErrors] = useState<OnboardErrors>({});
  const [step, setStep] = useState(0);
  const [created, setCreated] = useState<{ tenantId: string; inviteLink: string } | null>(null);
  const plans = useQuery({ queryKey: ['console-plans'], queryFn: () => consoleApi.get<Plan[]>('/plans'), enabled: open });
  const create = useMutation({
    mutationFn: (body: unknown) => consoleApi.post<{ tenantId: string; inviteLink: string }>('/tenants', body),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['console-tenants'] });
      void queryClient.invalidateQueries({ queryKey: ['console-overview'] });
      setCreated(data);
      notify(`${form.displayName} onboarded`);
    },
  });

  const reset = () => {
    setForm({ ...EMPTY_ONBOARD, planId: plans.data?.find((p) => p.active)?.id ?? '' });
    setErrors({});
    setStep(0);
    setCreated(null);
    create.reset();
  };
  const set = (patch: Partial<OnboardForm>) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      for (const key of Object.keys(patch) as OnboardField[]) delete next[key];
      if (patch.branding) for (const key of ['primaryColor', 'accentColor', 'logoUrl'] as const) delete next[key];
      return next;
    });
  };
  const close = () => {
    if (create.isPending) return;
    onClose();
  };

  const next = () => {
    const result = validateOnboard(form);
    const stepFields = STEPS[step].fields as readonly OnboardField[];
    const stepErrors = result.ok ? {} : Object.fromEntries(Object.entries(result.errors).filter(([k]) => stepFields.includes(k as OnboardField)));
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    setStep((s) => s + 1);
  };
  const submit = () => {
    const result = validateOnboard(form);
    if (!result.ok) {
      setErrors(result.errors);
      setStep(firstStepWithError(result.errors));
      return;
    }
    create.mutate(result.data);
  };
  const last = step === STEPS.length - 1;

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="md" fullScreen={fullScreen} slotProps={{ transition: { onEnter: reset } }}>
      <DialogTitle component="div" sx={{ pr: 7 }}>
        <Typography variant="h6" component="h2">{created ? 'Client created' : 'Onboard a new client'}</Typography>
        {!created && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{STEP_HINT[step]}</Typography>}
        <IconButton aria-label="Close" onClick={close} disabled={create.isPending} sx={{ position: 'absolute', right: 12, top: 14 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {created ? (
          <Box>
            <CreatedStep name={form.displayName} email={form.adminEmail} />
            <TextField
              label="Backup invitation link"
              value={created.inviteLink}
              helperText="Share this only with the admin if the email doesn’t arrive."
              slotProps={{
                input: {
                  readOnly: true,
                  endAdornment: (
                    <IconButton aria-label="Copy link" onClick={() => void navigator.clipboard.writeText(created.inviteLink).then(() => notify('Link copied'))}>
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  ),
                },
              }}
            />
          </Box>
        ) : (
          <>
            <Stepper activeStep={step} alternativeLabel sx={{ mb: 3, mt: 1, display: { xs: 'none', sm: 'flex' } }}>
              {STEPS.map((s) => (
                <Step key={s.label}>
                  <StepLabel>{s.label}</StepLabel>
                </Step>
              ))}
            </Stepper>
            <Typography variant="overline" color="primary" sx={{ display: { sm: 'none' } }}>
              Step {step + 1} of {STEPS.length} · {STEPS[step].label}
            </Typography>
            {create.error && <Alert severity="error" sx={{ mb: 2 }}>{create.error.message}</Alert>}
            {step === 0 && <CompanyStep form={form} errors={errors} set={set} />}
            {step === 1 && <PlanStep form={form} errors={errors} set={set} plans={plans.data} />}
            {step === 2 && <AdminStep form={form} errors={errors} set={set} />}
            {step === 3 && <BrandingStep form={form} errors={errors} set={set} />}
            {step === 4 && <ReviewStep form={form} plans={plans.data} />}
          </>
        )}
      </DialogContent>
      <DialogActions>
        {created ? (
          <>
            <Button color="inherit" onClick={reset}>Onboard another</Button>
            <Button variant="contained" onClick={() => { onClose(); router.push(`/console/tenants/${created.tenantId}`); }}>Open client</Button>
          </>
        ) : (
          <>
            {step > 0 && <Button color="inherit" onClick={() => setStep((s) => s - 1)} disabled={create.isPending}>Back</Button>}
            <Box sx={{ flex: 1 }} />
            <Button color="inherit" onClick={close} disabled={create.isPending}>Cancel</Button>
            {last ? (
              <Button variant="contained" onClick={submit} loading={create.isPending}>Create & send invite</Button>
            ) : (
              <Button variant="contained" onClick={next}>Continue</Button>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
