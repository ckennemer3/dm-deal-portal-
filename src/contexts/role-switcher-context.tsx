'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { UserRole } from '@/lib/types';

interface RoleSwitcherContextType {
  effectiveRole: UserRole;
  isViewingAs: boolean;
  setViewAsRole: (role: UserRole | null) => void;
  actualRole: UserRole;
}

const RoleSwitcherContext = createContext<RoleSwitcherContextType | undefined>(undefined);

export function RoleSwitcherProvider({ children, actualRole }: { children: ReactNode; actualRole: UserRole }) {
  const [viewAsRole, setViewAsRoleState] = useState<UserRole | null>(null);

  const setViewAsRole = (role: UserRole | null) => {
    setViewAsRoleState(role === actualRole ? null : role);
  };

  return (
    <RoleSwitcherContext.Provider value={{
      effectiveRole: viewAsRole ?? actualRole,
      isViewingAs: viewAsRole !== null && viewAsRole !== actualRole,
      setViewAsRole,
      actualRole,
    }}>
      {children}
    </RoleSwitcherContext.Provider>
  );
}

export function useRoleSwitcher() {
  const ctx = useContext(RoleSwitcherContext);
  if (!ctx) throw new Error('useRoleSwitcher must be used within RoleSwitcherProvider');
  return ctx;
}
