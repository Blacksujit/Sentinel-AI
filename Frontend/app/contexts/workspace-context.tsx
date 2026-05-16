"use client"
import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  is_default: boolean;
  member_count: number;
  created_at: string;
  updated_at: string;
  org_id: string;
}

interface WorkspaceContextType {
  activeWorkspace: Workspace | null;
  workspaces: Workspace[];
  setActiveWorkspace: (workspace: Workspace | null) => void;
  refreshWorkspaces: () => Promise<void>;
  isLoading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshWorkspaces = useCallback(async () => {
    if (!isLoaded || !user) {
      setIsLoading(false);
      return;
    }

    try {
      const token = await getToken();
      if (!token) {
        setWorkspaces([]);
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/workspaces', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const workspaceList = data.map((w: any) => ({
          id: w.id.toString(),
          name: w.name,
          slug: w.slug,
          description: w.description,
          is_default: w.is_default,
          member_count: w.member_count || 0,
          created_at: w.created_at,
          updated_at: w.updated_at,
          org_id: w.org_id,
        })) || [];
        
        console.log('Workspace Context - Workspaces loaded:', workspaceList);
        setWorkspaces(workspaceList);

        // Restore saved workspace if exists
        const savedWorkspaceId = localStorage.getItem("activeWorkspaceId");
        if (savedWorkspaceId) {
          const savedWorkspace = workspaceList.find((w: Workspace) => w.id.toString() === savedWorkspaceId);
          if (savedWorkspace) {
            setActiveWorkspace(savedWorkspace);
          }
        } else if (workspaceList.length === 1) {
          // If only one workspace, auto-select it
          setActiveWorkspace(workspaceList[0]);
        }
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Failed to fetch workspaces:", error);
      setWorkspaces([]);
      setIsLoading(false);
    }
  }, [user, isLoaded, getToken]);

  const setActiveWorkspaceCallback = useCallback((workspace: Workspace | null) => {
    setActiveWorkspace(workspace);
    if (workspace) {
      localStorage.setItem("activeWorkspaceId", workspace.id);
    } else {
      localStorage.removeItem("activeWorkspaceId");
    }
  }, []);

  // Load workspaces on mount
  useEffect(() => {
    refreshWorkspaces();
  }, [refreshWorkspaces]);

  return (
    <WorkspaceContext.Provider
      value={{
        activeWorkspace,
        workspaces,
        setActiveWorkspace: setActiveWorkspaceCallback,
        refreshWorkspaces,
        isLoading,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}

export function useWorkspaces() {
  const { workspaces, isLoading } = useWorkspace();
  return { workspaces, isLoading };
}

export function useActiveWorkspace() {
  const activeWorkspace = useWorkspace().activeWorkspace;
  return activeWorkspace;
}
