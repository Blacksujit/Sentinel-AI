"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { UserGuard } from "@/components/guards/user-org-guards";

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
    // Mock data - in production this would fetch from backend
    const mockLogs: ActivityLog[] = [
      {
        id: "1",
        action: "Prompt Test",
        details: "Tested prompt: 'Example prompt text here...'",
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        riskLevel: "low",
      },
      {
        id: "2",
        action: "Profile Update",
        details: "Updated profile settings",
        timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      },
      {
        id: "3",
        action: "Prompt Test",
        details: "Tested prompt: 'Another test prompt...'",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        riskLevel: "medium",
      },
    ];
    
    setTimeout(() => {
      setLogs(mockLogs);
      setLoading(false);
    }, 500);
  }, []);

  const filteredLogs = filter === "all" 
    ? logs 
    : logs.filter(log => log.action.toLowerCase().includes(filter.toLowerCase()));

  const getRiskBadge = (level?: string) => {
    if (!level) return null;
    const colors = {
      low: "bg-green-100 text-green-700",
      medium: "bg-yellow-100 text-yellow-700",
      high: "bg-red-100 text-red-700",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[level as keyof typeof colors]}`}>
        {level.charAt(0).toUpperCase() + level.slice(1)} Risk
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* User Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold text-gray-900">SentinelAI</span>
              <span className="ml-4 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm">Individual</span>
            </div>
            <div className="flex items-center space-x-4">
              <a href="/user/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</a>
              <a href="/user/playground" className="text-gray-600 hover:text-gray-900">Playground</a>
              <a href="/user/logs" className="text-blue-600 font-medium">Logs</a>
              <a href="/user/profile" className="text-gray-600 hover:text-gray-900">Profile</a>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Activity Logs</h1>
          <p className="mt-2 text-gray-600">View your recent activity and prompt testing history.</p>
        </div>

        {/* Filter Bar */}
        <div className="mb-6 flex items-center space-x-4">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Activities</option>
            <option value="prompt">Prompt Tests</option>
            <option value="profile">Profile Updates</option>
          </select>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No activity logs found.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Level</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {log.action}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-md truncate">
                      {log.details}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRiskBadge(log.riskLevel)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
