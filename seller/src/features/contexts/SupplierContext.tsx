import React, { createContext, useContext, useMemo, useState } from 'react';

export type RankTier = 'Bronze' | 'Silver' | 'Gold';

export type SupplierContextValue = {
  rankTier: RankTier;
  setRankTier: React.Dispatch<React.SetStateAction<RankTier>>;
};

const SupplierContext = createContext<SupplierContextValue | null>(null);

export function SupplierProvider({ children }: { children: React.ReactNode }) {
  const [rankTier, setRankTier] = useState<RankTier>('Bronze');

  const value = useMemo(() => ({ rankTier, setRankTier }), [rankTier]);

  return <SupplierContext.Provider value={value}>{children}</SupplierContext.Provider>;
}

export function useSupplier(): SupplierContextValue {
  const context = useContext(SupplierContext);
  if (context) return context;

  return {
    rankTier: 'Bronze',
    setRankTier: () => undefined,
  };
}

export default SupplierContext;
