"use client";

import { useParams } from "next/navigation";
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
import { AppLayoutModern } from "@/components/layout/AppLayoutModern";
import { Button, Badge } from "@/components/ui";
import { motion } from "framer-motion";
import { staggerContainer, slideUp } from "@/components/ui/motion";

export default function QuickstartGuidePage() {
  return (
    <OrgGuard>
      <AppLayoutModern>
        <QuickstartContent />
      </AppLayoutModern>
    </OrgGuard>
  );
}

function QuickstartContent() {
  const params = useParams()!;
  const orgId = params.orgId as string;
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
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      {/* Hero Section */}
      <motion.div variants={slideUp} className="bg-primary text-primary-foreground -mx-6 -mt-6 sm:-mx-6 sm:-mt-6 px-6 pt-16 pb-16 mb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center space-x-3 mb-4">
            <Rocket className="h-8 w-8" />
            <span className="text-primary-foreground/70 font-medium">Quickstart Guide</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">
            Get Started in 5 Minutes
          </h1>
          <p className="text-xl text-primary-foreground/80 max-w-2xl">
            Integrate SentinelAI into your application and start monitoring AI safety with just a few lines of code.
          </p>
        </div>
      </motion.div>

      <motion.div variants={slideUp}>
        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-between overflow-x-auto gap-2">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => setCurrentStep(step.id)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition whitespace-nowrap ${
                    currentStep === step.id
                      ? "bg-primary/10 text-primary border-2 border-primary/20"
                      : currentStep > step.id
                      ? "bg-green-50 text-green-700"
                      : "bg-card text-muted-foreground border border-border"
                  }`}
                >
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      currentStep === step.id
                        ? "bg-primary text-primary-foreground"
                        : currentStep > step.id
                        ? "bg-[color:var(--green)] text-primary-foreground"
                        : "bg-muted text-muted-foreground"
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
                  <ArrowRight className="h-5 w-5 text-muted-foreground mx-4 flex-shrink-0" />
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
              <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Key className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">Get Your API Key</h2>
                    <p className="text-muted-foreground">Create an API key to authenticate your requests</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <p className="text-foreground font-medium">Navigate to API Keys</p>
                      <p className="text-muted-foreground text-sm">
                        Go to the{" "}
                        <Link
                          href={`/org/${orgId}/api-keys`}
                          className="text-primary hover:underline font-medium"
                        >
                          API Keys
                        </Link>{" "}
                        section in your organization settings.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <p className="text-foreground font-medium">Create New Key</p>
                      <p className="text-muted-foreground text-sm">
                        Click &quot;Generate New Key&quot;, give it a name (e.g., &quot;Production&quot;), and copy the key.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      <p className="text-foreground font-medium">Secure Your Key</p>
                      <p className="text-muted-foreground text-sm">
                        Store the key securely in environment variables. Never commit it to version control.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-amber-800 text-sm">
                    <strong>Tip:</strong> The API key is shown only once. If you lose it, you&apos;ll need to generate a new one.
                  </p>
                </div>

                <div className="mt-6 flex justify-end">
                  <Button onClick={() => setCurrentStep(2)}>
                    <span>Next: Install SDK</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Install SDK */}
            {currentStep === 2 && (
              <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Code className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">Install the SDK</h2>
                    <p className="text-muted-foreground">Choose your preferred language and install</p>
                  </div>
                </div>

                {/* Python */}
                <div className="mb-6">
                  <div className="flex items-center space-x-2 mb-3">
                    <Terminal className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">Python</h3>
                    <Badge variant="secondary">3.8+</Badge>
                  </div>
                  <div className="bg-muted border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-muted-foreground text-sm">pip</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyCode(pythonInstall, "pip")}
                      >
                        {copiedSnippet === "pip" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <code className="text-green-400 text-sm">{pythonInstall}</code>
                  </div>
                </div>

                {/* Node.js */}
                <div className="mb-6">
                  <div className="flex items-center space-x-2 mb-3">
                    <FileCode className="h-5 w-5 text-[color:var(--green)]" />
                    <h3 className="text-lg font-semibold text-foreground">Node.js</h3>
                    <Badge variant="secondary">14+</Badge>
                  </div>
                  <div className="bg-muted border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-muted-foreground text-sm">npm</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyCode(nodeInstall, "npm")}
                      >
                        {copiedSnippet === "npm" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <code className="text-green-400 text-sm">{nodeInstall}</code>
                  </div>
                </div>

                {/* cURL */}
                <div className="mb-6">
                  <div className="flex items-center space-x-2 mb-3">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-lg font-semibold text-foreground">cURL (Raw HTTP)</h3>
                    <Badge variant="secondary">Any language</Badge>
                  </div>
                  <p className="text-muted-foreground text-sm mb-2">
                    No SDK required - use any HTTP client to make API calls directly.
                  </p>
                </div>

                <div className="flex justify-between">
                  <Button variant="ghost" onClick={() => setCurrentStep(1)}>
                    ← Back
                  </Button>
                  <Button onClick={() => setCurrentStep(3)}>
                    <span>Next: First API Call</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: First Call */}
            {currentStep === 3 && (
              <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="h-10 w-10 rounded-lg bg-[color:var(--green-bg)] text-[color:var(--green)] flex items-center justify-center">
                    <Play className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">Make Your First Call</h2>
                    <p className="text-muted-foreground">Analyze a prompt for safety risks</p>
                  </div>
                </div>

                {/* Python Example */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-foreground mb-3">Python Example</h3>
                  <div className="bg-muted border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-muted-foreground text-sm">example.py</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyCode(pythonQuickStart, "python-full")}
                      >
                        {copiedSnippet === "python-full" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <pre className="text-green-400 text-sm overflow-x-auto">
                      <code>{pythonQuickStart}</code>
                    </pre>
                  </div>
                </div>

                {/* Node Example */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-foreground mb-3">Node.js Example</h3>
                  <div className="bg-muted border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-muted-foreground text-sm">example.js</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyCode(nodeQuickStart, "node-full")}
                      >
                        {copiedSnippet === "node-full" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <pre className="text-green-400 text-sm overflow-x-auto">
                      <code>{nodeQuickStart}</code>
                    </pre>
                  </div>
                </div>

                {/* cURL Example */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-foreground mb-3">cURL Example</h3>
                  <div className="bg-muted border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-muted-foreground text-sm">Terminal</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyCode(curlExample, "curl-full")}
                      >
                        {copiedSnippet === "curl-full" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <pre className="text-green-400 text-sm overflow-x-auto">
                      <code>{curlExample}</code>
                    </pre>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button variant="ghost" onClick={() => setCurrentStep(2)}>
                    ← Back
                  </Button>
                  <Button onClick={() => setCurrentStep(4)}>
                    <span>Next: Verify Integration</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Verify */}
            {currentStep === 4 && (
              <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="h-10 w-10 rounded-lg bg-[color:var(--green-bg)] text-[color:var(--green)] flex items-center justify-center">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">Verify Integration</h2>
                    <p className="text-muted-foreground">Confirm everything is working correctly</p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center space-x-3 p-4 bg-[color:var(--green-bg)] border border-[color:var(--green-soft)] rounded-lg">
                    <CheckCircle className="h-5 w-5 text-[color:var(--green)]" />
                    <span className="text-[color:var(--green)]">API key is configured correctly</span>
                  </div>
                  <div className="flex items-center space-x-3 p-4 bg-[color:var(--green-bg)] border border-[color:var(--green-soft)] rounded-lg">
                    <CheckCircle className="h-5 w-5 text-[color:var(--green)]" />
                    <span className="text-[color:var(--green)]">SDK installed successfully</span>
                  </div>
                  <div className="flex items-center space-x-3 p-4 bg-[color:var(--green-bg)] border border-[color:var(--green-soft)] rounded-lg">
                    <CheckCircle className="h-5 w-5 text-[color:var(--green)]" />
                    <span className="text-[color:var(--green)]">First API call returned 200 OK</span>
                  </div>
                </div>

                <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg mb-6">
                  <h4 className="font-semibold text-primary mb-2">Expected Response</h4>
                  <pre className="text-sm text-primary bg-primary/[0.06] p-3 rounded">
{`{
  "risk_score": 0.23,
  "risk_level": "low",
  "flags": ["safe_content"],
  "recommendation": "Safe to proceed"
}`}
                  </pre>
                </div>

                <div className="flex justify-between">
                  <Button variant="ghost" onClick={() => setCurrentStep(3)}>
                    ← Back
                  </Button>
                  <Button asChild>
                    <Link href={`/org/${orgId}/dashboard`}>
                      <span>Go to Dashboard</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Resources */}
            <div className="bg-card rounded-lg shadow-sm border border-border p-6">
              <h3 className="font-semibold text-foreground mb-4">Resources</h3>
              <ul className="space-y-3">
                <li>
                  <Link href={`/org/${orgId}/docs`} className="text-primary hover:underline flex items-center">
                    <FileCode className="h-4 w-4 mr-2" />
                    Full Documentation
                  </Link>
                </li>
                <li>
                  <Link href={`/org/${orgId}/api-keys`} className="text-primary hover:underline flex items-center">
                    <Key className="h-4 w-4 mr-2" />
                    Manage API Keys
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="font-semibold text-foreground mb-2">Need Help?</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Having trouble? Check the docs or contact support.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href={`/org/${orgId}/docs`}>
                  View API Reference
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
