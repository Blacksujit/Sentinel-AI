"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useOrgContext } from "@/contexts/organization-context";
import { OrgGuard } from "@/components/guards/user-org-guards";
import { Filter, Download, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { motion } from "framer-motion";
import { AppLayoutModern } from "@/components/layout/AppLayoutModern";
import { Badge, Button, Input } from "@/components/ui";
import { staggerContainer, slideUp } from "@/components/ui/motion";

interface LogEntry {
  id: string;
  timestamp: string;
  type: string;
  severity: "info" | "warning" | "error" | "critical";
  message: string;
  source: string;
  riskScore?: number;
}

export default function OrgLogsPage() {
  return (
    <OrgGuard>
      <AppLayoutModern>
        <LogsContent />
      </AppLayoutModern>
    </OrgGuard>
  );
}

function LogsContent() {
  const params = useParams()!;
  const orgId = params.orgId as string;
  const { activeOrganization } = useOrgContext();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const mockLogs: LogEntry[] = [
      {
        id: "1",
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        type: "Risk Analysis",
        severity: "error",
        message: "High risk prompt detected: potential jailbreak attempt",
        source: "Production API Key",
        riskScore: 85,
      },
      {
        id: "2",
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        type: "Risk Analysis",
        severity: "warning",
        message: "Medium risk content detected: PII in output",
        source: "Staging API Key",
        riskScore: 65,
      },
      {
        id: "3",
        timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        type: "System",
        severity: "info",
        message: "API key rotation completed successfully",
        source: "System",
      },
      {
        id: "4",
        timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        type: "Risk Analysis",
        severity: "critical",
        message: "Critical: Data exfiltration attempt blocked",
        source: "Production API Key",
        riskScore: 95,
      },
      {
        id: "5",
        timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
        type: "Risk Analysis",
        severity: "info",
        message: "Low risk prompt analyzed successfully",
        source: "Development API Key",
        riskScore: 15,
      },
    ];

    setLogs(mockLogs);
    setLoading(false);
  }, [orgId]);

  const filteredLogs = logs.filter((log) => {
    if (filter !== "all" && log.severity !== filter) return false;
    if (searchTerm && !log.message.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
      case "error":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      default:
        return <Info className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getSeverityBadgeClass = (severity: string) => {
    const classes = {
      info: "bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20",
      warning: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      error: "bg-red-500/15 text-red-600 border-red-500/20",
      critical: "bg-red-500/25 text-red-700 border-red-500/30",
    };
    return classes[severity as keyof typeof classes] || "bg-muted-foreground/10 text-muted-foreground border-border";
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Organization Logs</h1>
        <p className="mt-2 text-muted-foreground">View aggregated logs and risk events across all API keys.</p>
      </div>

      {/* Filters */}
      <motion.div variants={slideUp} className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-10 pr-8 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 text-foreground"
            >
              <option value="all">All Severities</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <Input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4" />
          <span>Export Logs</span>
        </Button>
      </motion.div>

      {/* Logs Table */}
      <motion.div variants={slideUp} className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No logs found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Severity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Message</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Source</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Risk Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getSeverityIcon(log.severity)}
                        <Badge variant="outline" className={`ml-2 ${getSeverityBadgeClass(log.severity)}`}>
                          {log.severity}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {log.type}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground max-w-md">
                      {log.message}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {log.source}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.riskScore !== undefined ? (
                        <span className={`font-medium ${
                          log.riskScore > 75 ? "text-red-500" :
                          log.riskScore > 50 ? "text-amber-500" : "text-emerald-500"
                        }`}>
                          {log.riskScore}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
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

      {/* Pagination */}
      <motion.div variants={slideUp} className="mt-4 flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Showing {filteredLogs.length} of {logs.length} entries
        </p>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled>
            Next
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
