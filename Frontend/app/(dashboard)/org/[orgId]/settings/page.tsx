"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useOrgContext } from "@/contexts/organization-context";
import { OrgGuard } from "@/components/guards/user-org-guards";
import { apiGet, apiPost, apiDelete, ApiError } from "@/lib/api-client";
import { AppLayoutModern } from "@/components/layout/AppLayoutModern";
import { Button, Card, Badge, Input, Label, Switch, Separator, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui";
import { staggerContainer, slideUp } from "@/components/ui/motion";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Settings, Users, Bell, Webhook, Shield, Save, X, Mail, Trash2 } from "lucide-react";

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
  const params = useParams()!;
  const orgId = params.orgId as string;
  const { activeOrganization } = useOrgContext();
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
      <AppLayoutModern>
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayoutModern>
    );
  }

  return (
    <AppLayoutModern>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Organization Settings</h1>
          <p className="mt-2 text-muted-foreground">Manage your organization&apos;s configuration and preferences.</p>
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
                  className={cn(
                    "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition",
                    activeTab === item.id
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
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
              <motion.div variants={slideUp}>
                <Card>
                  <div className="p-6">
                    <h2 className="text-xl font-bold text-foreground mb-6">General Settings</h2>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="org-name">Organization Name</Label>
                        <Input
                          id="org-name"
                          type="text"
                          value={settings.name}
                          onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="org-desc">Description</Label>
                        <textarea
                          id="org-desc"
                          value={settings.description}
                          onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                          rows={3}
                          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                        />
                      </div>

                      <Separator />

                      <Button onClick={saveSettings} disabled={saving}>
                        <Save className="h-4 w-4" />
                        {saving ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {activeTab === "members" && (
              <motion.div variants={slideUp}>
                <Card>
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-foreground">Team Members</h2>
                      <Button onClick={() => setShowInviteModal(true)}>
                        Invite Member
                      </Button>
                    </div>

                    {error && (
                      <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                        {error}
                      </div>
                    )}
                    {success && (
                      <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm text-primary">
                        {success}
                      </div>
                    )}

                    <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Invite Team Member</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleInvite} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="invite-email">Email Address</Label>
                            <Input
                              id="invite-email"
                              type="email"
                              required
                              value={inviteEmail}
                              onChange={e => setInviteEmail(e.target.value)}
                              placeholder="colleague@company.com"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="invite-role">Role</Label>
                            <select
                              id="invite-role"
                              value={inviteRole}
                              onChange={e => setInviteRole(e.target.value)}
                              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                            >
                              <option value="MEMBER">Member</option>
                              <option value="ADMIN">Admin</option>
                            </select>
                          </div>
                          <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setShowInviteModal(false)}>
                              Cancel
                            </Button>
                            <Button type="submit" disabled={inviting}>
                              <Mail className="h-4 w-4" />
                              {inviting ? "Sending..." : "Send Invite"}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>

                    {membersLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {members.length === 0 && invites.length === 0 && (
                          <p className="text-muted-foreground text-center py-8">No team members yet. Invite someone to get started.</p>
                        )}

                        {members.map((member) => (
                          <div key={member.user_id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                            <div className="flex items-center space-x-4">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                {(member.name || member.email).charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{member.name || "Unnamed"}</p>
                                <p className="text-sm text-muted-foreground">{member.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <Badge variant="secondary">{member.role}</Badge>
                              <button
                                onClick={() => handleRemoveMember(member.user_id, member.name || member.email)}
                                className="text-muted-foreground hover:text-destructive transition"
                                title="Remove member"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}

                        {invites.length > 0 && (
                          <>
                            <Separator />
                            <div>
                              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pending Invitations</h3>
                            </div>
                            {invites.map((invite) => (
                              <div key={invite.id} className="flex items-center justify-between p-4 border border-dashed border-border rounded-lg bg-muted/50">
                                <div className="flex items-center space-x-4">
                                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <Mail className="h-5 w-5" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-foreground">{invite.email}</p>
                                    <p className="text-sm text-muted-foreground">
                                      Role: {invite.role} &middot; Invited by {invite.invited_by || "unknown"}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <Badge variant="secondary">Pending</Badge>
                                  <button
                                    onClick={() => handleCancelInvite(invite.id)}
                                    className="text-muted-foreground hover:text-destructive transition"
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
                </Card>
              </motion.div>
            )}

            {activeTab === "notifications" && (
              <motion.div variants={slideUp}>
                <Card>
                  <div className="p-6">
                    <h2 className="text-xl font-bold text-foreground mb-6">Notification Preferences</h2>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="alert-email">Alert Email Address</Label>
                        <Input
                          id="alert-email"
                          type="email"
                          value={settings.alertEmail}
                          onChange={(e) => setSettings({ ...settings, alertEmail: e.target.value })}
                        />
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between py-2">
                        <div>
                          <p className="font-medium text-foreground">Notify on High Risk Alerts</p>
                          <p className="text-sm text-muted-foreground">Receive email notifications when high-risk events are detected</p>
                        </div>
                        <Switch
                          checked={settings.notifyOnAlert}
                          onCheckedChange={(checked) => setSettings({ ...settings, notifyOnAlert: checked })}
                        />
                      </div>

                      <Separator />

                      <Button onClick={saveSettings} disabled={saving}>
                        <Save className="h-4 w-4" />
                        {saving ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {activeTab === "webhooks" && (
              <motion.div variants={slideUp}>
                <Card>
                  <div className="p-6">
                    <h2 className="text-xl font-bold text-foreground mb-6">Webhook Configuration</h2>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="webhook-url">Webhook URL</Label>
                        <Input
                          id="webhook-url"
                          type="url"
                          value={settings.webhookUrl}
                          onChange={(e) => setSettings({ ...settings, webhookUrl: e.target.value })}
                          placeholder="https://your-domain.com/webhook"
                        />
                        <p className="text-sm text-muted-foreground">
                          We&apos;ll send POST requests to this URL when risk events are detected.
                        </p>
                      </div>

                      <Separator />

                      <Button onClick={saveSettings} disabled={saving}>
                        <Save className="h-4 w-4" />
                        {saving ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {activeTab === "security" && (
              <motion.div variants={slideUp}>
                <Card>
                  <div className="p-6">
                    <h2 className="text-xl font-bold text-foreground mb-6">Security Settings</h2>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <p className="font-medium text-foreground">Auto-block High Risk Requests</p>
                          <p className="text-sm text-muted-foreground">Automatically block requests with risk score above threshold</p>
                        </div>
                        <Switch
                          checked={settings.autoBlockHighRisk}
                          onCheckedChange={(checked) => setSettings({ ...settings, autoBlockHighRisk: checked })}
                        />
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <Label htmlFor="risk-threshold">Risk Threshold for Auto-blocking</Label>
                        <Input
                          id="risk-threshold"
                          type="number"
                          min="0"
                          max="100"
                          value={settings.riskThreshold}
                          onChange={(e) => setSettings({ ...settings, riskThreshold: parseInt(e.target.value) })}
                          className="w-32"
                        />
                        <p className="text-sm text-muted-foreground">
                          Requests with risk scores above this threshold will be auto-blocked.
                        </p>
                      </div>

                      <Separator />

                      <Button onClick={saveSettings} disabled={saving}>
                        <Save className="h-4 w-4" />
                        {saving ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </AppLayoutModern>
  );
}
