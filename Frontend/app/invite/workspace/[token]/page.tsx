"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Building2, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { apiPost } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";

export default function AcceptWorkspaceInvitePage({
  params,
}: {
  params: { token: string };
}) {
  const router = useRouter();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Accepting your workspace invitation...");
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [orgId, setOrgId] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!params.token) {
      setStatus("error");
      setMessage("Invalid invite link");
      setErrorDetail("No invite token was provided in the URL.");
      return;
    }

    if (!isSignedIn) {
      router.replace(`/auth/sign-up?redirect_url=/invite/workspace/${params.token}`);
      return;
    }

    async function acceptInvite() {
      try {
        const clerkToken = await getToken();
        const response: any = await apiPost(
          `/api/workspaces/invites/${params.token}/accept`,
          {},
          clerkToken ?? undefined
        );
        setStatus("success");
        setMessage("Workspace invite accepted. Redirecting...");
        setWorkspaceId(response.workspace_id);
        setOrgId(response.org_id);
        setTimeout(() => {
          if (response.org_id && response.workspace_id) {
            router.replace(
              `/org/${response.org_id}/dashboard/workspaces/${response.workspace_id}`
            );
          } else {
            router.replace("/");
          }
        }, 1200);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to accept invite.";
        setStatus("error");
        setMessage("Unable to accept workspace invite");
        setErrorDetail(message);
      }
    }

    acceptInvite();
  }, [params.token, isLoaded, isSignedIn, getToken, router]);

  return (
    <div className="mx-auto mt-24 max-w-xl px-4 text-center">
      <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-lg">
        <div className="flex justify-center mb-4">
          {status === "loading" && (
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
          )}
          {status === "success" && (
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
          )}
          {status === "error" && (
            <XCircle className="w-12 h-12 text-rose-500" />
          )}
        </div>

        <h1 className="text-3xl font-semibold text-slate-900 flex items-center justify-center gap-2">
          <Building2 className="w-7 h-7 text-indigo-500" />
          Workspace Invitation
        </h1>
        <p className="mt-4 text-sm text-slate-600">{message}</p>

        {errorDetail && (
          <div className="mt-6 rounded-2xl bg-rose-50 p-5 text-left text-rose-800">
            <p className="font-medium">Error details</p>
            <p className="mt-2 text-sm">{errorDetail}</p>
            <div className="mt-4 flex justify-center gap-3 text-sm">
              <Button
                variant="outline"
                onClick={() => router.push("/")}
              >
                Back to home
              </Button>
              <Button onClick={() => router.refresh()}>Try again</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
