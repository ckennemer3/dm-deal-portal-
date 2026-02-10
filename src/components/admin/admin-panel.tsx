'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { UserWithRelations, Office, Team } from '@/lib/types';
import { UserManagement } from './user-management';
import { TeamManagement } from './team-management';

interface AdminPanelProps {
  users: UserWithRelations[];
  offices: Office[];
  teams: any[];
}

type AdminTab = 'users' | 'teams' | 'offices';

export function AdminPanel({ users, offices, teams }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  const tabs: { id: AdminTab; label: string; count: number }[] = [
    { id: 'users', label: 'Users', count: users.length },
    { id: 'teams', label: 'Teams', count: teams.length },
    { id: 'offices', label: 'Offices', count: offices.length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Admin Panel</h1>
        <p className="text-surface-500 mt-1">Manage users, teams, and office configurations.</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-surface-200">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'pb-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-surface-500 hover:text-surface-700'
              )}
            >
              {tab.label}
              <span className={cn(
                'ml-2 px-1.5 py-0.5 rounded-full text-xs',
                activeTab === tab.id ? 'bg-brand-100 text-brand-700' : 'bg-surface-100 text-surface-600'
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && (
        <UserManagement users={users} offices={offices} teams={teams} />
      )}
      {activeTab === 'teams' && (
        <TeamManagement teams={teams} offices={offices} users={users} />
      )}
      {activeTab === 'offices' && (
        <div className="card">
          <div className="divide-y divide-surface-200">
            {offices.map((office) => {
              const officeTeams = teams.filter((t: any) => t.office?.id === office.id);
              return (
                <div key={office.id} className="flex items-center justify-between px-6 py-4">
                  <div>
                    <p className="text-sm font-medium text-surface-900">{office.name}</p>
                    <p className="text-xs text-surface-500">{officeTeams.length} teams</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
