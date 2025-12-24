import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DashboardContextType {
  isFilterPanelOpen: boolean;
  setIsFilterPanelOpen: (value: boolean) => void;
  handleToggleFilterPanel: () => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  const handleToggleFilterPanel = () => {
    setIsFilterPanelOpen(prev => !prev);
  };

  const value = {
    isFilterPanelOpen,
    setIsFilterPanelOpen,
    handleToggleFilterPanel
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboardContext = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboardContext must be used within a DashboardProvider');
  }
  return context;
};

