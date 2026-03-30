'use client';

import { createContext, useContext, useMemo, useState, ReactNode } from 'react';
import { UserRole } from '@/lib/types';

interface RoleSwitcherContextType {
  effectiveRole: UserRole;
  isViewingAs: boolean;
  setViewAsRole: (role: UserRole | null) => void;
  actualRole: UserRole;
}

const RoleSwitcherContext = createContext<RoleSwitcherContextType | undefined>(undefined);

export function RoleSwitcherProvider({ children, actualRole }: Readonly<{ children: ReactNode; actualRole: UserRole }>) {
  const [viewAsRole, setViewAsRoleState] = useState<UserRole | null>(null);

  const setViewAsRole = (role: UserRole | null) => {
    setViewAsRoleState(role === actualRole ? null : role);
  };

  const contextValue = useMemo(() => ({
    effectiveRole: viewAsRole ?? actualRole,
    isViewingAs: viewAsRole !== null && viewAsRole !== actualRole,
    setViewAsRole,
    actualRole,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [viewAsRole, actualRole]);

  return (
    <RoleSwitcherContext.Provider value={contextValue}>
      {children}
    </RoleSwitcherContext.Provider>
  );
}

export function useRoleSwitcher() {
  const ctx = useContext(RoleSwitcherContext);
  if (!ctx) throw new Error('useRoleSwitcher must be used within RoleSwitcherProvider');
  return ctx;
}
