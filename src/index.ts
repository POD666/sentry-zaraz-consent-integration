/**
 * Sentry Zaraz Consent Integration
 *
 * A wrapper around @imviidx/sentry-consent-integration specifically designed for
 * Cloudflare Zaraz consent management. This package provides a simplified API
 * for integrating Sentry with Zaraz consent choices.
 */

import {
  sentryConsentIntegration,
  type SentryConsentIntegrationOptions,
} from '@imviidx/sentry-consent-integration';

// Define ConsentStateGetters type locally since it's not exported from the base package
export interface ConsentStateGetters {
  functional?: () => boolean;
  analytics?: () => boolean;
  marketing?: () => boolean;
  preferences?: () => boolean;
}

// Re-export types for convenience
export type { SentryConsentIntegrationOptions };

// Zaraz types for better TypeScript support
declare global {
  interface Window {
    zaraz?: {
      consent?: {
        APIReady?: boolean;
        get(purposeId: string): boolean | undefined;
        set(purposes: Record<string, boolean>): void;
      };
    };
  }
}

/**
 * Configuration options for the Zaraz-specific consent integration
 */
export interface SentryZarazConsentIntegrationOptions {
  /**
   * Mapping of consent purposes to Zaraz purpose IDs
   * Each purpose can be mapped to:
   * - string[]: Array of Zaraz purpose IDs that must all be granted
   * - boolean: Always granted (true) or always denied (false)
   */
  purposeMapping: {
    functional?: string[] | boolean;
    analytics?: string[] | boolean;
    marketing?: string[] | boolean;
    preferences?: string[] | boolean;
  };

  /**
   * Timeout in milliseconds to wait for Zaraz to be ready
   * @default 30000 (30 seconds)
   */
  zarazTimeout?: number;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;
}

/**
 * Creates a Sentry integration that works with Cloudflare Zaraz consent management.
 *
 * This is a convenience wrapper around @imviidx/sentry-consent-integration that
 * automatically handles Zaraz consent API integration.
 *
 * @param options Configuration options for Zaraz consent integration
 * @returns Sentry integration for use in integrations array
 *
 * @example
 * ```typescript
 * import { sentryZarazConsentIntegration } from 'sentry-zaraz-consent-integration';
 * import * as Sentry from '@sentry/browser';
 *
 * Sentry.init({
 *   dsn: 'your-sentry-dsn',
 *   integrations: [
 *     sentryZarazConsentIntegration({
 *       purposeMapping: {
 *         functional: ['essential'],     // Requires 'essential' purpose to be granted
 *         analytics: ['analytics'],      // Requires 'analytics' purpose to be granted
 *         marketing: ['marketing'],      // Requires 'marketing' purpose to be granted
 *         preferences: ['preferences'],  // Requires 'preferences' purpose to be granted
 *       },
 *       debug: true,
 *     }),
 *   ],
 * });
 * ```
 */
export function sentryZarazConsentIntegration(
  options: SentryZarazConsentIntegrationOptions
) {
  const { purposeMapping, zarazTimeout = 30000, debug = false } = options;

  // Create consent state getters that check Zaraz API
  const consentStateGetters: ConsentStateGetters = {
    functional: () => checkZarazConsent(purposeMapping.functional),
    analytics: () => checkZarazConsent(purposeMapping.analytics),
    marketing: () => checkZarazConsent(purposeMapping.marketing),
    preferences: () => checkZarazConsent(purposeMapping.preferences),
  };

  // Setup consent change listener for Zaraz events
  const onConsentChange = (trigger: () => void) => {
    // Listen for Zaraz consent events
    const handleConsentChange = () => {
      if (debug) {
        console.log('[SentryZarazConsentIntegration] Zaraz consent changed');
      }
      trigger();
    };

    // Listen for various Zaraz consent events
    document.addEventListener(
      'zarazConsentChoicesUpdated',
      handleConsentChange
    );
    document.addEventListener('zarazConsentAPIReady', handleConsentChange);

    // Return cleanup function
    return () => {
      document.removeEventListener(
        'zarazConsentChoicesUpdated',
        handleConsentChange
      );
      document.removeEventListener('zarazConsentAPIReady', handleConsentChange);
    };
  };

  // Create the base consent integration options
  const integrationOptions: SentryConsentIntegrationOptions = {
    consentStateGetters,
    onConsentChange,
    consentTimeout: zarazTimeout,
    debug,
  };

  if (debug) {
    console.log('[SentryZarazConsentIntegration] Initializing with options:', {
      purposeMapping,
      zarazTimeout,
      debug,
    });
  }

  // Return the base integration with our Zaraz-specific configuration
  return sentryConsentIntegration(integrationOptions);
}

/**
 * Helper function to check consent for a specific purpose mapping
 */
function checkZarazConsent(mapping: string[] | boolean | undefined): boolean {
  // Handle boolean values (always grant/deny)
  if (typeof mapping === 'boolean') {
    return mapping;
  }

  // Handle undefined (not configured)
  if (!mapping) {
    return false;
  }

  // Handle array of purpose IDs
  if (Array.isArray(mapping)) {
    // Check if Zaraz is available
    if (typeof window === 'undefined' || !window.zaraz?.consent) {
      return false;
    }

    // All specified purposes must be granted
    return mapping.every((purposeId) => {
      const hasConsent = window.zaraz?.consent?.get(purposeId);
      return hasConsent === true;
    });
  }

  return false;
}

/**
 * Checks if Zaraz consent API is ready and available
 * @returns true if Zaraz consent API is ready
 */
export function isZarazConsentReady(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return Boolean(
    window.zaraz?.consent?.APIReady ||
      (window.zaraz?.consent && typeof window.zaraz.consent.get === 'function')
  );
}

/**
 * Gets the current consent state for all mapped purposes
 * @param purposeMapping The purpose mapping configuration
 * @returns Object with consent state for each purpose
 */
export function getZarazConsentState(
  purposeMapping: SentryZarazConsentIntegrationOptions['purposeMapping']
) {
  return {
    functional: checkZarazConsent(purposeMapping.functional),
    analytics: checkZarazConsent(purposeMapping.analytics),
    marketing: checkZarazConsent(purposeMapping.marketing),
    preferences: checkZarazConsent(purposeMapping.preferences),
  };
}

// Backward compatibility exports
export {
  sentryZarazConsentIntegration as default,
  sentryZarazConsentIntegration as sentryConsentIntegration,
};

// Legacy type aliases for backward compatibility
export type PurposeMapping =
  SentryZarazConsentIntegrationOptions['purposeMapping'];
export type ConsentState = ReturnType<typeof getZarazConsentState>;
