'use client';

import { useState } from 'react';
import { UserWithRelations, Office } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { getFullName } from '@/lib/utils';
import { createTeam, updateTeam } from '@/app/dashboard/admin/actions';

interface TeamManagementProps {
  teams: any[];
  offices: Office[];
  users: UserWithRelations[];
}

export function TeamManagement({ teams, offices, users }: TeamManagementProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [newTeam, setNewTeam] = useState({ name: '', office_id: '', manager_id: '' });

  const officeOptions = offices.map((o) => ({ value: o.id, label: o.name }));
  const managerOptions = users
    .filter((u) => u.role === 'manager')
    .map((u) => ({ value: u.id, label: getFullName(u.first_name, u.last_name) }));

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      await createTeam({
        name: newTeam.name,
        office_id: newTeam.office_id,
        manager_id: newTeam.manager_id || null,
      });
      setShowCreateModal(false);
      setNewTeam({ name: '', office_id: '', manager_id: '' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingTeam) return;
    setLoading(true);
    setError('');
    try {
      await updateTeam(editingTeam.id, {
        name: editingTeam.name,
        office_id: editingTeam.office_id || editingTeam.office?.id,
        manager_id: editingTeam.manager_id || editingTeam.manager?.id || null,
      });
      setEditingTeam(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div />
        <Button onClick={() => setShowCreateModal(true)}>Create Team</Button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-800">
                <th className="text-left text-xs font-semibold text-white/80 uppercase tracking-wider px-6 py-3">Team Name</th>
                <th className="text-left text-xs font-semibold text-white/80 uppercase tracking-wider px-6 py-3">Office</th>
                <th className="text-left text-xs font-semibold text-white/80 uppercase tracking-wider px-6 py-3">Manager</th>
                <th className="text-left text-xs font-semibold text-white/80 uppercase tracking-wider px-6 py-3">Members</th>
                <th className="text-right text-xs font-semibold text-white/80 uppercase tracking-wider px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {teams.map((team: any) => {
                const memberCount = users.filter((u) => u.team_id === team.id).length;
                return (
                  <tr key={team.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-6 py-3 text-sm font-medium text-surface-900">{team.name}</td>
                    <td className="px-6 py-3 text-sm text-surface-600">{team.office?.name || '—'}</td>
                    <td className="px-6 py-3 text-sm text-surface-600">
                      {team.manager ? getFullName(team.manager.first_name, team.manager.last_name) : '—'}
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant="default">{memberCount} members</Badge>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setEditingTeam({ ...team })}>
                        Edit
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Team Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Team"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={loading}>Create Team</Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200"><p className="text-sm text-red-700">{error}</p></div>}
          <Input label="Team Name" required value={newTeam.name}
            onChange={(e) => setNewTeam(p => ({ ...p, name: e.target.value }))} />
          <Select label="Office" required options={officeOptions} value={newTeam.office_id}
            placeholder="Select an office"
            onChange={(e) => setNewTeam(p => ({ ...p, office_id: e.target.value }))} />
          <Select label="Manager" options={[{ value: '', label: 'No manager' }, ...managerOptions]}
            value={newTeam.manager_id}
            onChange={(e) => setNewTeam(p => ({ ...p, manager_id: e.target.value }))} />
        </div>
      </Modal>

      {/* Edit Team Modal */}
      <Modal
        isOpen={!!editingTeam}
        onClose={() => setEditingTeam(null)}
        title="Edit Team"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingTeam(null)}>Cancel</Button>
            <Button onClick={handleUpdate} loading={loading}>Save Changes</Button>
          </>
        }
      >
        {editingTeam && (
          <div className="space-y-4">
            {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200"><p className="text-sm text-red-700">{error}</p></div>}
            <Input label="Team Name" value={editingTeam.name}
              onChange={(e) => setEditingTeam((p: any) => ({ ...p, name: e.target.value }))} />
            <Select label="Office" options={officeOptions}
              value={editingTeam.office_id || editingTeam.office?.id || ''}
              onChange={(e) => setEditingTeam((p: any) => ({ ...p, office_id: e.target.value }))} />
            <Select label="Manager" options={[{ value: '', label: 'No manager' }, ...managerOptions]}
              value={editingTeam.manager_id || editingTeam.manager?.id || ''}
              onChange={(e) => setEditingTeam((p: any) => ({ ...p, manager_id: e.target.value }))} />
          </div>
        )}
      </Modal>
    </div>
  );
}
