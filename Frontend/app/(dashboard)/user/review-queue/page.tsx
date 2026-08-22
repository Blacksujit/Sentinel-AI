"use client";

import { useState, useEffect, useCallback } from "react";
import { UserGuard } from "@/components/guards/user-org-guards";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge, Button } from "@/components/ui";
import { motion } from "framer-motion";
import { slideUp, staggerContainer } from "@/components/ui/motion";

interface ReviewQueueItem {
  id: number;
  created_at: string;
  final_risk_score: number;
  prompt?: string | null;
  response?: string | null;
  flags: string[];
  confidence?: number | null;
  decision?: string | null;
  decision_reason?: string | null;
  reviewed: boolean;
}

type Disposition = "confirmed_threat" | "false_positive" | "compliance_issue";

const DISPOSITION_LABELS: Record<Disposition, string> = {
  confirmed_threat: "Confirmed Threat",
  false_positive: "False Positive",
  compliance_issue: "Compliance Issue",
};

export default function ReviewQueuePage() {
  return (
    <UserGuard>
      <ReviewQueueContent />
    </UserGuard>
  );
}

function ReviewQueueContent() {
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState<Record<number, Disposition | null>>({});
  const [message, setMessage] = useState<Record<number, string>>({});

  const loadQueue = useCallback(async () => {
    try {
      const response = await fetch("/api/logs/review-queue?limit=50", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load review queue");
      const data = await response.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const submitReview = async (item: ReviewQueueItem, disposition: Disposition) => {
    setSubmitting((s) => ({ ...s, [item.id]: disposition }));
    setMessage((m) => ({ ...m, [item.id]: "" }));
    try {
      const response = await fetch(`/api/logs/${item.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disposition, notes: notes[item.id] || undefined }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage((m) => ({ ...m, [item.id]: data?.detail || data?.message || "Review failed" }));
      } else {
        setMessage((m) => ({ ...m, [item.id]: data?.message || "Reviewed" }));
        setItems((items) => items.map((i) => (i.id === item.id ? { ...i, reviewed: true } : i)));
      }
    } catch {
      setMessage((m) => ({ ...m, [item.id]: "Review failed" }));
    } finally {
      setSubmitting((s) => ({ ...s, [item.id]: null }));
    }
  };

  const getScoreBadge = (score: number) => {
    const variant = score >= 0.7 ? "destructive" : score >= 0.4 ? "warning" : "secondary";
    return (
      <Badge variant={variant as "destructive" | "warning" | "secondary"}>
        Risk {Math.round(score * 100)}%
      </Badge>
    );
  };

  return (
    <AppLayout>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="space-y-6 p-6"
      >
        <motion.div variants={slideUp} className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-foreground">Review Queue</h1>
          <p className="text-sm text-muted-foreground">
            Human review for flagged interactions (blocked or escalated). Dispositions feed the
            training loop — false positives are explicitly excluded.
          </p>
        </motion.div>

        <motion.div variants={slideUp} className="space-y-4">
          {loading ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : items.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
              No flagged interactions awaiting review.
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="bg-card border border-border rounded-lg overflow-hidden"
              >
                <div className="p-5 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {getScoreBadge(item.final_risk_score)}
                    <Badge variant={item.decision === "block" ? "destructive" : "warning"}>
                      {item.decision || "unknown"}
                    </Badge>
                    {item.reviewed && <Badge variant="success">Reviewed</Badge>}
                    {item.flags.slice(0, 3).map((flag) => (
                      <Badge key={flag} variant="outline">
                        {flag}
                      </Badge>
                    ))}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Prompt
                      </span>
                      <p className="text-foreground mt-0.5 break-words">
                        {item.prompt || "—"}
                      </p>
                    </div>
                    {item.response && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Response
                        </span>
                        <p className="text-muted-foreground mt-0.5 break-words">
                          {item.response}
                        </p>
                      </div>
                    )}
                    {item.decision_reason && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Reason
                        </span>
                        <p className="text-muted-foreground mt-0.5">{item.decision_reason}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <textarea
                      placeholder="Optional review notes..."
                      value={notes[item.id] || ""}
                      onChange={(e) => setNotes((n) => ({ ...n, [item.id]: e.target.value }))}
                      disabled={item.reviewed || !!submitting[item.id]}
                      rows={1}
                      className="flex-1 min-w-[200px] bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-45"
                    />
                    {(["confirmed_threat", "false_positive", "compliance_issue"] as Disposition[]).map(
                      (disposition) => (
                        <Button
                          key={disposition}
                          size="sm"
                          variant={
                            disposition === "confirmed_threat"
                              ? "destructive"
                              : disposition === "false_positive"
                                ? "secondary"
                                : "outline"
                          }
                          disabled={item.reviewed || !!submitting[item.id]}
                          onClick={() => submitReview(item, disposition)}
                        >
                          {submitting[item.id] === disposition ? "Saving..." : DISPOSITION_LABELS[disposition]}
                        </Button>
                      )
                    )}
                  </div>

                  {message[item.id] && (
                    <p className="text-xs text-muted-foreground">{message[item.id]}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </motion.div>
      </motion.div>
    </AppLayout>
  );
}