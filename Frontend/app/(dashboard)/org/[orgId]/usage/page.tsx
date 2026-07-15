"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useOrgContext } from "@/contexts/organization-context";
import { OrgGuard } from "@/components/guards/user-org-guards";
import { BarChart3, DollarSign, Activity, Calendar, Download, TrendingUp } from "lucide-react";
import { AppLayoutModern } from "@/components/layout/AppLayoutModern";
import { Button } from "@/components/ui";
import { motion } from "framer-motion";
import { staggerContainer, slideUp } from "@/components/ui/motion";

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
  const params = useParams()!;
  const orgId = params.orgId as string;
  const { activeOrganization } = useOrgContext();
  const [timeRange, setTimeRange] = useState("7d");
  const [metrics, setMetrics] = useState<UsageMetric[]>([]);
  const [keyUsage, setKeyUsage] = useState<ApiKeyUsage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    <div className="min-h-screen bg-background">
      <AppLayoutModern>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Usage & Billing</h1>
              <p className="mt-2 text-muted-foreground">Monitor your API usage and billing information.</p>
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:ring-2 focus:ring-primary/50"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4" />
                <span>Export</span>
              </Button>
            </div>
          </div>

          <motion.div variants={slideUp} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Requests</p>
                  <p className="text-2xl font-bold text-foreground">{totals.requests.toLocaleString()}</p>
                </div>
                <Activity className="h-8 w-8 text-primary" />
              </div>
              <p className="text-sm text-[color:var(--green)] mt-2">+12% from last period</p>
            </div>

            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tokens Used</p>
                  <p className="text-2xl font-bold text-foreground">{(totals.tokens / 1000).toFixed(0)}K</p>
                </div>
                <BarChart3 className="h-8 w-8 text-[color:var(--green)]" />
              </div>
              <p className="text-sm text-[color:var(--green)] mt-2">+8% from last period</p>
            </div>

            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Risk Analyses</p>
                  <p className="text-2xl font-bold text-foreground">{totals.riskAnalyses.toLocaleString()}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-500" />
              </div>
              <p className="text-sm text-muted-foreground mt-2">Active monitoring</p>
            </div>

            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Estimated Cost</p>
                  <p className="text-2xl font-bold text-foreground">${totals.cost.toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-sm text-muted-foreground mt-2">Current billing cycle</p>
            </div>
          </motion.div>

          <motion.div variants={slideUp} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-foreground">Usage Over Time</h2>
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">Usage chart visualization would go here</p>
              </div>
              <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs text-muted-foreground">
                {metrics.map((m, i) => (
                  <div key={i}>
                    <div className="h-20 bg-primary/10 rounded-t-lg relative overflow-hidden">
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-primary transition-all"
                        style={{ height: `${(m.requests / 1500) * 100}%` }}
                      />
                    </div>
                    <p className="mt-1">{m.date.slice(5)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Usage by API Key</h2>
              <div className="space-y-4">
                {keyUsage.map((key) => (
                  <div key={key.keyId}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-foreground">{key.keyName}</span>
                      <span className="text-sm text-muted-foreground">{key.requests.toLocaleString()} requests</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${key.percentage}%` }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{key.percentage}% of total</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div variants={slideUp} className="mt-8 bg-card rounded-lg border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Billing Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Current Plan</p>
                <p className="text-lg font-semibold text-foreground">Pro Plan</p>
                <p className="text-sm text-muted-foreground">$99/month</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Billing Cycle</p>
                <p className="text-lg font-semibold text-foreground">Monthly</p>
                <p className="text-sm text-muted-foreground">Next billing: Feb 15, 2024</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payment Method</p>
                <p className="text-lg font-semibold text-foreground">•••• 4242</p>
                <p className="text-sm text-muted-foreground">Visa ending in 4242</p>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-border flex justify-between items-center">
              <div>
                <p className="font-medium text-foreground">Need to upgrade?</p>
                <p className="text-sm text-muted-foreground">Get more API calls and advanced features</p>
              </div>
              <Button>
                Upgrade Plan
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </AppLayoutModern>
    </div>
  );
}
