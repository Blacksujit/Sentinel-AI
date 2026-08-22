"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { UserGuard } from "@/components/guards/user-org-guards";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui";
import { motion } from "framer-motion";
import { slideUp, staggerContainer } from "@/components/ui/motion";

interface ActivityLog {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  riskLevel?: "low" | "medium" | "high";
}

export default function UserLogsPage() {
  return (
    <UserGuard>
      <LogsContent />
    </UserGuard>
  );
}

function LogsContent() {
  const { user } = useUser();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const response = await fetch("/api/logs?limit=50", { cache: "no-store" })
        if (!response.ok) throw new Error("Failed to load logs")
        const data = await response.json()
        const riskLogs: any[] = Array.isArray(data) ? data : []
        setLogs(
          riskLogs.map((log: any, i: number) => ({
            id: String(log?.id ?? i),
            action: "Risk Event",
            details: log?.prompt
              ? `Analyzed: ${String(log.prompt).slice(0, 120)}`
              : "AI risk event recorded",
            timestamp: log?.created_at
              ? new Date(log.created_at).toISOString()
              : new Date().toISOString(),
            riskLevel:
              (log?.final_risk_score ?? 0) >= 0.7
                ? "high"
                : (log?.final_risk_score ?? 0) >= 0.4
                  ? "medium"
                  : "low",
          }))
        )
      } catch {
        setLogs([])
      } finally {
        setLoading(false)
      }
    }

    loadLogs()
  }, []);

  const filteredLogs = filter === "all" 
    ? logs 
    : logs.filter(log => log.action.toLowerCase().includes(filter.toLowerCase()));

  const getRiskBadge = (level?: string) => {
    if (!level) return null;
    const variant = level === "high" ? "destructive" : level === "medium" ? "warning" : "secondary";
    return (
      <Badge variant={variant}>
        {level.charAt(0).toUpperCase() + level.slice(1)} Risk
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
          <h1 className="text-2xl font-bold text-foreground">Activity Logs</h1>
          <p className="text-sm text-muted-foreground">View your recent activity and prompt testing history.</p>
        </motion.div>

        <motion.div variants={slideUp} className="flex items-center gap-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-background border border-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="all">All Activities</option>
            <option value="prompt">Prompt Tests</option>
            <option value="profile">Profile Updates</option>
          </select>
        </motion.div>

        <motion.div variants={slideUp} className="bg-card border border-border rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No activity logs found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Details</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Risk Level</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                        {log.action}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground max-w-md truncate">
                        {log.details}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getRiskBadge(log.riskLevel)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AppLayout>
  );
}
