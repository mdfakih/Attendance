'use client';

import { useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PersonCell } from '@/components/admin/person-cell';
import { FormDialog } from '@/components/common/form-dialog';
import { useBranches, useDepartments } from '@/components/common/filters';
import { EmptyState, Loading } from '@/components/common/loading';
import { PageHeader } from '@/components/common/page-header';
import { SectionCard } from '@/components/common/section-card';
import { useSnackbar } from '@/components/common/snackbar';
import { SoftChip } from '@/components/common/status-chip';
import { PermissionMatrix } from '@/components/common/permission-matrix';
import { moduleCount, type PermissionMatrixValue } from '@/lib/permission-matrix';
import { formatDateTime } from '@/lib/format';
import { api } from '@/lib/http';
import { useSession } from '@/lib/session';

interface Role {
  id: string;
  name: string;
  kind: 'ADMIN' | 'MANAGER';
  description: string | null;
  permissions: PermissionMatrixValue;
  members: number;
}
interface Member {
  membershipId: string;
  email: string;
  fullName: string;
  role: { id: string; name: string; kind: string };
  status: string;
  branchIds: string[];
  departmentIds: string[];
  lastLoginAt: string | null;
}
interface Invitation {
  id: string;
  email: string;
  fullName: string;
  roleId: string;
  expiresAt: string;
  expired: boolean;
}

const ROLES_MANAGED_NOTE = 'Roles and their permissions are set up by your service provider. Contact them to add a role or change what it can do.';

