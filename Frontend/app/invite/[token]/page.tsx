"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { apiPost } from "@/lib/api-client";

export default function InviteAcceptPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [message, setMessage] = useState("Accepting your invitation...");
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    if (!params.token) {
      setError("No invite token provided.");
      setIsProcessing(false);
      return;
    }

    if (!isSignedIn) {
      router.replace(`/auth/sign-up?redirect_url=/invite/${params.token}`);
      return;
    }

    async function acceptInvite() {
      setIsProcessing(true);
      try {
        const token = await getToken();
        const response = await apiPost<{ org_id: number }>(`/api/invites/${params.token}/accept`, {}, token ?? undefined);
        setMessage("Invite accepted successfully. Redirecting to your organization...");
        setTimeout(() => {
          router.replace(`/orgs/${response.org_id}`);
        }, 500);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to accept invite.";
        setError(message);
      } finally {
        setIsProcessing(false);
      }
    }

    acceptInvite();
  }, [params.token, isLoaded, isSignedIn, getToken, router]);

  return (
    <div className="mx-auto mt-24 max-w-xl px-4 text-center">
      <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-lg">
        <h1 className="text-3xl font-semibold text-slate-900">Accept Invitation</h1>
        <p className="mt-4 text-sm text-slate-600">
          {isProcessing ? "One moment while we accept your invite..." : message}
        </p>

        {error ? (
          <div className="mt-6 rounded-2xl bg-rose-50 p-5 text-left text-rose-800">
            <p className="font-medium">Unable to accept invite</p>
            <p className="mt-2 text-sm">{error}</p>
            <div className="mt-4 flex justify-center gap-3 text-sm">
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-slate-900 hover:bg-slate-50"
                onClick={() => router.push('/')}
              >
                Back to home
              </button>
              <button
                type="button"
                className="rounded-full bg-slate-900 px-4 py-2 text-white hover:bg-slate-700"
                onClick={() => router.refresh()}
              >
                Try again
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
