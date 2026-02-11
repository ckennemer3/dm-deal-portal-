'use client';

import { useState, useMemo } from 'react';
import { UserWithRelations, Office, UserRole } from '@/lib/types';
import { ROLE_LABELS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { getFullName } from '@/lib/utils';
import { createUser, updateUser } from '@/app/dashboard/admin/actions';

// Preferred office display order – offices are sorted to match this list.
// Any offices not listed here appear alphabetically after these.
const OFFICE_SORT_ORDER = [
  'd&m leasing fort worth',
  'd&m leasing dallas',
  'd&m leasing houston',
  'apple leasing',
  'dallas lease returns',
  'four stars auto ranch',
  'four stars ford',
  'four stars nissan',
  'four stars toyota',
];

function sortOffices(offices: Office[]): Office[] {
  return [...offices].sort((a, b) => {
    const aIdx = OFFICE_SORT_ORDER.indexOf(a.name.toLowerCase());
    const bIdx = OFFICE_SORT_ORDER.indexOf(b.name.toLowerCase());
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return a.name.localeCompare(b.name);
  });
}

interface UserManagementProps {
  users: UserWithRelations[];
  offices: Office[];
  teams: any[];
}

export function UserManagement({ users, offices, teams }: UserManagementProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRelations | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Create user form state
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'agent' as UserRole,
    team_id: '' as string,
    primary_office_id: '' as string,
  });

  // Sort offices in preferred order
  const sortedOffices = useMemo(() => sortOffices(offices), [offices]);

  // Filter teams by selected office for the Create form
  const createTeamOptions = useMemo(() => {
    const filtered = newUser.primary_office_id
      ? teams.filter((t: any) => t.office_id === newUser.primary_office_id || t.office?.id === newUser.primary_office_id)
      : teams;
    return filtered.map((t: any) => ({
      value: t.id,
      label: newUser.primary_office_id ? t.name : `${t.name} (${t.office?.name || 'No office'})`,
    }));
  }, [teams, newUser.primary_office_id]);

  // Filter teams by selected office for the Edit form
  const editTeamOptions = useMemo(() => {
    const officeId = editingUser?.primary_office_id;
    const filtered = officeId
      ? teams.filter((t: any) => t.office_id === officeId || t.office?.id === officeId)
      : teams;
    return filtered.map((t: any) => ({
      value: t.id,
      label: officeId ? t.name : `${t.name} (${t.office?.name || 'No office'})`,
    }));
  }, [teams, editingUser?.primary_office_id]);

  const filteredUsers = users.filter((u) => {
    const matchesSearch = searchTerm === '' ||
      getFullName(u.first_name, u.last_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === '' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleCreateUser = async () => {
    setLoading(true);
    setError('');
    try {
      await createUser({
        ...newUser,
        team_id: newUser.team_id || null,
        primary_office_id: newUser.primary_office_id || null,
      });
      setShowCreateModal(false);
      setNewUser({ email: '', password: '', first_name: '', last_name: '', role: 'agent', team_id: '', primary_office_id: '' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    setLoading(true);
    setError('');
    try {
      await updateUser(editingUser.id, {
        first_name: editingUser.first_name,
        last_name: editingUser.last_name,
        role: editingUser.role,
        team_id: editingUser.team_id,
        primary_office_id: editingUser.primary_office_id,
        is_active: editingUser.is_active,
      });
      setEditingUser(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));
  const officeOptions = sortedOffices.map((o) => ({ value: o.id, label: o.name }));

  // When office changes on the Create form, clear the team selection
  const handleCreateOfficeChange = (officeId: string) => {
    setNewUser(p => ({ ...p, primary_office_id: officeId, team_id: '' }));
  };

  // When office changes on the Edit form, clear the team selection
  const handleEditOfficeChange = (officeId: string) => {
    setEditingUser(p => p ? { ...p, primary_office_id: officeId || null, team_id: null } : null);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-4 flex-wrap">
        <Input
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
        <Select
          options={[{ value: '', label: 'All Roles' }, ...roleOptions]}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="max-w-[200px]"
        />
        <div className="flex-1" />
        <Button onClick={() => setShowCreateModal(true)}>Create User</Button>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-800">
                <th className="text-left text-xs font-semibold text-white/80 uppercase tracking-wider px-6 py-3">Name</th>
                <th className="text-left text-xs font-semibold text-white/80 uppercase tracking-wider px-6 py-3">Email</th>
                <th className="text-left text-xs font-semibold text-white/80 uppercase tracking-wider px-6 py-3">Role</th>
                <th className="text-left text-xs font-semibold text-white/80 uppercase tracking-wider px-6 py-3">Office</th>
                <th className="text-left text-xs font-semibold text-white/80 uppercase tracking-wider px-6 py-3">Team</th>
                <th className="text-left text-xs font-semibold text-white/80 uppercase tracking-wider px-6 py-3">Status</th>
                <th className="text-right text-xs font-semibold text-white/80 uppercase tracking-wider px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-surface-50 transition-colors">
                  <td className="px-6 py-3 text-sm font-medium text-surface-900">
                    {getFullName(user.first_name, user.last_name)}
                  </td>
                  <td className="px-6 py-3 text-sm text-surface-600">{user.email}</td>
                  <td className="px-6 py-3">
                    <Badge variant="info">{ROLE_LABELS[user.role]}</Badge>
                  </td>
                  <td className="px-6 py-3 text-sm text-surface-600">{user.office?.name || user.team?.office?.name || '—'}</td>
                  <td className="px-6 py-3 text-sm text-surface-600">{user.team?.name || '—'}</td>
                  <td className="px-6 py-3">
                    <Badge variant={user.is_active ? 'success' : 'danger'}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setEditingUser({ ...user })}>
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create User"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreateUser} loading={loading}>Create User</Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" required value={newUser.first_name}
              onChange={(e) => setNewUser(p => ({ ...p, first_name: e.target.value }))} />
            <Input label="Last Name" required value={newUser.last_name}
              onChange={(e) => setNewUser(p => ({ ...p, last_name: e.target.value }))} />
          </div>
          <Input label="Email" type="email" required value={newUser.email}
            onChange={(e) => setNewUser(p => ({ ...p, email: e.target.value }))} />
          <Input label="Password" type="password" required value={newUser.password}
            onChange={(e) => setNewUser(p => ({ ...p, password: e.target.value }))} />
          <Select label="Role" required options={roleOptions} value={newUser.role}
            onChange={(e) => setNewUser(p => ({ ...p, role: e.target.value as UserRole }))} />
          <Select label="Primary Office" options={[{ value: '', label: 'No office' }, ...officeOptions]}
            value={newUser.primary_office_id}
            onChange={(e) => handleCreateOfficeChange(e.target.value)} />
          <Select
            label="Team"
            options={[{ value: '', label: newUser.primary_office_id ? 'No team' : 'Select an office first' }, ...createTeamOptions]}
            value={newUser.team_id}
            onChange={(e) => setNewUser(p => ({ ...p, team_id: e.target.value }))}
          />
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title="Edit User"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button onClick={handleUpdateUser} loading={loading}>Save Changes</Button>
          </>
        }
      >
        {editingUser && (
          <div className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name" value={editingUser.first_name}
                onChange={(e) => setEditingUser(p => p ? { ...p, first_name: e.target.value } : null)} />
              <Input label="Last Name" value={editingUser.last_name}
                onChange={(e) => setEditingUser(p => p ? { ...p, last_name: e.target.value } : null)} />
            </div>
            <Select label="Role" options={roleOptions} value={editingUser.role}
              onChange={(e) => setEditingUser(p => p ? { ...p, role: e.target.value as UserRole } : null)} />
            <Select label="Primary Office" options={[{ value: '', label: 'No office' }, ...officeOptions]}
              value={editingUser.primary_office_id || ''}
              onChange={(e) => handleEditOfficeChange(e.target.value)} />
            <Select
              label="Team"
              options={[{ value: '', label: editingUser.primary_office_id ? 'No team' : 'Select an office first' }, ...editTeamOptions]}
              value={editingUser.team_id || ''}
              onChange={(e) => setEditingUser(p => p ? { ...p, team_id: e.target.value || null } : null)}
            />
            <div className="flex items-center gap-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingUser.is_active}
                  onChange={(e) => setEditingUser(p => p ? { ...p, is_active: e.target.checked } : null)}
                  className="w-4 h-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-surface-700">Active account</span>
              </label>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
