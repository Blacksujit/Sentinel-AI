"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Building2, Users, Plus, Settings, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { apiPost } from '@/lib/api-client';
import { useAuth } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import { useWorkspace, useWorkspaces, useActiveWorkspace } from '@/contexts/workspace-context';
import { useOrgContext } from '@/contexts/organization-context';

export default function WorkspacesPage() {
  const { workspaces, isLoading } = useWorkspaces();
  const activeWorkspace = useActiveWorkspace();
  const { getToken } = useAuth();
  const router = useRouter();
  const params = useParams();
  const orgId = typeof params?.orgId === 'string' ? params.orgId : Array.isArray(params?.orgId) ? params.orgId[0] : undefined;
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { refreshWorkspaces } = useWorkspace();

  const handleCreateWorkspace = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const wsName = name;
    const wsDescription = description;
    try {
      const token = await getToken();
      if (!orgId) {
        toast.error('Organization not found');
        return;
      }

      await apiPost(
        '/api/workspaces',
        {
          org_id: orgId,
          name: wsName,
          description: wsDescription,
        },
        token
      );

      setShowCreateDialog(false);
      toast.success('Workspace created successfully');
      await refreshWorkspaces();
      setName('');
      setDescription('');
    } catch (error) {
      console.error('Failed to create workspace:', error);
      toast.error('Failed to create workspace');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Building2 className="w-8 h-8 text-primary" />
            Workspaces
          </h1>
          <p className="text-muted-foreground">
            Manage your team workspaces and collaborate on AI risk monitoring
          </p>
        </div>
        
        <Button
          onClick={() => setShowCreateDialog(true)}
          className=""
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Workspace
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {workspaces.map((workspace) => (
          <motion.div
            key={workspace.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            className="cursor-pointer"
            onClick={() => router.push(`/org/${orgId}/dashboard/workspaces/${workspace.id}`)}
          >
            <Card className="card-premium border-border hover:border-primary/40 hover:bg-card transition-all duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Settings className="w-5 h-5 text-primary" />
                  {workspace.name}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {workspace.member_count || 0} members
                  </span>
                  {workspace.is_default && (
                    <span className="ml-2 px-2 py-1 bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 text-xs rounded-full">
                      Default
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  {workspace.description || 'No description provided'}
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>Created {new Date(workspace.created_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {showCreateDialog && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-6"
        >
          <div className="bg-background text-foreground border border-border rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Create New Workspace</h2>
            <form onSubmit={handleCreateWorkspace}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    placeholder="Enter workspace name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    placeholder="Enter workspace description"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowCreateDialog(false);
                    setName('');
                    setDescription('');
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Create Workspace
                </Button>
              </div>
            </form>
          </div>
        </motion.div>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-card rounded-lg animate-pulse" />
          ))}
        </div>
      )}
    </div>
  );
}
