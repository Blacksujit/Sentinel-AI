export const COMPLIANCE_FRAMEWORKS = [
  { id: 'soc2', label: 'SOC 2', description: 'Service Organization Control 2' },
  { id: 'hipaa', label: 'HIPAA', description: 'Health Insurance Portability and Accountability Act' },
  { id: 'gdpr', label: 'GDPR', description: 'General Data Protection Regulation' },
  { id: 'pci-dss', label: 'PCI DSS', description: 'Payment Card Industry Data Security Standard' },
  { id: 'iso27001', label: 'ISO 27001', description: 'Information Security Management' },
  { id: 'fedramp', label: 'FedRAMP', description: 'Federal Risk and Authorization Management Program' },
  { id: 'ccpa', label: 'CCPA', description: 'California Consumer Privacy Act' },
  { id: 'none', label: 'None / Not Sure', description: 'No specific compliance requirements' },
] as const

export const SECURITY_REQUIREMENTS = [
  { id: 'sso', label: 'Single Sign-On (SSO)', description: 'SAML / OIDC integration' },
  { id: 'mfa', label: 'Multi-Factor Authentication', description: 'Require MFA for all users' },
  { id: 'audit-logs', label: 'Audit Logs', description: 'Detailed access and action logs' },
  { id: 'encryption-at-rest', label: 'Encryption at Rest', description: 'Data encrypted in storage' },
  { id: 'encryption-in-transit', label: 'Encryption in Transit', description: 'All traffic encrypted via TLS' },
  { id: 'ip-whitelist', label: 'IP Whitelisting', description: 'Restrict access by IP range' },
  { id: 'rbac', label: 'Role-Based Access Control', description: 'Granular permission management' },
] as const

export const DATA_RETENTION_OPTIONS = [
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '180', label: '180 days' },
  { value: '365', label: '1 year' },
  { value: '730', label: '2 years' },
  { value: '0', label: 'Indefinite' },
] as const
