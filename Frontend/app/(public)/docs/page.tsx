import type { Metadata } from 'next'
import Link from 'next/link'
import { 
  BookOpen, 
  Code2, 
  Terminal, 
  Shield, 
  Zap,
  ChevronRight,
  ExternalLink,
  Github
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'SentinelAI SDK Documentation',
  description: 'Learn how to integrate SentinelAI into your applications for AI risk monitoring',
}

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gradient-navy">
      {/* Header */}
      <header className="border-b border-white/10 bg-background/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-foreground">SentinelAI</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link 
              href="https://github.com/sentinel-ai/sdk" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-muted hover:text-foreground transition-colors"
            >
              <Github className="w-5 h-5" />
            </Link>
            <Link href="/dashboard">
              <span className="text-sm text-muted hover:text-foreground transition-colors">
                Dashboard →
              </span>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Title */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              SentinelAI SDK Documentation
            </h1>
            <p className="text-lg text-muted max-w-2xl mx-auto">
              Integrate AI risk monitoring into your applications with our easy-to-use SDK
            </p>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <DocCard
              href="#installation"
              icon={Terminal}
              title="Installation"
              description="Get started with the SDK in minutes"
            />
            <DocCard
              href="#quick-start"
              icon={Zap}
              title="Quick Start"
              description="Your first AI risk analysis"
            />
            <DocCard
              href="#api-reference"
              icon={Code2}
              title="API Reference"
              description="Complete SDK documentation"
            />
          </div>

          {/* Content */}
          <div className="space-y-12">
            {/* Installation */}
            <section id="installation" className="scroll-mt-20">
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Terminal className="w-6 h-6 text-indigo-400" />
                Installation
              </h2>
              <div className="prose prose-invert max-w-none">
                <p className="text-muted">
                  Install the SentinelAI SDK using your preferred package manager:
                </p>
                <div className="bg-black/50 rounded-lg p-4 my-4 border border-white/10">
                  <code className="text-sm font-mono text-green-400">
                    npm install @sentinel-ai/sdk
                  </code>
                </div>
                <div className="bg-black/50 rounded-lg p-4 my-4 border border-white/10">
                  <code className="text-sm font-mono text-green-400">
                    yarn add @sentinel-ai/sdk
                  </code>
                </div>
                <div className="bg-black/50 rounded-lg p-4 my-4 border border-white/10">
                  <code className="text-sm font-mono text-green-400">
                    pip install sentinel-ai
                  </code>
                </div>
              </div>
            </section>

            {/* Quick Start */}
            <section id="quick-start" className="scroll-mt-20">
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Zap className="w-6 h-6 text-yellow-400" />
                Quick Start
              </h2>
              <div className="prose prose-invert max-w-none">
                <p className="text-muted">
                  Initialize the SDK and analyze your first AI interaction:
                </p>
                <div className="bg-black/50 rounded-lg p-4 my-4 border border-white/10">
                  <pre className="text-sm font-mono text-blue-300 overflow-x-auto">
{`import { SentinelAI } from '@sentinel-ai/sdk';

// Initialize with your API key
const sentinel = new SentinelAI({
  apiKey: 'sk_live_your_api_key_here',
  organizationId: 'your_org_id'
});

// Analyze an AI interaction
const result = await sentinel.analyze({
  prompt: 'User prompt text',
  response: 'AI response text',
  userId: 'user_123',      // Optional: for tracking
  sessionId: 'sess_456'    // Optional: for grouping
});

console.log('Risk Score:', result.final_risk_score);
console.log('Decision:', result.decision);
console.log('Flags:', result.flags);`}
                  </pre>
                </div>
              </div>
            </section>

            {/* Configuration */}
            <section id="configuration" className="scroll-mt-20">
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-purple-400" />
                Configuration
              </h2>
              <div className="prose prose-invert max-w-none">
                <p className="text-muted">
                  Configure the SDK with your organization's settings:
                </p>
                <div className="bg-black/50 rounded-lg p-4 my-4 border border-white/10">
                  <pre className="text-sm font-mono text-blue-300 overflow-x-auto">
{`const sentinel = new SentinelAI({
  apiKey: process.env.SENTINEL_API_KEY,
  organizationId: process.env.SENTINEL_ORG_ID,
  
  // Optional: Custom configuration
  timeout: 5000,              // Request timeout in ms
  retries: 3,                 // Number of retries
  endpoint: 'https://api.sentinel-ai.com', // Custom endpoint
  
  // Optional: Callbacks
  onError: (error) => {
    console.error('SentinelAI Error:', error);
  },
  
  onDetection: (result) => {
    if (result.decision === 'block') {
      // Handle blocked content
    }
  }
});`}
                  </pre>
                </div>
              </div>
            </section>

            {/* Real-time Monitoring */}
            <section id="real-time" className="scroll-mt-20">
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Shield className="w-6 h-6 text-green-400" />
                Real-time Monitoring
              </h2>
              <div className="prose prose-invert max-w-none">
                <p className="text-muted">
                  Set up real-time monitoring for streaming AI responses:
                </p>
                <div className="bg-black/50 rounded-lg p-4 my-4 border border-white/10">
                  <pre className="text-sm font-mono text-blue-300 overflow-x-auto">
{`// Enable real-time monitoring
sentinel.enableRealTimeMonitoring({
  // Called when risk is detected mid-stream
  onRiskDetected: (result, context) => {
    console.warn('Risk detected:', result.flags);
    
    // Optionally block the stream
    if (result.decision === 'block') {
      context.stopStream();
    }
  },
  
  // Called when compliance issues are detected
  onComplianceIssue: (result) => {
    console.error('Model compliance:', result.explanation);
  }
});

// Use with streaming AI APIs
const stream = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: prompt }],
  stream: true,
});

// Wrap the stream with SentinelAI monitoring
const monitoredStream = sentinel.monitorStream(stream, {
  prompt: prompt,
  userId: 'user_123'
});

for await (const chunk of monitoredStream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}`}
                  </pre>
                </div>
              </div>
            </section>

            {/* API Reference */}
            <section id="api-reference" className="scroll-mt-20">
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Code2 className="w-6 h-6 text-pink-400" />
                API Reference
              </h2>
              <div className="prose prose-invert max-w-none">
                <div className="space-y-6">
                  <div className="border border-white/10 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      <code className="text-indigo-400">analyze(options)</code>
                    </h3>
                    <p className="text-muted text-sm mb-3">
                      Analyze a prompt/response pair for potential risks.
                    </p>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-2 text-muted">Parameter</th>
                          <th className="text-left py-2 text-muted">Type</th>
                          <th className="text-left py-2 text-muted">Required</th>
                          <th className="text-left py-2 text-muted">Description</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        <tr className="border-b border-white/5">
                          <td className="py-2 font-mono text-blue-300">prompt</td>
                          <td className="py-2 text-muted">string</td>
                          <td className="py-2 text-green-400">Yes</td>
                          <td className="py-2 text-muted">User input prompt</td>
                        </tr>
                        <tr className="border-b border-white/5">
                          <td className="py-2 font-mono text-blue-300">response</td>
                          <td className="py-2 text-muted">string</td>
                          <td className="py-2 text-green-400">Yes</td>
                          <td className="py-2 text-muted">AI response text</td>
                        </tr>
                        <tr className="border-b border-white/5">
                          <td className="py-2 font-mono text-blue-300">userId</td>
                          <td className="py-2 text-muted">string</td>
                          <td className="py-2 text-yellow-400">No</td>
                          <td className="py-2 text-muted">User identifier</td>
                        </tr>
                        <tr>
                          <td className="py-2 font-mono text-blue-300">sessionId</td>
                          <td className="py-2 text-muted">string</td>
                          <td className="py-2 text-yellow-400">No</td>
                          <td className="py-2 text-muted">Session identifier</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="border border-white/10 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      <code className="text-indigo-400">getMetrics()</code>
                    </h3>
                    <p className="text-muted text-sm mb-3">
                      Retrieve usage metrics for your organization.
                    </p>
                    <div className="bg-black/30 rounded p-3">
                      <pre className="text-sm font-mono text-blue-300">
{`const metrics = await sentinel.getMetrics({
  days: 30  // Time range
});

console.log(metrics.total_requests);
console.log(metrics.avg_latency_ms);
console.log(metrics.risk_distribution);`}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Examples */}
            <section id="examples" className="scroll-mt-20">
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Code2 className="w-6 h-6 text-cyan-400" />
                Integration Examples
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ExampleCard
                  title="Chatbot Integration"
                  description="Protect your customer support chatbot from prompt injection"
                  href="#chatbot-example"
                />
                <ExampleCard
                  title="Content Generation"
                  description="Monitor AI-generated content for compliance issues"
                  href="#content-example"
                />
                <ExampleCard
                  title="Code Assistant"
                  description="Secure your AI coding assistant from malicious requests"
                  href="#code-example"
                />
                <ExampleCard
                  title="API Gateway"
                  description="Add SentinelAI as middleware to your API"
                  href="#gateway-example"
                />
              </div>
            </section>
          </div>

          {/* Footer */}
          <footer className="mt-16 pt-8 border-t border-white/10 text-center">
            <p className="text-muted text-sm">
              Need help? Contact us at{' '}
              <a href="mailto:support@sentinel-ai.com" className="text-indigo-400 hover:underline">
                support@sentinel-ai.com
              </a>
            </p>
          </footer>
        </div>
      </div>
    </div>
  )
}

function DocCard({ 
  href, 
  icon: Icon, 
  title, 
  description 
}: { 
  href: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string 
}) {
  return (
    <a
      href={href}
      className="block p-6 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-indigo-500/30 transition-all duration-200 group"
    >
      <div className="flex items-start gap-4">
        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground group-hover:text-indigo-400 transition-colors">
            {title}
          </h3>
          <p className="text-sm text-muted mt-1">{description}</p>
        </div>
      </div>
    </a>
  )
}

function ExampleCard({ 
  title, 
  description, 
  href 
}: { 
  title: string
  description: string
  href: string 
}) {
  return (
    <a
      href={href}
      className="block p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-200 group"
    >
      <h4 className="font-medium text-foreground group-hover:text-indigo-400 transition-colors">
        {title}
      </h4>
      <p className="text-sm text-muted mt-1">{description}</p>
      <div className="flex items-center gap-1 mt-3 text-sm text-indigo-400">
        View example <ChevronRight className="w-4 h-4" />
      </div>
    </a>
  )
}
