"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { OrgGuard } from "@/components/guards/user-org-guards";
import { useOrgContext } from "@/contexts/organization-context";
import { Key, Copy, Trash2, RefreshCw, Plus, Search } from "lucide-react";
import { AppLayoutModern } from "@/components/layout/AppLayoutModern";
import { Badge, Button } from "@/components/ui";
import { motion } from "framer-motion";
import { staggerContainer, slideUp } from "@/components/ui/motion";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed: string | null;
  environment: "production" | "staging" | "development";
}

export default function OrgApiKeysPage() {
  return (
    <OrgGuard>
      <ApiKeysContent />
    </OrgGuard>
  );
}

function ApiKeysContent() {
  const params = useParams();
  const orgId = params?.orgId ?? "";
  const { user } = useUser();
  const { activeOrganization } = useOrgContext();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyEnv, setNewKeyEnv] = useState<"production" | "staging" | "development">("development");
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setApiKeys([
      {
        id: "1",
        name: "Production API Key",
        key: "sk_live_abc123xyz789",
        createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
        lastUsed: new Date(Date.now() - 3600000).toISOString(),
        environment: "production",
      },
      {
        id: "2",
        name: "Staging Test Key",
        key: "sk_test_def456uvw012",
        createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
        lastUsed: new Date(Date.now() - 86400000).toISOString(),
        environment: "staging",
      },
    ]);
    setLoading(false);
  }, [orgId]);

  const createApiKey = async () => {
    if (!newKeyName.trim()) return;

    const newKey: ApiKey = {
      id: Date.now().toString(),
      name: newKeyName,
      key: `sk_${newKeyEnv}_${Math.random().toString(36).substring(2, 15)}`,
      createdAt: new Date().toISOString(),
      lastUsed: null,
      environment: newKeyEnv,
    };

    setApiKeys([...apiKeys, newKey]);
    setShowCreateModal(false);
    setNewKeyName("");
    setNewKeyEnv("development");
  };

  const revokeApiKey = async (id: string) => {
    if (confirm("Are you sure you want to revoke this API key? This action cannot be undone.")) {
      setApiKeys(apiKeys.filter(k => k.id !== id));
    }
  };

  const copyToClipboard = (key: string, id: string) => {
    navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredKeys = apiKeys.filter(k =>
    k.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    k.environment.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getEnvVariant = (env: string) => {
    const map: Record<string, "default" | "secondary" | "outline"> = {
      production: "default",
      staging: "secondary",
      development: "outline",
    };
    return map[env] || "outline";
  };

  return (
    <div className="min-h-screen bg-gradient-warm">
      <AppLayoutModern>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground">API Keys</h1>
              <p className="mt-2 text-muted-foreground">Manage API keys for your organization.</p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-5 w-5" />
              <span>Create New Key</span>
            </Button>
          </div>

          <motion.div variants={slideUp} className="mb-6 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search API keys..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-transparent text-foreground"
            />
          </motion.div>

          <motion.div variants={slideUp} className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : filteredKeys.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No API keys found. Create one to get started.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-background">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Environment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">API Key</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Last Used</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {filteredKeys.map((key) => (
                    <tr key={key.id} className="hover:bg-background transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                        {key.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={getEnvVariant(key.environment)}>
                          {key.environment}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-muted-foreground">
                        {key.key.substring(0, 12)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {new Date(key.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {key.lastUsed ? new Date(key.lastUsed).toLocaleDateString() : "Never"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(key.key, key.id)}
                          title="Copy API key"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => revokeApiKey(key.id)}
                          title="Revoke key"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        {copiedId === key.id && (
                          <span className="ml-2 text-xs text-[color:var(--green)]">Copied!</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </motion.div>

          {showCreateModal && (
            <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-card rounded-lg p-6 w-full max-w-md border border-border shadow-xl"
              >
                <h2 className="text-xl font-bold text-foreground mb-4">Create New API Key</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Key Name</label>
                    <input
                      type="text"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="e.g., Production API Key"
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Environment</label>
                    <select
                      value={newKeyEnv}
                      onChange={(e) => setNewKeyEnv(e.target.value as any)}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 text-foreground"
                    >
                      <option value="development">Development</option>
                      <option value="staging">Staging</option>
                      <option value="production">Production</option>
                    </select>
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      variant="ghost"
                      onClick={() => setShowCreateModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={createApiKey}
                      disabled={!newKeyName.trim()}
                    >
                      Create Key
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      </AppLayoutModern>
    </div>
  );
}
