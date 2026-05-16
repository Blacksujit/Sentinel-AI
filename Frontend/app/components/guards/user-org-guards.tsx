"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useOrganization, useIsOrgUser } from "@/contexts/organization-context";

interface UserGuardProps {
  children: React.ReactNode;
}

// Guard for individual user routes — auth only (org members may use personal mode)
export function UserGuard({ children }: UserGuardProps) {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.replace("/auth/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  return <>{children}</>;
}

// Guard for organization routes
export function OrgGuard({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useUser();
  const { isOrgUser, isLoading: orgLoading } = useIsOrgUser();
  const { activeOrganization } = useOrganization();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoaded || orgLoading) return;

    if (!isSignedIn) {
      router.replace("/auth/sign-in");
      return;
    }

    // If no organizations, redirect to user dashboard
    if (!isOrgUser) {
      router.push("/user/dashboard");
      return;
    }

    // Extract orgId from path
    const pathMatch = pathname?.match(/\/org\/([^\/]+)/);
    const pathOrgId = pathMatch?.[1];

    // If accessing specific org route, verify access
    if (pathOrgId && activeOrganization && pathOrgId !== activeOrganization.id) {
      // TODO: Verify user has access to this org
      console.warn("Org ID mismatch - verify access");
    }
  }, [isLoaded, isSignedIn, isOrgUser, orgLoading, router, pathname, activeOrganization]);

  if (!isLoaded || orgLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (isSignedIn && isOrgUser) {
    return <>{children}</>;
  }

  return null;
}
