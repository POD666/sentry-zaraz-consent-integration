// Event logging utility for debugging and monitoring
export function logEvent(message: string, data?: any) {
  // For now, we'll just log to console in all environments
  // In production, you might want to send to analytics or monitoring service
  console.log(`[SentryZarazIntegration] ${message}`, data);
}
