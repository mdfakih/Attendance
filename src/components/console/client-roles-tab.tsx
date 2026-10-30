'use client';

import { useState } from 'react';
import { roleSchema } from '@attendance/contracts';
import AddIcon from '@mui/icons-material/Add';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { FormDialog } from '@/components/common/form-dialog';
import { ErrorAlert, Loading } from '@/components/common/loading';
import { PermissionMatrix } from '@/components/common/permission-matrix';
import { moduleCount, type PermissionMatrixValue } from '@/lib/permission-matrix';
import { SectionCard } from '@/components/common/section-card';
import { useSnackbar } from '@/components/common/snackbar';
import { SoftChip } from '@/components/common/status-chip';
import { consoleApi } from '@/lib/http';
import { useClientFeatures } from './client-features';
import { useConsoleSession } from './console-session';

export interface ClientRole {
  readonly id: string;
  readonly name: string;
  readonly kind: 'ADMIN' | 'MANAGER';
  readonly description: string | null;
  readonly isSystem: boolean;
  readonly permissions: PermissionMatrixValue;
  readonly members: number;
}

interface RoleDraft {
  readonly id?: string;
  readonly name: string;
  readonly description: string;
  readonly permissions: PermissionMatrixValue;
}

const EMPTY_DRAFT: RoleDraft = { name: '', description: '', permissions: {} };

interface ClientRolesTabProps {
  readonly tenantId: string;
  readonly tenantName: string;
}

/** A client's roles and what each Manager role may do; only the platform's Superadmin edits them. */
export function ClientRolesTab({ tenantId, tenantName }: ClientRolesTabProps) {
  const { canManageRoles } = useConsoleSession();
  const { notify, notifyError } = useSnackbar();
  const queryClient = useQueryClient();
  const key = ['console-tenant-roles', tenantId];
  const roles = useQuery({ queryKey: key, queryFn: () => consoleApi.get<ClientRole[]>(`/tenants/${tenantId}/roles`) });
  const features = useClientFeatures(tenantId);
  const [draft, setDraft] = useState<RoleDraft | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<ClientRole | null>(null);
  const featureState = features.data ? Object.fromEntries(features.data.map((f) => [f.key, f.enabled])) : undefined;

  const save = useMutation({
    mutationFn: (d: RoleDraft) => {
      const body = { name: d.name, description: d.description || undefined, permissions: d.permissions };
      return d.id ? consoleApi.put(`/tenants/${tenantId}/roles/${d.id}`, body) : consoleApi.post(`/tenants/${tenantId}/roles`, body);
    },
    onSuccess: (_, d) => {
      void queryClient.invalidateQueries({ queryKey: key });
      setDraft(null);
      notify(d.id ? `${d.name} updated for ${tenantName}` : `${d.name} created for ${tenantName}`);
    },
    onError: notifyError,
  });
  const remove = useMutation({
    mutationFn: (role: ClientRole) => consoleApi.delete(`/tenants/${tenantId}/roles/${role.id}`),
    onSuccess: (_, role) => {
      void queryClient.invalidateQueries({ queryKey: key });
      setRemoving(null);
      notify(`${role.name} deleted`);
    },
    onError: notifyError,
  });

  const submit = () => {
    if (!draft) return;
    const parsed = roleSchema.safeParse({ name: draft.name, description: draft.description || undefined, permissions: draft.permissions });
    if (!parsed.success) {
      setNameError(parsed.error.issues.some((i) => i.path[0] === 'name') ? 'Use 2–60 characters.' : 'Some permissions are invalid.');
      return;
    }
    setNameError(null);
    save.mutate(draft);
  };
  const open = (next: RoleDraft) => {
    setNameError(null);
    setDraft(next);
  };

  if (roles.isLoading) return <SectionCard><Loading minHeight={220} /></SectionCard>;
  if (roles.error || !roles.data) return <ErrorAlert error={roles.error ?? new Error('Could not load roles')} onRetry={() => roles.refetch()} />;

  return (
    <Stack spacing={2.5}>
      <Alert severity="info" variant="outlined">
        Roles decide what <strong>{tenantName}</strong>’s dashboard users can do. Admins always have full access; a Manager role sees only the modules ticked here.
        Their own Admin assigns these roles to people but cannot change them. {!canManageRoles && 'Only a Superadmin can create or edit roles.'}
      </Alert>
      <SectionCard
        title="Roles"
        subtitle={`${roles.data.length} ${roles.data.length === 1 ? 'role' : 'roles'}`}
        icon={<AdminPanelSettingsOutlinedIcon />}
        flush
        action={canManageRoles ? <Button size="small" startIcon={<AddIcon />} onClick={() => open(EMPTY_DRAFT)}>New role</Button> : undefined}
      >
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ pl: 2.5 }}>Role</TableCell>
                <TableCell>Access</TableCell>
                <TableCell>Users</TableCell>
                <TableCell sx={{ pr: 2.5 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {roles.data.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell sx={{ pl: 2.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.name}</Typography>
                    {r.description && <Typography variant="caption" color="text.secondary">{r.description}</Typography>}
                  </TableCell>
                  <TableCell>
                    {r.kind === 'ADMIN' ? <SoftChip label="Full access" tone="primary" /> : <SoftChip label={`${moduleCount(r.permissions)} modules`} />}
                  </TableCell>
                  <TableCell>{r.members}</TableCell>
                  <TableCell align="right" sx={{ pr: 2.5, whiteSpace: 'nowrap' }}>
                    {r.kind === 'MANAGER' && (
                      <>
                        <Button size="small" onClick={() => open({ id: r.id, name: r.name, description: r.description ?? '', permissions: r.permissions })}>
                          {canManageRoles ? 'Edit permissions' : 'View'}
                        </Button>
                        {canManageRoles && (
                          <Tooltip title={r.members > 0 ? 'Move its users to another role first' : ''}>
                            <span>
                              <Button size="small" color="error" disabled={r.members > 0} onClick={() => setRemoving(r)}>Delete</Button>
                            </span>
                          </Tooltip>
                        )}
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </SectionCard>

      <FormDialog
        open={!!draft}
        title={draft?.id ? `${canManageRoles ? 'Edit' : 'View'} role: ${draft.name}` : 'New manager role'}
        subtitle={`Tick what people with this role can do in ${tenantName}’s dashboard.`}
        submitLabel={draft?.id ? 'Save role' : 'Create role'}
        submitDisabled={!canManageRoles}
        busy={save.isPending}
        onClose={() => setDraft(null)}
        onSubmit={submit}
        maxWidth="md"
      >
        {draft && (
          <>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField
                label="Role name"
                value={draft.name}
                disabled={!canManageRoles}
                error={!!nameError}
                helperText={nameError ?? ' '}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                autoFocus={!draft.id}
              />
              <TextField
                label="Description (optional)"
                value={draft.description}
                disabled={!canManageRoles}
                helperText=" "
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </Stack>
            <Box>
              <PermissionMatrix
                value={draft.permissions}
                features={featureState}
                disabled={!canManageRoles}
                onChange={(permissions) => setDraft({ ...draft, permissions })}
              />
            </Box>
          </>
        )}
      </FormDialog>

      <ConfirmDialog
        open={!!removing}
        title={`Delete ${removing?.name ?? 'role'}?`}
        message="The role is removed from this client. This cannot be undone."
        confirmLabel="Delete role"
        destructive
        busy={remove.isPending}
        onClose={() => setRemoving(null)}
        onConfirm={() => removing && remove.mutate(removing)}
      />
    </Stack>
  );
}
