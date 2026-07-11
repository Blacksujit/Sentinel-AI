"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { OrgGuard } from "@/components/guards/user-org-guards";
import { Book, Code, Terminal, Copy, Check } from "lucide-react";
import { AppLayoutModern } from "@/components/layout/AppLayoutModern";
import { Button, Badge } from "@/components/ui";
import { motion } from "framer-motion";
import { staggerContainer, slideUp } from "@/components/ui/motion";

export default function OrgDocsPage() {
  return (
    <OrgGuard>
      <AppLayoutModern>
        <DocsContent />
      </AppLayoutModern>
    </OrgGuard>
  );
}

function DocsContent() {
  const params = useParams()!;
  const orgId = params.orgId as string;
  const [activeTab, setActiveTab] = useState("quickstart");
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const pythonExample = `import requests

# Analyze text for risks
response = requests.post(
    "https://api.sentinelai.io/v1/analyze",
    headers={
        "Authorization": "Bearer YOUR_API_KEY",
        "Content-Type": "application/json"
    },
    json={
        "prompt": "Your prompt here",
        "model": "gpt-4"
    }
)

result = response.json()
print(f"Risk Score: {result['risk_score']}")
print(f"Risk Level: {result['risk_level']}")`;

  const jsExample = `const response = await fetch('https://api.sentinelai.io/v1/analyze', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: 'Your prompt here',
    model: 'gpt-4'
  })
});

const result = await response.json();
console.log('Risk Score:', result.risk_score);
console.log('Risk Level:', result.risk_level);`;

  const curlExample = `curl -X POST https://api.sentinelai.io/v1/analyze \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Your prompt here",
    "model": "gpt-4"
  }'`;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      <motion.div variants={slideUp} className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Documentation</h1>
        <p className="mt-2 text-muted-foreground">SDK integration guides and API reference for developers.</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <motion.div variants={slideUp} className="lg:col-span-1">
          <nav className="space-y-1">
            {[
              { id: "quickstart", label: "Quick Start", icon: Terminal },
              { id: "sdk", label: "SDK Installation", icon: Code },
              { id: "api", label: "API Reference", icon: Book },
              { id: "examples", label: "Examples", icon: Code },
            ].map((item) => (
              <Button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                variant="ghost"
                className={`w-full justify-start gap-3 h-auto px-3 py-2 ${
                  activeTab === item.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Button>
            ))}
          </nav>
        </motion.div>

        <motion.div variants={slideUp} className="lg:col-span-3 space-y-6">
          {activeTab === "quickstart" && (
            <div className="bg-card rounded-lg shadow-sm border border-border p-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">Quick Start Guide</h2>
              <p className="text-muted-foreground mb-6">
                Get started with SentinelAI in minutes. Follow these steps to integrate AI safety monitoring into your application.
              </p>

              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">1</div>
                  <div>
                    <h3 className="font-semibold text-foreground">Get your API key</h3>
                    <p className="text-muted-foreground mt-1">
                      Go to <a href={`/org/${orgId}/api-keys`} className="text-primary hover:underline">API Keys</a> and create a new API key for your environment.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">2</div>
                  <div>
                    <h3 className="font-semibold text-foreground">Install the SDK</h3>
                    <p className="text-muted-foreground mt-1 mb-3">Choose your language and install the SentinelAI SDK:</p>

                    <div className="bg-muted border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-muted-foreground text-sm">Python</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyCode("pip install sentinelai", "pip")}
                        >
                          {copiedSnippet === "pip" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      <code className="text-green-400 text-sm">pip install sentinelai</code>
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">3</div>
                  <div>
                    <h3 className="font-semibold text-foreground">Make your first API call</h3>
                    <p className="text-muted-foreground mt-1 mb-3">Use one of the examples below to analyze your first prompt:</p>

                    <div className="bg-muted border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-muted-foreground text-sm">Python</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyCode(pythonExample, "python")}
                        >
                          {copiedSnippet === "python" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      <pre className="text-green-400 text-sm overflow-x-auto"><code>{pythonExample}</code></pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "sdk" && (
            <div className="bg-card rounded-lg shadow-sm border border-border p-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">SDK Installation</h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Python SDK</h3>
                  <div className="bg-muted border border-border rounded-lg p-4 mb-3">
                    <code className="text-green-400 text-sm">pip install sentinelai</code>
                  </div>
                  <p className="text-muted-foreground">Supports Python 3.8+</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">JavaScript/Node.js SDK</h3>
                  <div className="bg-muted border border-border rounded-lg p-4 mb-3">
                    <code className="text-green-400 text-sm">npm install @sentinelai/sdk</code>
                  </div>
                  <p className="text-muted-foreground">Supports Node.js 14+ and modern browsers</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "api" && (
            <div className="bg-card rounded-lg shadow-sm border border-border p-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">API Reference</h2>

              <div className="space-y-6">
                <div className="border-b border-border pb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold">POST</Badge>
                    <code className="text-sm text-foreground">/v1/analyze</code>
                  </div>
                  <p className="text-muted-foreground">Analyze a prompt for potential risks and safety concerns.</p>
                </div>

                <div className="border-b border-border pb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 font-bold">GET</Badge>
                    <code className="text-sm text-foreground">/v1/logs</code>
                  </div>
                  <p className="text-muted-foreground">Retrieve risk analysis logs for your organization.</p>
                </div>

                <div className="border-b border-border pb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold">POST</Badge>
                    <code className="text-sm text-foreground">/v1/baselines</code>
                  </div>
                  <p className="text-muted-foreground">Create or update risk baseline configurations.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "examples" && (
            <div className="bg-card rounded-lg shadow-sm border border-border p-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">Code Examples</h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Python</h3>
                  <div className="bg-muted border border-border rounded-lg p-4 relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyCode(pythonExample, "ex-python")}
                      className="absolute top-2 right-2"
                    >
                      {copiedSnippet === "ex-python" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <pre className="text-green-400 text-sm overflow-x-auto"><code>{pythonExample}</code></pre>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">JavaScript</h3>
                  <div className="bg-muted border border-border rounded-lg p-4 relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyCode(jsExample, "ex-js")}
                      className="absolute top-2 right-2"
                    >
                      {copiedSnippet === "ex-js" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <pre className="text-green-400 text-sm overflow-x-auto"><code>{jsExample}</code></pre>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">cURL</h3>
                  <div className="bg-muted border border-border rounded-lg p-4 relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyCode(curlExample, "ex-curl")}
                      className="absolute top-2 right-2"
                    >
                      {copiedSnippet === "ex-curl" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <pre className="text-green-400 text-sm overflow-x-auto"><code>{curlExample}</code></pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
