"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
  useMemo,
} from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  useOrganization as useClerkOrganization,
  useOrganizationList,
} from "@clerk/nextjs";

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
  setActiveOrganization: (org: Organization | null) => Promise<void>;
  setActiveWorkspace: (workspace: Workspace | null) => void;
  refreshOrganizations: () => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
  isLoading: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(
  undefined,
);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded: userLoaded } = useUser();
  const { getToken, isSignedIn } = useAuth();

  const {
    userMemberships,
    setActive: setActiveClerkOrg,
    isLoaded: orgListLoaded,
  } = useOrganizationList();

  const {
    organization: activeClerkOrg,
    membership: activeClerkMembership,
    isLoaded: activeOrgLoaded,
  } = useClerkOrganization();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] =
    useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const allLoaded = userLoaded && orgListLoaded && activeOrgLoaded;

  const membershipList = userMemberships?.data || [];

  const organizations: Organization[] = useMemo(
    () =>
      membershipList.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug || m.organization.id,
        role: m.role || "member",
      })),
    [membershipList],
  );

  const activeOrganization: Organization | null = useMemo(() => {
    if (!activeClerkOrg) return null;
    return {
      id: activeClerkOrg.id,
      name: activeClerkOrg.name,
      slug: activeClerkOrg.slug || activeClerkOrg.id,
      role: activeClerkMembership?.role || "member",
    };
  }, [activeClerkOrg, activeClerkMembership]);

  const setActiveOrganization = useCallback(
    async (org: Organization | null) => {
      try {
        if (org) {
          await setActiveClerkOrg!({ organization: org.id });
          localStorage.setItem("activeOrgId", org.id);
        } else {
          await setActiveClerkOrg!({ organization: null });
          localStorage.removeItem("activeOrgId");
        }
      } catch (error) {
        console.error("Failed to set active org:", error);
      }
    },
    [setActiveClerkOrg],
  );

  const setActiveWorkspace = useCallback(
    (workspace: Workspace | null) => {
      setActiveWorkspaceState(workspace);
      if (workspace) {
        localStorage.setItem("activeWorkspaceId", workspace.id);
      } else {
        localStorage.removeItem("activeWorkspaceId");
      }
    },
    [],
  );

  // Restore saved active org on mount
  useEffect(() => {
    if (!allLoaded || !isSignedIn) return;

    const savedOrgId = localStorage.getItem("activeOrgId");
    if (savedOrgId && !activeClerkOrg) {
      const orgExists = membershipList.some((m) => m.organization.id === savedOrgId);
      if (orgExists) {
        setActiveClerkOrg({ organization: savedOrgId });
      }
    }

    setIsLoading(false);
  }, [
    allLoaded,
    isSignedIn,
    membershipList,
    activeClerkOrg,
    setActiveClerkOrg,
  ]);

  // Fetch workspaces when active org changes
  const refreshWorkspaces = useCallback(async () => {
    if (!allLoaded || !isSignedIn || !activeOrganization) return;

    try {
      const token = await getToken();
      if (!token) return;
      const response = await fetch("/api/workspaces", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const workspaceList: Workspace[] = (
          data || []
        ).map((w: any) => ({
          id: w.id.toString(),
          name: w.name,
          slug: w.slug,
          description: w.description,
          is_default: w.is_default,
          member_count: w.member_count || 0,
          created_at: w.created_at,
          updated_at: w.updated_at,
          org_id: w.org_id,
        }));

        setWorkspaces(workspaceList);

        const savedWorkspaceId = localStorage.getItem("activeWorkspaceId");
        if (savedWorkspaceId) {
          const saved = workspaceList.find(
            (w: Workspace) => w.id.toString() === savedWorkspaceId,
          );
          if (saved) setActiveWorkspaceState(saved);
        } else if (workspaceList.length === 1) {
          setActiveWorkspaceState(workspaceList[0]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch workspaces:", error);
    }
  }, [allLoaded, isSignedIn, activeOrganization, getToken]);

  const refreshOrganizations = useCallback(async () => {
    // Clerk handles org list sync; just re-fetch workspaces
    if (activeOrganization) {
      await refreshWorkspaces();
    }
  }, [activeOrganization, refreshWorkspaces]);

  useEffect(() => {
    if (activeOrganization) {
      refreshWorkspaces();
    }
  }, [activeOrganization, refreshWorkspaces]);

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

export function useOrgContext() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error("useOrgContext must be used within an OrganizationProvider");
  }
  return context;
}

export function useIsOrgUser() {
  const { organizations, isLoading } = useOrgContext();
  return { isOrgUser: organizations.length > 0, isLoading };
}
