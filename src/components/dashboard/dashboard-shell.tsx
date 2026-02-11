'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { UserWithRelations, UserRole } from '@/lib/types';
import { ROLE_LABELS } from '@/lib/constants';
import { canAccessAdminPanel, canAccessReporting, canSubmitDeals } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/client';
import { getInitials } from '@/lib/utils';
import { RoleSwitcherProvider, useRoleSwitcher } from '@/contexts/role-switcher-context';

interface DashboardShellProps {
  user: UserWithRelations;
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

function getNavItems(role: string): NavItem[] {
  const items: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: 'home' },
  ];

  if (role === 'agent' || role === 'administrator') {
    items.push({ label: 'Submit Deal', href: '/dashboard/deals/new', icon: 'plus' });
  }

  items.push({ label: 'Deals', href: '/dashboard/deals', icon: 'document' });

  if (role === 'executive' || role === 'administrator') {
    items.push({ label: 'Reporting', href: '/dashboard/reporting', icon: 'chart' });
  }

  if (role === 'administrator') {
    items.push({ label: 'Admin', href: '/dashboard/admin', icon: 'cog' });
  }

  return items;
}

const iconPaths: Record<string, string> = {
  home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  plus: 'M12 4v16m8-8H4',
  document: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  chart: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  cog: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
};

const ALL_ROLES: UserRole[] = ['administrator', 'manager', 'agent', 'underwriter', 'executive'];

/**
 * DashboardShell wraps admin users in RoleSwitcherProvider so they can
 * use the "view as" feature. Non-admin users render directly without the provider.
 */
export function DashboardShell({ user, children }: DashboardShellProps) {
  if (user.role === 'administrator') {
    return (
      <RoleSwitcherProvider actualRole={user.role}>
        <AdminDashboardShellInner user={user}>{children}</AdminDashboardShellInner>
      </RoleSwitcherProvider>
    );
  }

  return <DashboardShellContent user={user} effectiveRole={user.role} isViewingAs={false}>{children}</DashboardShellContent>;
}

/**
 * Admin-specific inner component that consumes the RoleSwitcher context.
 */
function AdminDashboardShellInner({ user, children }: DashboardShellProps) {
  const { effectiveRole, isViewingAs, setViewAsRole } = useRoleSwitcher();

  return (
    <DashboardShellContent
      user={user}
      effectiveRole={effectiveRole}
      isViewingAs={isViewingAs}
      onRoleChange={setViewAsRole}
    >
      {children}
    </DashboardShellContent>
  );
}

interface DashboardShellContentProps {
  user: UserWithRelations;
  children: React.ReactNode;
  effectiveRole: UserRole;
  isViewingAs: boolean;
  onRoleChange?: (role: UserRole | null) => void;
}

function DashboardShellContent({ user, children, effectiveRole, isViewingAs, onRoleChange }: DashboardShellContentProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = getNavItems(effectiveRole);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as UserRole;
    onRoleChange?.(newRole);
  };

  const handleResetRole = () => {
    onRoleChange?.(null);
  };

  return (
    <div className="min-h-screen bg-surface-100">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-surface-900 transform transition-transform duration-200 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-white/10">
          <Image src="/D&M Logo.jpg" alt="D&M" width={36} height={36} className="rounded" />
          <span className="font-semibold text-white tracking-tight">Deal Portal</span>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-surface-400 hover:bg-white/5 hover:text-white'
                )}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={iconPaths[item.icon]} />
                </svg>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User info at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
              <span className="text-sm font-medium text-white">
                {getInitials(user.first_name, user.last_name)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user.first_name} {user.last_name}
              </p>
              <p className="text-xs text-surface-400">{ROLE_LABELS[user.role]}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-md text-surface-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Sign out"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar - dark */}
        <header className="sticky top-0 z-30 flex items-center h-14 px-4 bg-surface-900 border-b border-white/10 lg:px-8">
          <button
            className="lg:hidden p-2 -ml-2 rounded-md text-surface-400 hover:text-white hover:bg-white/10"
            onClick={() => setSidebarOpen(true)}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-4">
            {/* Role Switcher Dropdown (admin only) */}
            {user.role === 'administrator' && (
              <div className="flex items-center gap-2">
                <label htmlFor="role-switcher" className="text-xs text-surface-400 hidden sm:block uppercase tracking-wide">
                  Viewing as:
                </label>
                <select
                  id="role-switcher"
                  value={effectiveRole}
                  onChange={handleRoleChange}
                  className={cn(
                    'text-xs font-semibold rounded-md px-2.5 py-1.5 bg-white/10 focus:outline-none focus:ring-2 focus:ring-brand-500 uppercase tracking-wide',
                    isViewingAs
                      ? 'border border-brand-500 text-brand-400'
                      : 'border border-white/20 text-white'
                  )}
                >
                  {ALL_ROLES.map((role) => (
                    <option key={role} value={role} className="bg-surface-900 text-white">
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {user.team?.name && (
              <span className="text-xs text-surface-400 hidden md:block">
                {user.team.office?.name} &mdash; {user.team.name}
              </span>
            )}
          </div>
        </header>

        {/* View-as banner */}
        {isViewingAs && (
          <div className="sticky top-14 z-20 flex items-center justify-center gap-3 px-4 py-2 bg-brand-950 border-b border-brand-800 text-brand-300 text-xs font-medium uppercase tracking-wide">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>
              Viewing as <strong className="text-white">{ROLE_LABELS[effectiveRole]}</strong>
            </span>
            <button
              onClick={handleResetRole}
              className="ml-1 px-2 py-0.5 text-xs font-semibold rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              Reset
            </button>
          </div>
        )}

        {/* Page content */}
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
