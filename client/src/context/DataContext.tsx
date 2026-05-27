import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface DataContextType {
  refreshKey: number;
  refresh: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <DataContext.Provider value={{ refreshKey, refresh }}>
      {children}
    </DataContext.Provider>
  );
}

export function useDataRefresh() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useDataRefresh must be used within DataProvider');
  return ctx;
}
