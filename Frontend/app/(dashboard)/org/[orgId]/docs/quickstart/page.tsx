"use client";

import { useParams } from "next/navigation";
import { useOrganization } from "@/contexts/organization-context";
import { OrgGuard } from "@/components/guards/user-org-guards";
import { 
  Rocket, 
  Key, 
  Code, 
  Play, 
  CheckCircle, 
  ArrowRight,
  Copy,
  Check,
  Terminal,
  FileCode,
  Globe
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export default function QuickstartGuidePage() {
  return (
    <OrgGuard>
      <QuickstartContent />
    </OrgGuard>
  );
}

function QuickstartContent() {
  const params = useParams();
  const orgId = params.orgId as string;
  const { activeOrganization } = useOrganization();
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const pythonInstall = `pip install sentinelai`;

  const pythonQuickStart = `from sentinelai import SentinelClient

# Initialize client
client = SentinelClient(api_key="your-api-key")

# Analyze a prompt
result = client.analyze(
    prompt="Your prompt here",
    model="gpt-4"
)

print(f"Risk Score: {result.risk_score}")
print(f"Risk Level: {result.risk_level}")
print(f"Flags: {result.flags})`;

  const nodeInstall = `npm install @sentinelai/sdk`;

  const nodeQuickStart = `import { SentinelClient } from '@sentinelai/sdk';

// Initialize client
const client = new SentinelClient({
  apiKey: 'your-api-key'
});

// Analyze a prompt
const result = await client.analyze({
  prompt: 'Your prompt here',
  model: 'gpt-4'
});

console.log('Risk Score:', result.riskScore);
console.log('Risk Level:', result.riskLevel);
console.log('Flags:', result.flags);`;

  const curlExample = `curl -X POST https://api.sentinelai.io/v1/analyze \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Your prompt here",
    "model": "gpt-4",
    "response": "Optional model response"
  }'`;

  const steps = [
    {
      id: 1,
      title: "Get API Key",
      description: "Generate an API key from your organization settings",
      icon: Key,
    },
    {
      id: 2,
      title: "Install SDK",
      description: "Install the SentinelAI SDK for your language",
      icon: Code,
    },
    {
      id: 3,
      title: "Make First Call",
      description: "Send your first risk analysis request",
      icon: Play,
    },
    {
      id: 4,
      title: "Verify Integration",
      description: "Confirm everything is working correctly",
      icon: CheckCircle,
    },
  ];

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
              <a href={`/org/${orgId}/docs`} className="text-blue-600 font-medium">Docs</a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center space-x-3 mb-4">
            <Rocket className="h-8 w-8" />
            <span className="text-blue-200 font-medium">Quickstart Guide</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">
            Get Started in 5 Minutes
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl">
            Integrate SentinelAI into your application and start monitoring AI safety with just a few lines of code.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => setCurrentStep(step.id)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                    currentStep === step.id
                      ? "bg-blue-50 text-blue-700 border-2 border-blue-200"
                      : currentStep > step.id
                      ? "bg-green-50 text-green-700"
                      : "bg-white text-gray-600 border border-gray-200"
                  }`}
                >
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      currentStep === step.id
                        ? "bg-blue-600 text-white"
                        : currentStep > step.id
                        ? "bg-green-600 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {currentStep > step.id ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <step.icon className="h-4 w-4" />
                    )}
                  </div>
                  <div className="text-left">
                    <div className="font-medium">Step {step.id}</div>
                    <div className="text-xs opacity-75">{step.title}</div>
                  </div>
                </button>
                {index < steps.length - 1 && (
                  <ArrowRight className="h-5 w-5 text-gray-400 mx-4" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: API Key */}
            {currentStep === 1 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Key className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Get Your API Key</h2>
                    <p className="text-gray-600">Create an API key to authenticate your requests</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <p className="text-gray-900 font-medium">Navigate to API Keys</p>
                      <p className="text-gray-600 text-sm">
                        Go to the{" "}
                        <Link
                          href={`/org/${orgId}/api-keys`}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          API Keys
                        </Link>{" "}
                        section in your organization settings.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <p className="text-gray-900 font-medium">Create New Key</p>
                      <p className="text-gray-600 text-sm">
                        Click "Generate New Key", give it a name (e.g., "Production"), and copy the key.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      <p className="text-gray-900 font-medium">Secure Your Key</p>
                      <p className="text-gray-600 text-sm">
                        Store the key securely in environment variables. Never commit it to version control.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-amber-800 text-sm">
                    <strong>Tip:</strong> The API key is shown only once. If you lose it, you'll need to generate a new one.
                  </p>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                  >
                    <span>Next: Install SDK</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Install SDK */}
            {currentStep === 2 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="h-10 w-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                    <Code className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Install the SDK</h2>
                    <p className="text-gray-600">Choose your preferred language and install</p>
                  </div>
                </div>

                {/* Python */}
                <div className="mb-6">
                  <div className="flex items-center space-x-2 mb-3">
                    <Terminal className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Python</h3>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">3.8+</span>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400 text-sm">pip</span>
                      <button
                        onClick={() => copyCode(pythonInstall, "pip")}
                        className="text-gray-400 hover:text-white"
                      >
                        {copiedSnippet === "pip" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                    <code className="text-green-400 text-sm">{pythonInstall}</code>
                  </div>
                </div>

                {/* Node.js */}
                <div className="mb-6">
                  <div className="flex items-center space-x-2 mb-3">
                    <FileCode className="h-5 w-5 text-green-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Node.js</h3>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">14+</span>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400 text-sm">npm</span>
                      <button
                        onClick={() => copyCode(nodeInstall, "npm")}
                        className="text-gray-400 hover:text-white"
                      >
                        {copiedSnippet === "npm" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                    <code className="text-green-400 text-sm">{nodeInstall}</code>
                  </div>
                </div>

                {/* cURL */}
                <div className="mb-6">
                  <div className="flex items-center space-x-2 mb-3">
                    <Globe className="h-5 w-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">cURL (Raw HTTP)</h3>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">Any language</span>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">
                    No SDK required - use any HTTP client to make API calls directly.
                  </p>
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="px-6 py-2 text-gray-600 hover:text-gray-900"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                  >
                    <span>Next: First API Call</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: First Call */}
            {currentStep === 3 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="h-10 w-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                    <Play className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Make Your First Call</h2>
                    <p className="text-gray-600">Analyze a prompt for safety risks</p>
                  </div>
                </div>

                {/* Python Example */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Python Example</h3>
                  <div className="bg-gray-900 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400 text-sm">example.py</span>
                      <button
                        onClick={() => copyCode(pythonQuickStart, "python-full")}
                        className="text-gray-400 hover:text-white"
                      >
                        {copiedSnippet === "python-full" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                    <pre className="text-green-400 text-sm overflow-x-auto">
                      <code>{pythonQuickStart}</code>
                    </pre>
                  </div>
                </div>

                {/* Node Example */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Node.js Example</h3>
                  <div className="bg-gray-900 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400 text-sm">example.js</span>
                      <button
                        onClick={() => copyCode(nodeQuickStart, "node-full")}
                        className="text-gray-400 hover:text-white"
                      >
                        {copiedSnippet === "node-full" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                    <pre className="text-green-400 text-sm overflow-x-auto">
                      <code>{nodeQuickStart}</code>
                    </pre>
                  </div>
                </div>

                {/* cURL Example */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">cURL Example</h3>
                  <div className="bg-gray-900 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400 text-sm">Terminal</span>
                      <button
                        onClick={() => copyCode(curlExample, "curl-full")}
                        className="text-gray-400 hover:text-white"
                      >
                        {copiedSnippet === "curl-full" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                    <pre className="text-green-400 text-sm overflow-x-auto">
                      <code>{curlExample}</code>
                    </pre>
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="px-6 py-2 text-gray-600 hover:text-gray-900"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => setCurrentStep(4)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                  >
                    <span>Next: Verify Integration</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Verify */}
            {currentStep === 4 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="h-10 w-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Verify Integration</h2>
                    <p className="text-gray-600">Confirm everything is working correctly</p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-green-800">API key is configured correctly</span>
                  </div>
                  <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-green-800">SDK installed successfully</span>
                  </div>
                  <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-green-800">First API call returned 200 OK</span>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
                  <h4 className="font-semibold text-blue-900 mb-2">Expected Response</h4>
                  <pre className="text-sm text-blue-800 bg-blue-100 p-3 rounded">
{`{
  "risk_score": 0.23,
  "risk_level": "low",
  "flags": ["safe_content"],
  "recommendation": "Safe to proceed"
}`}
                  </pre>
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="px-6 py-2 text-gray-600 hover:text-gray-900"
                  >
                    ← Back
                  </button>
                  <Link
                    href={`/org/${orgId}/dashboard`}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
                  >
                    <span>Go to Dashboard</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Resources */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Resources</h3>
              <ul className="space-y-3">
                <li>
                  <Link href={`/org/${orgId}/docs`} className="text-blue-600 hover:underline flex items-center">
                    <FileCode className="h-4 w-4 mr-2" />
                    Full Documentation
                  </Link>
                </li>
                <li>
                  <Link href={`/org/${orgId}/api-keys`} className="text-blue-600 hover:underline flex items-center">
                    <Key className="h-4 w-4 mr-2" />
                    Manage API Keys
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Need Help?</h3>
              <p className="text-gray-600 text-sm mb-4">
                Having trouble? Check the docs or contact support.
              </p>
              <Link
                href={`/org/${orgId}/docs`}
                className="block w-full text-center px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition"
              >
                View API Reference
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
