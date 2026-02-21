import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface WorkspaceContextType {
  activeWorkspaceId: number | null;
  setActiveWorkspaceId: (id: number | null) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  activeWorkspaceId: null,
  setActiveWorkspaceId: () => {},
});

const STORAGE_KEY = "jaylabs-active-workspace";

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<number | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? Number(stored) : null;
    } catch {
      return null;
    }
  });

  const setActiveWorkspaceId = (id: number | null) => {
    setActiveWorkspaceIdState(id);
    try {
      if (id === null) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, String(id));
      }
    } catch {
      // localStorage unavailable
    }
  };

  return (
    <WorkspaceContext.Provider value={{ activeWorkspaceId, setActiveWorkspaceId }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
