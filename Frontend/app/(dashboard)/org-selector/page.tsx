"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Building2, ArrowRight, Plus } from "lucide-react";
import { apiGet } from "@/lib/api-client";

interface Organization {
  id: string;
  name: string;
  slug: string;
  role: string;
}

type MeResponse = {
  memberships?: Array<{ org_id: number; role: string }>;
};

export default function OrgSelectorPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.replace("/auth/sign-in");
      return;
    }

    let cancelled = false;

    const fetchOrgs = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const data = (await apiGet("/me", token)) as MeResponse;
        if (cancelled) return;

        const orgs: Organization[] =
          data.memberships?.map((m) => ({
            id: String(m.org_id),
            name: `Organization ${m.org_id}`,
            slug: String(m.org_id),
            role: m.role,
          })) ?? [];

        setOrganizations(orgs);

        if (orgs.length === 0) {
          setRedirecting(true);
          router.replace("/user/dashboard");
          return;
        }

        if (orgs.length === 1) {
          setRedirecting(true);
          localStorage.setItem("activeOrgId", orgs[0].id);
          router.replace(`/org/${orgs[0].id}/dashboard`);
        }
      } catch (error) {
        console.error("Failed to fetch organizations:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchOrgs();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken, router]);

  const selectOrg = (orgId: string) => {
    localStorage.setItem("activeOrgId", orgId);
    router.push(`/org/${orgId}/dashboard`);
  };

  if (!isLoaded || loading || redirecting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Select an Organization</h1>
          <p className="mt-2 text-gray-600">
            You have access to multiple organizations. Choose one to continue.
          </p>
        </div>

        <div className="space-y-4">
          {organizations.map((org) => (
            <button
              key={org.id}
              type="button"
              onClick={() => selectOrg(org.id)}
              className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{org.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">Role: {org.role}</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
            </button>
          ))}

          <a
            href="/org/create"
            className="w-full block bg-gray-50 rounded-lg border border-gray-200 border-dashed p-6 hover:bg-gray-100 transition-all text-center"
          >
            <div className="flex items-center justify-center space-x-2 text-gray-600">
              <Plus className="h-5 w-5" />
              <span className="font-medium">Create New Organization</span>
            </div>
          </a>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 mb-2">Or continue as an individual user</p>
          <a
            href="/user/dashboard"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Go to Personal Dashboard →
          </a>
        </div>
      </div>
    </div>
  );
}
