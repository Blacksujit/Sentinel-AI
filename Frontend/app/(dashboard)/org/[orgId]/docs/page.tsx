"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useOrganization } from "@/contexts/organization-context";
import { OrgGuard } from "@/components/guards/user-org-guards";
import { Book, Code, Terminal, Copy, Check } from "lucide-react";

export default function OrgDocsPage() {
  return (
    <OrgGuard>
      <DocsContent />
    </OrgGuard>
  );
}

function DocsContent() {
  const params = useParams();
  const orgId = params.orgId as string;
  const { activeOrganization } = useOrganization();
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
              <a href={`/org/${orgId}/settings`} className="text-gray-600 hover:text-gray-900">Settings</a>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Documentation</h1>
          <p className="mt-2 text-gray-600">SDK integration guides and API reference for developers.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <nav className="space-y-1">
              {[
                { id: "quickstart", label: "Quick Start", icon: Terminal },
                { id: "sdk", label: "SDK Installation", icon: Code },
                { id: "api", label: "API Reference", icon: Book },
                { id: "examples", label: "Examples", icon: Code },
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
            {activeTab === "quickstart" && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Start Guide</h2>
                <p className="text-gray-600 mb-6">
                  Get started with SentinelAI in minutes. Follow these steps to integrate AI safety monitoring into your application.
                </p>

                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">1</div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Get your API key</h3>
                      <p className="text-gray-600 mt-1">
                        Go to <a href={`/org/${orgId}/api-keys`} className="text-blue-600 hover:underline">API Keys</a> and create a new API key for your environment.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">2</div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Install the SDK</h3>
                      <p className="text-gray-600 mt-1 mb-3">Choose your language and install the SentinelAI SDK:</p>
                      
                      <div className="bg-gray-900 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400 text-sm">Python</span>
                          <button
                            onClick={() => copyCode("pip install sentinelai", "pip")}
                            className="text-gray-400 hover:text-white"
                          >
                            {copiedSnippet === "pip" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </button>
                        </div>
                        <code className="text-green-400 text-sm">pip install sentinelai</code>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">3</div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Make your first API call</h3>
                      <p className="text-gray-600 mt-1 mb-3">Use one of the examples below to analyze your first prompt:</p>
                      
                      <div className="bg-gray-900 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400 text-sm">Python</span>
                          <button
                            onClick={() => copyCode(pythonExample, "python")}
                            className="text-gray-400 hover:text-white"
                          >
                            {copiedSnippet === "python" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </button>
                        </div>
                        <pre className="text-green-400 text-sm overflow-x-auto"><code>{pythonExample}</code></pre>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "sdk" && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">SDK Installation</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Python SDK</h3>
                    <div className="bg-gray-900 rounded-lg p-4 mb-3">
                      <code className="text-green-400 text-sm">pip install sentinelai</code>
                    </div>
                    <p className="text-gray-600">Supports Python 3.8+</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">JavaScript/Node.js SDK</h3>
                    <div className="bg-gray-900 rounded-lg p-4 mb-3">
                      <code className="text-green-400 text-sm">npm install @sentinelai/sdk</code>
                    </div>
                    <p className="text-gray-600">Supports Node.js 14+ and modern browsers</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "api" && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">API Reference</h2>
                
                <div className="space-y-6">
                  <div className="border-b border-gray-200 pb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded">POST</span>
                      <code className="text-sm">/v1/analyze</code>
                    </div>
                    <p className="text-gray-600">Analyze a prompt for potential risks and safety concerns.</p>
                  </div>

                  <div className="border-b border-gray-200 pb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">GET</span>
                      <code className="text-sm">/v1/logs</code>
                    </div>
                    <p className="text-gray-600">Retrieve risk analysis logs for your organization.</p>
                  </div>

                  <div className="border-b border-gray-200 pb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded">POST</span>
                      <code className="text-sm">/v1/baselines</code>
                    </div>
                    <p className="text-gray-600">Create or update risk baseline configurations.</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "examples" && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Code Examples</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Python</h3>
                    <div className="bg-gray-900 rounded-lg p-4 relative">
                      <button
                        onClick={() => copyCode(pythonExample, "ex-python")}
                        className="absolute top-2 right-2 text-gray-400 hover:text-white"
                      >
                        {copiedSnippet === "ex-python" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                      <pre className="text-green-400 text-sm overflow-x-auto"><code>{pythonExample}</code></pre>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">JavaScript</h3>
                    <div className="bg-gray-900 rounded-lg p-4 relative">
                      <button
                        onClick={() => copyCode(jsExample, "ex-js")}
                        className="absolute top-2 right-2 text-gray-400 hover:text-white"
                      >
                        {copiedSnippet === "ex-js" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                      <pre className="text-green-400 text-sm overflow-x-auto"><code>{jsExample}</code></pre>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">cURL</h3>
                    <div className="bg-gray-900 rounded-lg p-4 relative">
                      <button
                        onClick={() => copyCode(curlExample, "ex-curl")}
                        className="absolute top-2 right-2 text-gray-400 hover:text-white"
                      >
                        {copiedSnippet === "ex-curl" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                      <pre className="text-green-400 text-sm overflow-x-auto"><code>{curlExample}</code></pre>
                    </div>
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
