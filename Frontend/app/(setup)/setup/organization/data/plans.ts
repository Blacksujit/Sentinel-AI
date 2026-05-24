export interface PlanFeature {
  text: string
  included: boolean
}

export interface Plan {
  id: string
  name: string
  price: string
  period: string
  description: string
  features: PlanFeature[]
  cta: string
  popular: boolean
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Starter',
    price: '$0',
    period: '/month',
    description: 'Perfect for small teams getting started with AI safety',
    features: [
      { text: 'Up to 10,000 API calls / month', included: true },
      { text: '1 team member', included: true },
      { text: 'Basic anomaly detection', included: true },
      { text: '7-day data retention', included: true },
      { text: 'Email support', included: true },
      { text: 'Advanced risk scoring', included: false },
      { text: 'SSO / SAML', included: false },
      { text: 'Audit logs', included: false },
      { text: 'Custom integrations', included: false },
      { text: 'Priority support', included: false },
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Professional',
    price: '$199',
    period: '/month',
    description: 'For growing teams that need advanced monitoring',
    features: [
      { text: 'Up to 100,000 API calls / month', included: true },
      { text: 'Up to 10 team members', included: true },
      { text: 'Advanced anomaly detection', included: true },
      { text: '30-day data retention', included: true },
      { text: 'Email + Slack support', included: true },
      { text: 'Advanced risk scoring', included: true },
      { text: 'SSO / SAML', included: true },
      { text: 'Basic audit logs', included: true },
      { text: 'Custom integrations', included: true },
      { text: 'Priority support', included: false },
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For organizations with advanced security and compliance needs',
    features: [
      { text: 'Unlimited API calls', included: true },
      { text: 'Unlimited team members', included: true },
      { text: 'Custom detection rules', included: true },
      { text: 'Custom data retention', included: true },
      { text: 'Dedicated support engineer', included: true },
      { text: 'Advanced risk scoring', included: true },
      { text: 'SSO / SAML + SCIM', included: true },
      { text: 'Full audit logs', included: true },
      { text: 'Custom integrations + API', included: true },
      { text: '24/7 Priority support', included: true },
    ],
    cta: 'Contact Sales',
    popular: false,
  },
] as const
