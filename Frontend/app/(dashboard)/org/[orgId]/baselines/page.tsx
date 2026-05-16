"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useOrganization } from "@/contexts/organization-context";
import { OrgGuard } from "@/components/guards/user-org-guards";
import { Settings, Save, Plus, Trash2, AlertTriangle } from "lucide-react";

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
      <BaselinesContent />
    </OrgGuard>
  );
}

function BaselinesContent() {
  const params = useParams();
  const orgId = params.orgId as string;
  const { activeOrganization } = useOrganization();
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
    // Mock data - in production fetch from backend
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
    // In production, call backend API
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
    const colors = {
      low: "bg-blue-100 text-blue-700",
      medium: "bg-yellow-100 text-yellow-700",
      high: "bg-red-100 text-red-700",
    };
    return colors[level as keyof typeof colors] || "bg-gray-100 text-gray-700";
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
              <a href={`/org/${orgId}/logs`} className="text-gray-600 hover:text-gray-900">Logs</a>
              <a href={`/org/${orgId}/api-keys`} className="text-gray-600 hover:text-gray-900">API Keys</a>
              <a href={`/org/${orgId}/baselines`} className="text-blue-600 font-medium">Baselines</a>
              <a href={`/org/${orgId}/usage`} className="text-gray-600 hover:text-gray-900">Usage</a>
              <a href={`/org/${orgId}/settings`} className="text-gray-600 hover:text-gray-900">Settings</a>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Baseline Settings</h1>
            <p className="mt-2 text-gray-600">Configure risk thresholds and alerting baselines for your organization.</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <Plus className="h-5 w-5" />
              <span>Add Threshold</span>
            </button>
            <button
              onClick={saveThresholds}
              disabled={saving}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="h-5 w-5" />
              <span>{saving ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm text-blue-800 font-medium">About Baselines</p>
            <p className="text-sm text-blue-700 mt-1">
              Baseline thresholds determine when alerts are triggered based on risk scores. 
              When a risk analysis exceeds the threshold, an alert is generated at the specified level.
            </p>
          </div>
        </div>

        {/* Thresholds Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Enabled</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max Risk Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alert Level</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {thresholds.map((threshold) => (
                  <tr key={threshold.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={threshold.enabled}
                        onChange={(e) => updateThreshold(threshold.id, { enabled: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <input
                        type="text"
                        value={threshold.category}
                        onChange={(e) => updateThreshold(threshold.id, { category: e.target.value })}
                        className="border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={threshold.maxRiskScore}
                        onChange={(e) => updateThreshold(threshold.id, { maxRiskScore: parseInt(e.target.value) })}
                        className="w-20 border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
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
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Add Threshold Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Threshold</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={newThreshold.category}
                    onChange={(e) => setNewThreshold({ ...newThreshold, category: e.target.value })}
                    placeholder="e.g., PII Detection"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Risk Score (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newThreshold.maxRiskScore}
                    onChange={(e) => setNewThreshold({ ...newThreshold, maxRiskScore: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alert Level</label>
                  <select
                    value={newThreshold.alertLevel}
                    onChange={(e) => setNewThreshold({ ...newThreshold, alertLevel: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addThreshold}
                    disabled={!newThreshold.category?.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Add Threshold
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
