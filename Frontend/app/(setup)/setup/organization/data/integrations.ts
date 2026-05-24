export interface IntegrationField {
  key: string
  label: string
  type: 'text' | 'url' | 'password' | 'select'
  placeholder?: string
  options?: string[]
}

export interface Integration {
  id: string
  label: string
  description: string
  fields: IntegrationField[]
}

export const INTEGRATIONS: Integration[] = [
  {
    id: 'slack',
    label: 'Slack',
    description: 'Receive alerts and notifications in your Slack channels',
    fields: [
      { key: 'webhook_url', label: 'Webhook URL', type: 'url', placeholder: 'https://hooks.slack.com/services/...' },
      { key: 'channel', label: 'Default Channel', type: 'text', placeholder: '#ai-alerts' },
    ],
  },
  {
    id: 'pagerduty',
    label: 'PagerDuty',
    description: 'Trigger incidents and alert on-call teams',
    fields: [
      { key: 'integration_key', label: 'Integration Key', type: 'text', placeholder: 'PagerDuty routing key' },
      { key: 'severity', label: 'Minimum Severity', type: 'select', options: ['low', 'medium', 'high', 'critical'] },
    ],
  },
  {
    id: 'jira',
    label: 'Jira',
    description: 'Create tickets automatically for detected issues',
    fields: [
      { key: 'url', label: 'Jira URL', type: 'url', placeholder: 'https://your-domain.atlassian.net' },
      { key: 'project', label: 'Project Key', type: 'text', placeholder: 'SEC' },
      { key: 'api_token', label: 'API Token', type: 'password', placeholder: 'Jira API token' },
    ],
  },
  {
    id: 'email',
    label: 'Email Notifications',
    description: 'Send alerts via email to your security team',
    fields: [
      { key: 'emails', label: 'Recipient Emails', type: 'text', placeholder: 'security@acme.com, alerts@acme.com' },
    ],
  },
  {
    id: 'teams',
    label: 'Microsoft Teams',
    description: 'Post alerts to Microsoft Teams channels',
    fields: [
      { key: 'webhook_url', label: 'Webhook URL', type: 'url', placeholder: 'https://outlook.office.com/webhook/...' },
    ],
  },
  {
    id: 'webhook',
    label: 'Custom Webhook',
    description: 'Send events to any HTTP endpoint',
    fields: [
      { key: 'url', label: 'Endpoint URL', type: 'url', placeholder: 'https://your-server.com/webhook' },
      { key: 'secret', label: 'Secret (optional)', type: 'password', placeholder: 'HMAC secret for verification' },
    ],
  },
] as const

export const TEAM_SIZE_OPTIONS = [
  { value: '1-5', label: '1-5 members' },
  { value: '6-20', label: '6-20 members' },
  { value: '21-50', label: '21-50 members' },
  { value: '51-100', label: '51-100 members' },
  { value: '100+', label: '100+ members' },
] as const

export type IntegrationConfig = Record<string, Record<string, string>>
