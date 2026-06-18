"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useOrganization } from "@/contexts/organization-context";
import { OrgGuard } from "@/components/guards/user-org-guards";
import { apiGet, apiPost, apiPatch, apiDelete, ApiError } from "@/lib/api-client";
import { Settings, Users, Bell, Webhook, Save, Shield, X, Mail, Trash2 } from "lucide-react";

interface OrgSettings {
  name: string;
  description: string;
  alertEmail: string;
  webhookUrl: string;
  riskThreshold: number;
  autoBlockHighRisk: boolean;
  notifyOnAlert: boolean;
}

interface OrgMember {
  user_id: number;
  email: string;
  name: string | null;
  role: string;
  joined_at: string;
}

interface OrgInvite {
  id: number;
  email: string;
  role: string;
  status: string;
  invited_by: string | null;
  created_at: string;
  expires_at: string;
  email_sent: boolean;
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
  const { getToken } = useAuth();
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

  const [members, setMembers] = useState<OrgMember[]>([]);
  const [invites, setInvites] = useState<OrgInvite[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
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
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    alert("Settings saved successfully!");
  };

  const fetchMembers = useCallback(async () => {
    setMembersLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const [membersData, invitesData] = await Promise.all([
        apiGet<OrgMember[]>(`/api/orgs/${orgId}/members`, token),
        apiGet<OrgInvite[]>(`/api/orgs/${orgId}/invites`, token),
      ]);
      setMembers(membersData);
      setInvites(invitesData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load team data");
    } finally {
      setMembersLoading(false);
    }
  }, [orgId, getToken]);

  useEffect(() => {
    if (activeTab === "members") {
      fetchMembers();
    }
  }, [activeTab, fetchMembers]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setError(null);
    setSuccess(null);
    try {
      const token = await getToken();
      await apiPost(`/api/orgs/${orgId}/members/invite`, { email: inviteEmail, role: inviteRole }, token);
      setSuccess(`Invitation sent to ${inviteEmail}`);
      setShowInviteModal(false);
      setInviteEmail("");
      fetchMembers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  const handleCancelInvite = async (inviteId: number) => {
    setError(null);
    setSuccess(null);
    try {
      const token = await getToken();
      await apiDelete(`/api/orgs/${orgId}/invites/${inviteId}`, token);
      setSuccess("Invitation cancelled");
      fetchMembers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to cancel invitation");
    }
  };

  const handleRemoveMember = async (userId: number, name: string) => {
    if (!window.confirm(`Remove ${name || userId} from the organization?`)) return;
    setError(null);
    setSuccess(null);
    try {
      const token = await getToken();
      await apiDelete(`/api/orgs/${orgId}/members/${userId}`, token);
      setSuccess("Member removed");
      fetchMembers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to remove member");
    }
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
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    Invite Member
                  </button>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                    {success}
                  </div>
                )}

                {showInviteModal && (
                  <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowInviteModal(false)}>
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-900">Invite Team Member</h3>
                        <button onClick={() => setShowInviteModal(false)} className="text-gray-400 hover:text-gray-600">
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                      <form onSubmit={handleInvite} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                          <input
                            type="email"
                            required
                            value={inviteEmail}
                            onChange={e => setInviteEmail(e.target.value)}
                            placeholder="colleague@company.com"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                          <select
                            value={inviteRole}
                            onChange={e => setInviteRole(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="MEMBER">Member</option>
                            <option value="ADMIN">Admin</option>
                          </select>
                        </div>
                        <div className="flex justify-end space-x-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setShowInviteModal(false)}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={inviting}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                          >
                            <Mail className="h-4 w-4" />
                            <span>{inviting ? "Sending..." : "Send Invite"}</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {membersLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {members.length === 0 && invites.length === 0 && (
                      <p className="text-gray-500 text-center py-8">No team members yet. Invite someone to get started.</p>
                    )}

                    {members.map((member) => (
                      <div key={member.user_id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                            {(member.name || member.email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{member.name || "Unnamed"}</p>
                            <p className="text-sm text-gray-500">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                            {member.role}
                          </span>
                          <button
                            onClick={() => handleRemoveMember(member.user_id, member.name || member.email)}
                            className="text-gray-400 hover:text-red-600 transition"
                            title="Remove member"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {invites.length > 0 && (
                      <>
                        <div className="pt-4">
                          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Pending Invitations</h3>
                        </div>
                        {invites.map((invite) => (
                          <div key={invite.id} className="flex items-center justify-between p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50">
                            <div className="flex items-center space-x-4">
                              <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
                                <Mail className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{invite.email}</p>
                                <p className="text-sm text-gray-500">
                                  Role: {invite.role} &middot; Invited by {invite.invited_by || "unknown"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                                Pending
                              </span>
                              <button
                                onClick={() => handleCancelInvite(invite.id)}
                                className="text-gray-400 hover:text-red-600 transition"
                                title="Cancel invitation"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
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
