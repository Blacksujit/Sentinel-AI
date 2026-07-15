"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useOrgContext } from "@/contexts/organization-context";
import { OrgGuard } from "@/components/guards/user-org-guards";
import { AppLayoutModern } from "@/components/layout/AppLayoutModern";
import { Button } from "@/components/ui/Button";
import { motion } from "framer-motion";
import { staggerContainer, slideUp, modalOverlay, modalContent } from "@/components/ui/motion";
import { Settings, Save, Plus, Trash2, AlertTriangle, X } from "lucide-react";

interface BaselineThreshold {
  id: string;
  category: string;
  maxRiskScore: number;
  alertLevel: "low" | "medium" | "high";
  enabled: boolean;
}

export default function OrgBaselinesPage() {
  return (
    <OrgGuard>
      <AppLayoutModern>
        <BaselinesContent />
      </AppLayoutModern>
    </OrgGuard>
  );
}

function BaselinesContent() {
  const params = useParams()!;
  const orgId = params.orgId as string;
  const { activeOrganization } = useOrgContext();
  const [thresholds, setThresholds] = useState<BaselineThreshold[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newThreshold, setNewThreshold] = useState<Partial<BaselineThreshold>>({
    category: "",
    maxRiskScore: 50,
    alertLevel: "medium",
    enabled: true,
  });

  useEffect(() => {
    setThresholds([
      {
        id: "1",
        category: "Prompt Injection",
        maxRiskScore: 75,
        alertLevel: "high",
        enabled: true,
      },
      {
        id: "2",
        category: "Data Leakage",
        maxRiskScore: 60,
        alertLevel: "high",
        enabled: true,
      },
      {
        id: "3",
        category: "Jailbreak Attempt",
        maxRiskScore: 80,
        alertLevel: "high",
        enabled: true,
      },
      {
        id: "4",
        category: "Toxicity",
        maxRiskScore: 40,
        alertLevel: "medium",
        enabled: false,
      },
    ]);
    setLoading(false);
  }, [orgId]);

  const saveThresholds = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    alert("Baseline settings saved successfully!");
  };

  const addThreshold = () => {
    if (!newThreshold.category?.trim()) return;

    const threshold: BaselineThreshold = {
      id: Date.now().toString(),
      category: newThreshold.category,
      maxRiskScore: newThreshold.maxRiskScore || 50,
      alertLevel: (newThreshold.alertLevel as any) || "medium",
      enabled: newThreshold.enabled ?? true,
    };

    setThresholds([...thresholds, threshold]);
    setShowAddModal(false);
    setNewThreshold({ category: "", maxRiskScore: 50, alertLevel: "medium", enabled: true });
  };

  const deleteThreshold = (id: string) => {
    if (confirm("Delete this threshold?")) {
      setThresholds(thresholds.filter(t => t.id !== id));
    }
  };

  const updateThreshold = (id: string, updates: Partial<BaselineThreshold>) => {
    setThresholds(thresholds.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const getAlertColor = (level: string) => {
    const colors: Record<string, string> = {
      low: "bg-success/10 text-success",
      medium: "bg-[color:var(--amber-bg)] text-[color:var(--amber)]",
      high: "bg-[color:var(--red-bg)] text-[color:var(--red)]",
    };
    return colors[level] || "bg-muted text-muted-foreground";
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Baseline Settings</h1>
          <p className="mt-2 text-muted-foreground">
            Configure risk thresholds and alerting baselines for your organization.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Threshold
          </Button>
          <Button onClick={saveThresholds} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <motion.div variants={slideUp} className="mb-6 bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">About Baselines</p>
          <p className="text-sm text-muted-foreground mt-1">
            Baseline thresholds determine when alerts are triggered based on risk scores.
            When a risk analysis exceeds the threshold, an alert is generated at the specified level.
          </p>
        </div>
      </motion.div>

      {/* Thresholds Table */}
      <motion.div variants={slideUp} className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Enabled</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Max Risk Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Alert Level</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {thresholds.map((threshold) => (
                <tr key={threshold.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={threshold.enabled}
                      onChange={(e) => updateThreshold(threshold.id, { enabled: e.target.checked })}
                      className="h-4 w-4 text-primary focus:ring-primary/50 border-border rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                    <input
                      type="text"
                      value={threshold.category}
                      onChange={(e) => updateThreshold(threshold.id, { category: e.target.value })}
                      className="border-border rounded-md text-sm bg-background focus:ring-primary/50 focus:border-primary"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={threshold.maxRiskScore}
                      onChange={(e) => updateThreshold(threshold.id, { maxRiskScore: parseInt(e.target.value) })}
                      className="w-20 border-border rounded-md text-sm bg-background focus:ring-primary/50 focus:border-primary"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={threshold.alertLevel}
                      onChange={(e) => updateThreshold(threshold.id, { alertLevel: e.target.value as any })}
                      className={`px-2 py-1 rounded-full text-xs font-medium border-0 ${getAlertColor(threshold.alertLevel)}`}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => deleteThreshold(threshold.id)}
                      className="text-destructive hover:text-destructive/80 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </motion.div>

      {/* Add Threshold Modal */}
      {showAddModal && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          variants={modalOverlay}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <div className="absolute inset-0 bg-background/80" onClick={() => setShowAddModal(false)} />
          <motion.div
            variants={modalContent}
            initial="initial"
            animate="animate"
            exit="exit"
            className="relative bg-card rounded-xl p-6 w-full max-w-md border border-border shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">Add New Threshold</h2>
              <button onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Category</label>
                <input
                  type="text"
                  value={newThreshold.category}
                  onChange={(e) => setNewThreshold({ ...newThreshold, category: e.target.value })}
                  placeholder="e.g., PII Detection"
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Max Risk Score (0-100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newThreshold.maxRiskScore}
                  onChange={(e) => setNewThreshold({ ...newThreshold, maxRiskScore: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Alert Level</label>
                <select
                  value={newThreshold.alertLevel}
                  onChange={(e) => setNewThreshold({ ...newThreshold, alertLevel: e.target.value as any })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 text-foreground"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="ghost" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button onClick={addThreshold} disabled={!newThreshold.category?.trim()}>
                  Add Threshold
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
