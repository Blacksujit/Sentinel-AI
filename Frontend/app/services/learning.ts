import { apiPost } from '@/lib/api-client'

export interface FeedbackSubmission {
  log_id?: string
  prompt_text: string
  response_text?: string
  feedback_type: 'missed_jailbreak' | 'false_positive' | 'compliance_issue'
  notes?: string
  conversation_id?: string
  attack_category?: string
}

export interface FeedbackResponse {
  success: boolean
  feedback_id: string
  message: string
  extracted_patterns: Array<{
    pattern_id: string
    intent: string
    confidence: number
    key_phrases: string[]
    variations_generated: number
  }>
}

export async function submitFeedback(
  submission: FeedbackSubmission,
  token?: string | null
): Promise<FeedbackResponse> {
  return apiPost('/learning/feedback', submission, token)
}

export async function reportComplianceIssue(
  logId: string,
  token?: string | null
): Promise<FeedbackResponse> {
  return apiPost(`/learning/feedback/${logId}/compliance`, {}, token)
}