export default function UsersPage() {
  const { session } = useSession();
  const { notify, notifyError } = useSnackbar();
  const queryClient = useQueryClient();
  const [invite, setInvite] = useState<{ email: string; fullName: string; roleId: string; branchIds: string[]; departmentIds: string[] } | null>(null);
  const [viewRole, setViewRole] = useState<Role | null>(null);
  const [edit, setEdit] = useState<Member | null>(null);
  const roles = useQuery({ queryKey: ['roles'], queryFn: () => api.get<Role[]>('/roles') });
  const users = useQuery({ queryKey: ['users'], queryFn: () => api.get<{ members: Member[]; invitations: Invitation[] }>('/users') });
  const branches = useBranches();
  const departments = useDepartments();
  const inv = () => { queryClient.invalidateQueries({ queryKey: ['users'] }); queryClient.invalidateQueries({ queryKey: ['roles'] }); };
  const sendInvite = useMutation({ mutationFn: (f: NonNullable<typeof invite>) => api.post('/users/invite', f), onSuccess: () => { inv(); setInvite(null); notify('Invitation sent'); }, onError: notifyError });
  const updateMember = useMutation({ mutationFn: (m: Member) => api.patch(`/users/${m.membershipId}`, { roleId: m.role.id, status: m.status, branchIds: m.branchIds, departmentIds: m.departmentIds }), onSuccess: () => { inv(); setEdit(null); notify('User updated'); }, onError: notifyError });
  const resend = useMutation({ mutationFn: (id: string) => api.post(`/invitations/${id}/resend`), onSuccess: () => notify('Invitation re-sent'), onError: notifyError });
  const revoke = useMutation({ mutationFn: (id: string) => api.post(`/invitations/${id}/revoke`), onSuccess: () => { inv(); notify('Invitation revoked'); }, onError: notifyError });

  const multi = (v: unknown) => (typeof v === 'string' ? v.split(',') : (v as string[]));
  const scopeOf = (m: Member) => (m.branchIds.length + m.departmentIds.length === 0 ? 'Everyone' : [...m.branchIds.map((id) => branches.data?.find((b) => b.id === id)?.name), ...m.departmentIds.map((id) => departments.data?.find((d) => d.id === id)?.name)].filter(Boolean).join(', '));
  const members = users.data?.members ?? [];
  const invitations = users.data?.invitations ?? [];

  return (
    <>
      <PageHeader
        title="Users & roles"
        subtitle="Admins have full access. Managers see only the modules their role allows, optionally limited to some branches or departments."
        actions={<Button variant="contained" startIcon={<AddIcon />} onClick={() => setInvite({ email: '', fullName: '', roleId: roles.data?.find((r) => r.kind === 'MANAGER')?.id ?? '', branchIds: [], departmentIds: [] })}>Invite user</Button>}
      />
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <SectionCard title="People with dashboard access" icon={<ManageAccountsOutlinedIcon />} flush>
            {users.isLoading ? <Box sx={{ p: 2.5 }}><Loading minHeight={160} /></Box> : members.length + invitations.length === 0 ? <EmptyState compact title="No users yet" description="Invite managers to help run attendance." /> : (
              <TableContainer>
                <Table size="small">
                  <TableHead><TableRow><TableCell sx={{ pl: 2.5 }}>Name</TableCell><TableCell>Role</TableCell><TableCell>Sees</TableCell><TableCell>Last sign-in</TableCell><TableCell sx={{ pr: 2.5 }} /></TableRow></TableHead>
                  <TableBody>
                    {members.map((m) => (
                      <TableRow key={m.membershipId} hover>
                        <TableCell sx={{ pl: 2.5 }}><PersonCell name={m.fullName} caption={m.email} /></TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
                            <SoftChip label={m.role.name} tone={m.role.kind === 'ADMIN' ? 'primary' : 'default'} />
                            {m.status === 'DISABLED' && <SoftChip label="Disabled" tone="error" />}
                          </Stack>
                        </TableCell>
                        <TableCell>{scopeOf(m)}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(m.lastLoginAt)}</TableCell>
                        <TableCell align="right" sx={{ pr: 2.5 }}><Button size="small" onClick={() => setEdit(m)}>Edit</Button></TableCell>
                      </TableRow>
                    ))}
                    {invitations.map((i) => (
                      <TableRow key={i.id} hover>
                        <TableCell sx={{ pl: 2.5 }}><PersonCell name={i.fullName} caption={i.email} /></TableCell>
                        <TableCell><SoftChip label={i.expired ? 'Invite expired' : 'Invited'} tone={i.expired ? 'error' : 'warning'} dot /></TableCell>
                        <TableCell colSpan={2}>{roles.data?.find((r) => r.id === i.roleId)?.name}</TableCell>
                        <TableCell align="right" sx={{ pr: 2.5, whiteSpace: 'nowrap' }}>
                          <Button size="small" loading={resend.isPending && resend.variables === i.id} onClick={() => resend.mutate(i.id)}>Resend</Button>
                          <Button size="small" color="error" loading={revoke.isPending && revoke.variables === i.id} onClick={() => revoke.mutate(i.id)}>Revoke</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <SectionCard title="Roles" subtitle={ROLES_MANAGED_NOTE} icon={<AdminPanelSettingsOutlinedIcon />} flush>
            {roles.isLoading ? <Box sx={{ p: 2.5 }}><Loading minHeight={120} /></Box> : (
              <Table size="small">
                <TableBody>
                  {roles.data?.map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell sx={{ pl: 2.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{r.kind === 'ADMIN' ? 'Full access' : `${moduleCount(r.permissions)} modules`} · {r.members} {r.members === 1 ? 'user' : 'users'}</Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ pr: 2.5 }}>{r.kind === 'MANAGER' && <Button size="small" onClick={() => setViewRole(r)}>View permissions</Button>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </SectionCard>
        </Grid>
      </Grid>

      <FormDialog open={!!invite} title="Invite a user" subtitle="They get an email with a link to set up their account." submitLabel="Send invitation" busy={sendInvite.isPending} onClose={() => setInvite(null)} onSubmit={() => invite && sendInvite.mutate(invite)} maxWidth="xs">
        {invite && (<>
          <TextField label="Full name" value={invite.fullName} onChange={(e) => setInvite({ ...invite, fullName: e.target.value })} autoFocus />
          <TextField label="Email" type="email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} />
          <TextField select label="Role" value={invite.roleId} onChange={(e) => setInvite({ ...invite, roleId: e.target.value })}>{roles.data?.map((r) => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}</TextField>
          <TextField select label="Limit to branches (optional)" value={invite.branchIds} onChange={(e) => setInvite({ ...invite, branchIds: multi(e.target.value) })} slotProps={{ select: { multiple: true } }} helperText="Leave empty to see every branch">{branches.data?.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}</TextField>
          <TextField select label="Limit to departments (optional)" value={invite.departmentIds} onChange={(e) => setInvite({ ...invite, departmentIds: multi(e.target.value) })} slotProps={{ select: { multiple: true } }}>{departments.data?.map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}</TextField>
        </>)}
      </FormDialog>

      <FormDialog open={!!edit} title="Edit user" subtitle={edit ? `${edit.fullName} · ${edit.email}` : undefined} busy={updateMember.isPending} onClose={() => setEdit(null)} onSubmit={() => edit && updateMember.mutate(edit)} maxWidth="xs">
        {edit && (<>
          <TextField select label="Role" value={edit.role.id} onChange={(e) => setEdit({ ...edit, role: { ...edit.role, id: e.target.value } })}>{roles.data?.map((r) => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}</TextField>
          <TextField select label="Branches" value={edit.branchIds} onChange={(e) => setEdit({ ...edit, branchIds: multi(e.target.value) })} slotProps={{ select: { multiple: true } }} helperText="Leave empty to see every branch">{branches.data?.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}</TextField>
          <TextField select label="Departments" value={edit.departmentIds} onChange={(e) => setEdit({ ...edit, departmentIds: multi(e.target.value) })} slotProps={{ select: { multiple: true } }}>{departments.data?.map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}</TextField>
          <TextField select label="Status" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}><MenuItem value="ACTIVE">Active</MenuItem><MenuItem value="DISABLED">Disabled (cannot sign in)</MenuItem></TextField>
        </>)}
      </FormDialog>

      <Dialog open={!!viewRole} onClose={() => setViewRole(null)} fullWidth maxWidth="md">
        <DialogTitle>{viewRole?.name}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {viewRole?.description ? `${viewRole.description}. ` : ''}What people with this role can do. {ROLES_MANAGED_NOTE}
          </Typography>
          {viewRole && <PermissionMatrix value={viewRole.permissions} features={session.features} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewRole(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
