// Zaraz consent utilities with direct window.zaraz access for better compatibility
// Import the robust getZaraz implementation directly from zaraz-ts helpers
import { zaraz } from 'zaraz-ts';

/**
 * This module provides direct access to Zaraz consent API:
 *
 * - Uses direct window.zaraz.consent.getAll() calls for better compatibility
 * - Leverages zaraz-ts's robust getZaraz implementation with queuing
 * - Maintains compatibility with existing SentryZarazConsentIntegration
 * - Works with both real Zaraz and fake-cloudflare-zaraz-consent
 *
 * Benefits:
 * - Direct access to consent data without wrapper issues
 * - Event queuing and automatic flushing from zaraz-ts getZaraz
 * - Better compatibility with different Zaraz implementations
 */

export interface PurposeMapping {
  functional?: string[] | boolean;
  analytics?: string[] | boolean;
  marketing?: string[] | boolean;
  preferences?: string[] | boolean;
}

export function getConsentStatus(purposeMapping: PurposeMapping) {
  const enforced = {
    functional:
      typeof purposeMapping.functional === 'boolean'
        ? purposeMapping.functional
        : null,
    analytics:
      typeof purposeMapping.analytics === 'boolean'
        ? purposeMapping.analytics
        : null,
    marketing:
      typeof purposeMapping.marketing === 'boolean'
        ? purposeMapping.marketing
        : null,
    preferences:
      typeof purposeMapping.preferences === 'boolean'
        ? purposeMapping.preferences
        : null,
  };
  // Check if Zaraz consent API is ready
  if (!window.zaraz?.consent?.APIReady) {
    return {
      functional: enforced.functional ?? false,
      analytics: enforced.analytics ?? false,
      marketing: enforced.marketing ?? false,
      preferences: enforced.preferences ?? false,
    };
  }

  // Get normalized consent data
  const allConsents = zaraz.consent.getAll();

  return {
    functional:
      enforced.functional ??
      ((purposeMapping.functional as string[]) || []).every(
        (purpose) => allConsents[purpose] === true
      ),
    analytics:
      enforced.analytics ??
      ((purposeMapping.analytics as string[]) || []).every(
        (purpose) => allConsents[purpose] === true
      ),
    marketing:
      enforced.marketing ??
      ((purposeMapping.marketing as string[]) || []).every(
        (purpose) => allConsents[purpose] === true
      ),
    preferences:
      enforced.preferences ??
      ((purposeMapping.preferences as string[]) || []).every(
        (purpose) => allConsents[purpose] === true
      ),
  };
}
