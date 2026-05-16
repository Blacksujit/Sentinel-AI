"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

interface Organization {
  id: string;
  name: string;
  slug: string;
  role: string;
}

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

interface OrganizationContextType {
  activeOrganization: Organization | null;
  activeWorkspace: Workspace | null;
  organizations: Organization[];
  workspaces: Workspace[];
  setActiveOrganization: (org: Organization | null) => void;
  setActiveWorkspace: (workspace: Workspace | null) => void;
  refreshOrganizations: () => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
  isLoading: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser();
  const { getToken, isSignedIn } = useAuth();
  const [activeOrganization, setActiveOrganizationState] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshOrganizations = useCallback(async () => {
    if (!isLoaded || !isSignedIn || !user) return;

    setIsLoading(true);

    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${BACKEND_BASE_URL}/api/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        
        const orgs: Organization[] = data.memberships?.map((m: { org_id: number; role: string }) => ({
          id: String(m.org_id),
          name: `Organization ${m.org_id}`,
          slug: String(m.org_id),
          role: m.role,
        })) || [];

        setOrganizations(orgs);

        const savedOrgId = localStorage.getItem("activeOrgId");
        if (savedOrgId) {
          const saved = orgs.find((o) => o.id === savedOrgId);
          if (saved) setActiveOrganizationState(saved);
        } else if (orgs.length === 1) {
          setActiveOrganizationState(orgs[0]);
          localStorage.setItem("activeOrgId", orgs[0].id);
        }

        // Get workspaces
        const response2 = await fetch(`${BACKEND_BASE_URL}/api/workspaces`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response2.ok) {
          const workspacesData = await response2.json();
          const workspaceList: Workspace[] = workspacesData.map((w: any) => ({
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
          
          console.log('Organization Context - Workspaces loaded:', workspaceList);
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
        }
      } else {
        const errorText = await response.text();
        console.error('Organization Context - /api/me error:', response.status, errorText);
        setOrganizations([]);
      }
    } catch (error) {
      console.error("Failed to fetch organizations:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, isLoaded, isSignedIn, getToken]);

  const refreshWorkspaces = useCallback(async () => {
    if (!isLoaded || !isSignedIn || !user) return;

    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_BASE_URL}/api/workspaces`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const workspacesData = await response.json();
        const workspaceList = workspacesData.map((w: any) => ({
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
        
        console.log('Organization Context - Workspaces loaded:', workspaceList);
        setWorkspaces(workspaceList);

        // Restore saved workspace if exists
        const savedWorkspaceId = localStorage.getItem("activeWorkspaceId");
        if (savedWorkspaceId) {
          const savedWorkspace = workspaceList.find((w: Workspace) => w.id.toString() === savedWorkspaceId);
          if (savedWorkspace) {
            setActiveWorkspaceState(savedWorkspace);
          }
        } else if (workspaceList.length === 1) {
          // If only one workspace, auto-select it
          setActiveWorkspaceState(workspaceList[0]);
        }
      } else {
        const errorText = await response.text();
        console.error('Organization Context - /api/workspaces error:', response.status, errorText);
        setWorkspaces([]);
      }
    } catch (error) {
      console.error("Failed to fetch workspaces:", error);
      setWorkspaces([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, isLoaded, isSignedIn, getToken]);

  const setActiveOrganization = useCallback((org: Organization | null) => {
    setActiveOrganizationState(org);
    if (org) {
      localStorage.setItem("activeOrgId", org.id);
    } else {
      localStorage.removeItem("activeOrgId");
    }
  }, []);

  const setActiveWorkspace = useCallback((workspace: Workspace | null) => {
    setActiveWorkspaceState(workspace);
    if (workspace) {
      localStorage.setItem("activeWorkspaceId", workspace.id);
    } else {
      localStorage.removeItem("activeWorkspaceId");
    }
  }, []);

  useEffect(() => {
    refreshOrganizations();
  }, [refreshOrganizations]);

  return (
    <OrganizationContext.Provider
      value={{
        activeOrganization,
        activeWorkspace,
        organizations,
        workspaces,
        setActiveOrganization,
        setActiveWorkspace,
        refreshOrganizations,
        refreshWorkspaces,
        isLoading,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error("useOrganization must be used within an OrganizationProvider");
  }
  return context;
}

export function useWorkspace() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within an OrganizationProvider");
  }
  return context.activeWorkspace;
}

export function useWorkspaces() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error("useWorkspaces must be used within an OrganizationProvider");
  }
  return { workspaces: context.workspaces || [], isLoading: context.isLoading };
}

export function useActiveWorkspace() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error("useActiveWorkspace must be used within an OrganizationProvider");
  }
  return context.activeWorkspace;
}

export function useIsOrgUser() {
  const { organizations, isLoading } = useOrganization();
  return { isOrgUser: organizations.length > 0, isLoading };
}
