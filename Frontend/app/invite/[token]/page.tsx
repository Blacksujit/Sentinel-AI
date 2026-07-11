"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { apiPost } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";

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
      <div className="rounded-3xl border border-border bg-card p-10 shadow-card">
        <h1 className="text-3xl font-semibold text-foreground">Accept Invitation</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          {isProcessing ? "One moment while we accept your invite..." : message}
        </p>

        {error ? (
          <div className="mt-6 rounded-2xl bg-destructive/10 p-4 text-left text-destructive">
            <p className="font-medium">Unable to accept invite</p>
            <p className="mt-2 text-sm">{error}</p>
            <div className="mt-4 flex justify-center gap-3 text-sm">
              <Button
                variant="outline"
                onClick={() => router.push('/')}
              >
                Back to home
              </Button>
              <Button onClick={() => router.refresh()}>Try again</Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
