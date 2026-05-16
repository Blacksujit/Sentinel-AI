"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useOrganization } from "@/contexts/organization-context";
import { OrgGuard } from "@/components/guards/user-org-guards";
import { Filter, Download, AlertTriangle, AlertCircle, Info } from "lucide-react";

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
      <LogsContent />
    </OrgGuard>
  );
}

function LogsContent() {
  const params = useParams();
  const orgId = params.orgId as string;
  const { activeOrganization } = useOrganization();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    // Mock data - in production fetch from backend
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
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      info: "bg-blue-100 text-blue-700",
      warning: "bg-yellow-100 text-yellow-700",
      error: "bg-red-100 text-red-700",
      critical: "bg-red-200 text-red-800",
    };
    return colors[severity as keyof typeof colors] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Org Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold text-gray-900">SentinelAI</span>
              <span className="ml-4 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm">
                {activeOrganization?.name || `Org ${orgId}`}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <a href={`/org/${orgId}/dashboard`} className="text-gray-600 hover:text-gray-900">Dashboard</a>
              <a href={`/org/${orgId}/logs`} className="text-blue-600 font-medium">Logs</a>
              <a href={`/org/${orgId}/api-keys`} className="text-gray-600 hover:text-gray-900">API Keys</a>
              <a href={`/org/${orgId}/baselines`} className="text-gray-600 hover:text-gray-900">Baselines</a>
              <a href={`/org/${orgId}/usage`} className="text-gray-600 hover:text-gray-900">Usage</a>
              <a href={`/org/${orgId}/settings`} className="text-gray-600 hover:text-gray-900">Settings</a>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Organization Logs</h1>
          <p className="mt-2 text-gray-600">View aggregated logs and risk events across all API keys.</p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Severities</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
            <Download className="h-4 w-4" />
            <span>Export Logs</span>
          </button>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No logs found matching your criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getSeverityIcon(log.severity)}
                          <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(log.severity)}`}>
                            {log.severity}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.type}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-md">
                        {log.message}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.source}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.riskScore !== undefined ? (
                          <span className={`font-medium ${
                            log.riskScore > 75 ? "text-red-600" : 
                            log.riskScore > 50 ? "text-yellow-600" : "text-green-600"
                          }`}>
                            {log.riskScore}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="mt-4 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Showing {filteredLogs.length} of {logs.length} entries
          </p>
          <div className="flex space-x-2">
            <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50" disabled>
              Previous
            </button>
            <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50" disabled>
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
