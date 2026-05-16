'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import { Flag, AlertTriangle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@clerk/nextjs'
import { submitFeedback, reportComplianceIssue } from '@/services/learning'
import Swal from 'sweetalert2'

interface FeedbackButtonProps {
  logId?: string
  prompt: string
  response?: string
  detectionScore?: number
}

export function FeedbackButton({ logId, prompt, response, detectionScore }: FeedbackButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { getToken } = useAuth()

  const handleReport = async () => {
    const token = await getToken()
    
    const { value: feedbackType } = await Swal.fire({
      title: 'Report Issue',
      text: 'Help us improve detection by reporting issues',
      input: 'select',
      inputOptions: {
        'missed_jailbreak': 'Missed Jailbreak - This was a jailbreak attempt that slipped through',
        'compliance_issue': 'Compliance Issue - AI started complying with harmful request',
        'false_positive': 'False Positive - Incorrectly flagged as risky'
      },
      inputPlaceholder: 'Select issue type',
      showCancelButton: true,
      confirmButtonText: 'Report',
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'Cancel',
      customClass: {
        popup: 'swal2-feedback-popup'
      }
    })

    if (!feedbackType) return

    const { value: notes } = await Swal.fire({
      title: 'Additional Notes (Optional)',
      input: 'textarea',
      inputPlaceholder: 'Describe what you expected vs what happened...',
      showCancelButton: true,
      confirmButtonText: 'Submit Report',
      confirmButtonColor: '#ef4444'
    })

    if (notes === undefined) return // User cancelled

    setIsSubmitting(true)
    try {
      if (feedbackType === 'compliance_issue' && logId) {
        await reportComplianceIssue(logId, token)
      } else {
        await submitFeedback({
          log_id: logId,
          prompt_text: prompt,
          response_text: response,
          feedback_type: feedbackType,
          notes: notes || undefined,
          attack_category: feedbackType === 'missed_jailbreak' ? 'jailbreak' : 'false_positive'
        }, token)
      }

      toast.success('Thank you! Your feedback helps improve detection.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit feedback'
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleReport}
      disabled={isSubmitting}
      className="gap-2 text-muted-foreground hover:text-amber-500"
    >
      {isSubmitting ? (
        <CheckCircle className="h-4 w-4" />
      ) : (
        <Flag className="h-4 w-4" />
      )}
      {isSubmitting ? 'Submitted' : 'Report Issue'}
    </Button>
  )
}

// Quick report button for missed jailbreak detection
export function QuickReportButton({ prompt, response, logId }: FeedbackButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { getToken } = useAuth()

  const handleQuickReport = async () => {
    setIsSubmitting(true)
    try {
      const token = await getToken()
      await submitFeedback({
        log_id: logId,
        prompt_text: prompt,
        response_text: response,
        feedback_type: 'missed_jailbreak',
        notes: 'Quick report: Potential jailbreak that was not detected',
        attack_category: 'jailbreak'
      }, token)

      toast.success('Reported as missed jailbreak. Thank you!')
    } catch (err) {
      toast.error('Failed to submit report')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleQuickReport}
      disabled={isSubmitting}
      className="gap-2 text-amber-500 hover:text-amber-600 hover:bg-amber-50"
    >
      <AlertTriangle className="h-4 w-4" />
      {isSubmitting ? 'Reporting...' : 'Missed Detection?'}
    </Button>
  )
}
