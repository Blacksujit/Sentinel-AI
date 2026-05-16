"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useOrganization } from "@/contexts/organization-context";
import { OrgGuard } from "@/components/guards/user-org-guards";
import { BarChart3, DollarSign, Activity, Calendar, Download, TrendingUp } from "lucide-react";

interface UsageMetric {
  date: string;
  requests: number;
  tokens: number;
  riskAnalyses: number;
  cost: number;
}

interface ApiKeyUsage {
  keyId: string;
  keyName: string;
  requests: number;
  percentage: number;
}

export default function OrgUsagePage() {
  return (
    <OrgGuard>
      <UsageContent />
    </OrgGuard>
  );
}

function UsageContent() {
  const params = useParams();
  const orgId = params.orgId as string;
  const { activeOrganization } = useOrganization();
  const [timeRange, setTimeRange] = useState("7d");
  const [metrics, setMetrics] = useState<UsageMetric[]>([]);
  const [keyUsage, setKeyUsage] = useState<ApiKeyUsage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data - in production fetch from backend
    const mockMetrics: UsageMetric[] = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      mockMetrics.push({
        date: date.toISOString().split("T")[0],
        requests: Math.floor(Math.random() * 1000) + 500,
        tokens: Math.floor(Math.random() * 50000) + 10000,
        riskAnalyses: Math.floor(Math.random() * 100) + 20,
        cost: parseFloat((Math.random() * 50 + 10).toFixed(2)),
      });
    }
    
    setMetrics(mockMetrics);
    
    setKeyUsage([
      { keyId: "1", keyName: "Production API Key", requests: 4500, percentage: 65 },
      { keyId: "2", keyName: "Staging Test Key", requests: 1500, percentage: 22 },
      { keyId: "3", keyName: "Development Key", requests: 900, percentage: 13 },
    ]);
    
    setLoading(false);
  }, [orgId, timeRange]);

  const totals = metrics.reduce(
    (acc, m) => ({
      requests: acc.requests + m.requests,
      tokens: acc.tokens + m.tokens,
      riskAnalyses: acc.riskAnalyses + m.riskAnalyses,
      cost: acc.cost + m.cost,
    }),
    { requests: 0, tokens: 0, riskAnalyses: 0, cost: 0 }
  );

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
              <a href={`/org/${orgId}/logs`} className="text-gray-600 hover:text-gray-900">Logs</a>
              <a href={`/org/${orgId}/api-keys`} className="text-gray-600 hover:text-gray-900">API Keys</a>
              <a href={`/org/${orgId}/baselines`} className="text-gray-600 hover:text-gray-900">Baselines</a>
              <a href={`/org/${orgId}/usage`} className="text-blue-600 font-medium">Usage</a>
              <a href={`/org/${orgId}/settings`} className="text-gray-600 hover:text-gray-900">Settings</a>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Usage & Billing</h1>
            <p className="mt-2 text-gray-600">Monitor your API usage and billing information.</p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900">{totals.requests.toLocaleString()}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-sm text-green-600 mt-2">+12% from last period</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tokens Used</p>
                <p className="text-2xl font-bold text-gray-900">{(totals.tokens / 1000).toFixed(0)}K</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-sm text-green-600 mt-2">+8% from last period</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Risk Analyses</p>
                <p className="text-2xl font-bold text-gray-900">{totals.riskAnalyses.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
            <p className="text-sm text-gray-500 mt-2">Active monitoring</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Estimated Cost</p>
                <p className="text-2xl font-bold text-gray-900">${totals.cost.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-sm text-gray-500 mt-2">Current billing cycle</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Usage Chart Placeholder */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Usage Over Time</h2>
              <Calendar className="h-5 w-5 text-gray-400" />
            </div>
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <p className="text-gray-500">Usage chart visualization would go here</p>
            </div>
            <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs text-gray-500">
              {metrics.map((m, i) => (
                <div key={i}>
                  <div className="h-20 bg-blue-100 rounded-t-lg relative overflow-hidden">
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-blue-500 transition-all"
                      style={{ height: `${(m.requests / 1500) * 100}%` }}
                    />
                  </div>
                  <p className="mt-1">{m.date.slice(5)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* API Key Breakdown */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Usage by API Key</h2>
            <div className="space-y-4">
              {keyUsage.map((key) => (
                <div key={key.keyId}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-900">{key.keyName}</span>
                    <span className="text-sm text-gray-600">{key.requests.toLocaleString()} requests</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${key.percentage}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{key.percentage}% of total</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Billing Section */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Billing Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600">Current Plan</p>
              <p className="text-lg font-semibold text-gray-900">Pro Plan</p>
              <p className="text-sm text-gray-500">$99/month</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Billing Cycle</p>
              <p className="text-lg font-semibold text-gray-900">Monthly</p>
              <p className="text-sm text-gray-500">Next billing: Feb 15, 2024</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Payment Method</p>
              <p className="text-lg font-semibold text-gray-900">•••• 4242</p>
              <p className="text-sm text-gray-500">Visa ending in 4242</p>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-gray-200 flex justify-between items-center">
            <div>
              <p className="font-medium text-gray-900">Need to upgrade?</p>
              <p className="text-sm text-gray-600">Get more API calls and advanced features</p>
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Upgrade Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
