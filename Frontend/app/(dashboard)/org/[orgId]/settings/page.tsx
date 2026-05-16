"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useOrganization } from "@/contexts/organization-context";
import { OrgGuard } from "@/components/guards/user-org-guards";
import { Settings, Users, Bell, Webhook, Save, Shield } from "lucide-react";

interface OrgSettings {
  name: string;
  description: string;
  alertEmail: string;
  webhookUrl: string;
  riskThreshold: number;
  autoBlockHighRisk: boolean;
  notifyOnAlert: boolean;
}

export default function OrgSettingsPage() {
  return (
    <OrgGuard>
      <SettingsContent />
    </OrgGuard>
  );
}

function SettingsContent() {
  const params = useParams();
  const orgId = params.orgId as string;
  const { activeOrganization } = useOrganization();
  const [settings, setSettings] = useState<OrgSettings>({
    name: "",
    description: "",
    alertEmail: "",
    webhookUrl: "",
    riskThreshold: 75,
    autoBlockHighRisk: false,
    notifyOnAlert: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => {
    // Mock data - in production fetch from backend
    setSettings({
      name: activeOrganization?.name || "My Organization",
      description: "AI safety monitoring for our applications",
      alertEmail: "security@company.com",
      webhookUrl: "https://hooks.company.com/sentinelai",
      riskThreshold: 75,
      autoBlockHighRisk: true,
      notifyOnAlert: true,
    });
    setLoading(false);
  }, [orgId, activeOrganization]);

  const saveSettings = async () => {
    setSaving(true);
    // In production, call backend API
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    alert("Settings saved successfully!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
              <a href={`/org/${orgId}/usage`} className="text-gray-600 hover:text-gray-900">Usage</a>
              <a href={`/org/${orgId}/settings`} className="text-blue-600 font-medium">Settings</a>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Organization Settings</h1>
          <p className="mt-2 text-gray-600">Manage your organization's configuration and preferences.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <nav className="space-y-1">
              {[
                { id: "general", label: "General", icon: Settings },
                { id: "members", label: "Team Members", icon: Users },
                { id: "notifications", label: "Notifications", icon: Bell },
                { id: "webhooks", label: "Webhooks", icon: Webhook },
                { id: "security", label: "Security", icon: Shield },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition ${
                    activeTab === item.id
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            {activeTab === "general" && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">General Settings</h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Organization Name
                    </label>
                    <input
                      type="text"
                      value={settings.name}
                      onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={settings.description}
                      onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={saveSettings}
                      disabled={saving}
                      className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      <span>{saving ? "Saving..." : "Save Changes"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "members" && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Team Members</h2>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                    Invite Member
                  </button>
                </div>
                
                <div className="space-y-4">
                  {[
                    { name: "John Doe", email: "john@company.com", role: "Admin", status: "Active" },
                    { name: "Jane Smith", email: "jane@company.com", role: "Member", status: "Active" },
                  ].map((member, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{member.name}</p>
                          <p className="text-sm text-gray-500">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                          {member.role}
                        </span>
                        <span className="text-sm text-green-600">{member.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Notification Preferences</h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Alert Email Address
                    </label>
                    <input
                      type="email"
                      value={settings.alertEmail}
                      onChange={(e) => setSettings({ ...settings, alertEmail: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between py-4 border-t border-gray-200">
                    <div>
                      <p className="font-medium text-gray-900">Notify on High Risk Alerts</p>
                      <p className="text-sm text-gray-500">Receive email notifications when high-risk events are detected</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifyOnAlert}
                        onChange={(e) => setSettings({ ...settings, notifyOnAlert: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={saveSettings}
                      disabled={saving}
                      className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      <span>{saving ? "Saving..." : "Save Changes"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "webhooks" && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Webhook Configuration</h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Webhook URL
                    </label>
                    <input
                      type="url"
                      value={settings.webhookUrl}
                      onChange={(e) => setSettings({ ...settings, webhookUrl: e.target.value })}
                      placeholder="https://your-domain.com/webhook"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="mt-2 text-sm text-gray-500">
                      We'll send POST requests to this URL when risk events are detected.
                    </p>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={saveSettings}
                      disabled={saving}
                      className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      <span>{saving ? "Saving..." : "Save Changes"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Security Settings</h2>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between py-4 border-b border-gray-200">
                    <div>
                      <p className="font-medium text-gray-900">Auto-block High Risk Requests</p>
                      <p className="text-sm text-gray-500">Automatically block requests with risk score above threshold</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.autoBlockHighRisk}
                        onChange={(e) => setSettings({ ...settings, autoBlockHighRisk: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Risk Threshold for Auto-blocking
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={settings.riskThreshold}
                      onChange={(e) => setSettings({ ...settings, riskThreshold: parseInt(e.target.value) })}
                      className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="mt-2 text-sm text-gray-500">
                      Requests with risk scores above this threshold will be auto-blocked.
                    </p>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={saveSettings}
                      disabled={saving}
                      className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      <span>{saving ? "Saving..." : "Save Changes"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
