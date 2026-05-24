export const AI_MODELS = [
  { id: 'gpt4', label: 'GPT-4 / GPT-4 Turbo', provider: 'OpenAI' },
  { id: 'gpt35', label: 'GPT-3.5 Turbo', provider: 'OpenAI' },
  { id: 'claude3', label: 'Claude 3 (Opus/Sonnet/Haiku)', provider: 'Anthropic' },
  { id: 'claude2', label: 'Claude 2', provider: 'Anthropic' },
  { id: 'llama3', label: 'Llama 3 / 3.1', provider: 'Meta' },
  { id: 'gemini', label: 'Gemini Pro / Ultra', provider: 'Google' },
  { id: 'mistral', label: 'Mistral / Mixtral', provider: 'Mistral AI' },
  { id: 'command', label: 'Command R+', provider: 'Cohere' },
  { id: 'open-source', label: 'Self-hosted / Open Source', provider: 'Self' },
  { id: 'other', label: 'Other / Custom', provider: 'Custom' },
] as const

export const VOLUME_RANGES = [
  { value: '0-1k', label: 'Less than 1,000 / day' },
  { value: '1k-10k', label: '1,000 - 10,000 / day' },
  { value: '10k-100k', label: '10,000 - 100,000 / day' },
  { value: '100k-1m', label: '100,000 - 1,000,000 / day' },
  { value: '1m+', label: 'More than 1,000,000 / day' },
] as const

export const USE_CASES = [
  { id: 'customer-facing', label: 'Customer-facing Chatbot', description: 'Support, sales, or customer interaction' },
  { id: 'internal', label: 'Internal Assistant', description: 'Employee productivity, knowledge base' },
  { id: 'code-gen', label: 'Code Generation', description: 'AI-assisted development' },
  { id: 'content-gen', label: 'Content Generation', description: 'Marketing, writing, creative' },
  { id: 'data-analysis', label: 'Data Analysis', description: 'Insights, reporting, analytics' },
  { id: 'research', label: 'Research & Development', description: 'Experimental AI applications' },
  { id: 'compliance', label: 'Compliance Monitoring', description: 'Regulatory adherence, audit' },
  { id: 'security', label: 'Security & Threat Detection', description: 'Prompt injection, abuse detection' },
] as const
