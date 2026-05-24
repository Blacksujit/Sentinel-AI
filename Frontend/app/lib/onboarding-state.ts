export function encodeOnboardingState(data: Record<string, unknown>): string {
  return btoa(encodeURIComponent(JSON.stringify(data)))
}

export function decodeOnboardingState(encoded: string): Record<string, unknown> | null {
  try {
    return JSON.parse(decodeURIComponent(atob(encoded)))
  } catch {
    return null
  }
}
