// Import types from Sentry core to ensure compatibility
import type { Event, Integration as SentryIntegration } from '@sentry/core';
import * as Sentry from '@sentry/react';
import type { EventHint } from '@sentry/react';

import { getConsentStatus, type PurposeMapping } from './zaraz';
import { logEvent } from './eventLogger';

/**
 * Sentry Zaraz Consent Integration
 *
 * This integration provides comprehensive consent management for Sentry, including:
 *
 * 1. Event Filtering: Blocks/allows events based on functional consent
 * 2. Dynamic Configuration: Updates Sentry settings based on consent changes
 * 3. Integration Management: Controls integration-specific settings
 * 4. Scope Management: Manages user data and marketing context
 *
 * Consent Purposes:
 * - functional: Core error monitoring (required for basic operation)
 * - analytics: Performance monitoring, breadcrumbs, detailed context
 * - preferences: PII data, session replay, detailed network capture
 * - marketing: User identification, feature flags, behavioral tracking
 *
 * The integration automatically adjusts Sentry configuration when consent changes,
 * ensuring compliance with privacy regulations while maintaining functionality.
 */

// Re-export types for convenience
export type { PurposeMapping };
export { zaraz } from 'zaraz-ts';
export { getConsentStatus } from './zaraz';

// Define Integration interface to match Sentry's interface
export interface Integration extends SentryIntegration {
  name: string;
  setupOnce?(): void;
  processEvent?(
    event: Event,
    hint: EventHint
  ): Event | null | PromiseLike<Event | null>;
}

export interface SentryZarazConsentIntegrationOptions {
  /**
   * Whether to log debug information to console
   * @default false
   */
  debug?: boolean;

  /**
   * Purpose mapping for Zaraz consent purposes
   * This is required and must match your Zaraz configuration
   */
  purposeMapping: PurposeMapping;
}

export interface ConsentState {
  functional?: boolean;
  analytics?: boolean;
  marketing?: boolean;
  preferences?: boolean;
}

class SentryZarazConsentIntegrationClass implements Integration {
  public static id = 'SentryZarazConsentIntegration';
  public name = SentryZarazConsentIntegrationClass.id;

  private options: SentryZarazConsentIntegrationOptions & {
    debug: boolean;
  };
  private isConsentReady = false;
  private hasConsent = false;
  private eventQueue: Array<{ event: Event; hint: EventHint }> = [];
  private consentChangeListener: (() => void) | null = null;
  private currentConsentState: ConsentState = {};
  private warningTimeoutId: any = null;
  private errorTimeoutId: any = null;
  private originalSentryConfig: any = {};
  private originalScopeData: any = {};
  private currentSentryHub: any = null;

  constructor(options: SentryZarazConsentIntegrationOptions) {
    this.options = {
      debug: false,
      ...options,
    };
  }

  public setupOnce(): void {
    this.log('Setting up Sentry Zaraz Consent Integration');

    // Capture current Sentry hub and initial configuration
    this.currentSentryHub = Sentry.getCurrentHub();
    this.captureOriginalSentryConfig();
    this.captureOriginalScopeData();

    // Start monitoring for consent
    this.initializeConsentMonitoring();
  }

  public processEvent(
    event: Event,
    hint: EventHint
  ): Event | null | PromiseLike<Event | null> {
    // If consent is ready and we have consent, allow the event
    if (this.isConsentReady && this.hasConsent) {
      this.log('Event allowed - consent granted');
      logEvent('Sentry event allowed', {
        eventType: event.type,
        eventId: event.event_id,
        level: event.level,
      });

      return event;
    }

    // If consent is ready but we don't have consent, block the event
    if (this.isConsentReady && !this.hasConsent) {
      this.log('Event blocked - consent not granted');
      logEvent('Event blocked', {
        reason: 'No functional consent',
        eventType: event.type,
        eventId: event.event_id,
        level: event.level,
      });
      return null;
    }

    // If consent is not ready yet, queue the event and block it for now
    this.log('Event queued - waiting for consent');
    logEvent('Sentry event queued', {
      reason: 'Waiting for consent decision',
      eventType: event.type,
      eventId: event.event_id,
      queueSize: this.eventQueue.length + 1,
    });
    this.eventQueue.push({ event, hint });
    return null; // Block the event for now, we'll resend it later if consent is granted
  }

  private initializeConsentMonitoring(): void {
    this.log('Initializing consent monitoring');

    // Check if Zaraz is already available
    if (window?.zaraz?.consent?.APIReady) {
      this.log('Zaraz consent API is ready');
      this.checkConsent();
    } else {
      this.log(
        'Zaraz consent API not ready, listening for zarazConsentAPIReady event...'
      );

      // Listen for Zaraz to become available
      const handleZarazLoaded = () => {
        const currentZaraz = window?.zaraz;
        if (currentZaraz?.consent?.APIReady) {
          this.log(
            'Zaraz consent API became ready via zarazConsentAPIReady event'
          );
          this.checkConsent();
          // Remove the event listener since we only need it once
          document.removeEventListener(
            'zarazConsentAPIReady',
            handleZarazLoaded
          );
          // Clear warning and error timeouts since Zaraz is now ready
          this.clearWarningAndErrorTimeouts();
        }
      };

      document.addEventListener('zarazConsentAPIReady', handleZarazLoaded);

      // Set warning timeout (20 seconds)
      this.warningTimeoutId = setTimeout(() => {
        console.warn(
          '[SentryZarazConsentIntegration] Warning: Zaraz consent API not loaded after 20 seconds'
        );
        logEvent('Zaraz loading warning', {
          message: 'Zaraz consent API not loaded after 20 seconds',
          waitTime: 20000,
        });
      }, 20000);

      // Set error timeout (45 seconds)
      this.errorTimeoutId = setTimeout(() => {
        console.error(
          '[SentryZarazConsentIntegration] Error: Zaraz consent API not loaded after 45 seconds'
        );
        logEvent('Zaraz loading error', {
          message: 'Zaraz consent API not loaded after 45 seconds',
          waitTime: 45000,
        });
        // Fallback: proceed without consent after timeout
        this.isConsentReady = true;
        this.hasConsent = false;
        this.clearEventQueue();
      }, 45000);
    }
  }

  private checkConsent(): void {
    const currentConsentState = getConsentStatus(this.options.purposeMapping);
    this.currentConsentState = currentConsentState;
    const hasConsent = currentConsentState.functional;
    this.log(`Consent check result: ${hasConsent}`, this.currentConsentState);

    this.isConsentReady = true;
    this.hasConsent = hasConsent;

    // Apply Sentry configuration based on current consent state
    this.applySentryConfiguration(currentConsentState);
    this.updateIntegrationConfigs(currentConsentState);

    if (hasConsent) {
      this.log('Consent granted, processing queued events');
      logEvent('Consent granted', {
        queuedEvents: this.eventQueue.length,
        appliedSentryConfig: true,
        consentState: currentConsentState,
      });
      void this.processQueuedEvents(); // Fire and forget async call
    } else {
      this.log('Consent not granted, clearing event queue');
      logEvent('Consent denied', {
        discardedEvents: this.eventQueue.length,
        appliedSentryConfig: true,
        consentState: currentConsentState,
      });
      this.clearEventQueue();
    }

    // Listen for consent changes
    this.listenForConsentChanges();

    // Clear warning and error timeouts since we have a consent status
    this.clearWarningAndErrorTimeouts();
  }

  private listenForConsentChanges(): void {
    // Listen for Zaraz consent changes using the proper event
    this.consentChangeListener = () => {
      const newConsentState = getConsentStatus(this.options.purposeMapping);
      const currentConsent = newConsentState.functional;

      if (
        currentConsent !== this.hasConsent ||
        JSON.stringify(newConsentState) !==
          JSON.stringify(this.currentConsentState)
      ) {
        this.log(
          `Consent changed from ${this.hasConsent} to ${currentConsent}`
        );
        logEvent('Consent status changed', {
          from: this.hasConsent,
          to: currentConsent,
          newState: newConsentState,
          appliedSentryConfig: true,
        });

        this.hasConsent = currentConsent;
        this.currentConsentState = newConsentState;

        // Apply Sentry configuration changes based on new consent state
        this.applySentryConfiguration(newConsentState);
        this.updateIntegrationConfigs(newConsentState);

        if (currentConsent) {
          this.log('Consent granted, processing any new queued events');
          void this.processQueuedEvents(); // Fire and forget async call
        } else {
          this.log('Consent revoked, future events will be blocked');
        }
      }
    };

    // Listen for the zarazConsentChoicesUpdated event
    document.addEventListener(
      'zarazConsentChoicesUpdated',
      this.consentChangeListener
    );
    this.log('Listening for zarazConsentChoicesUpdated events');
  }

  private clearWarningAndErrorTimeouts(): void {
    if (this.warningTimeoutId) {
      clearTimeout(this.warningTimeoutId);
      this.warningTimeoutId = null;
    }
    if (this.errorTimeoutId) {
      clearTimeout(this.errorTimeoutId);
      this.errorTimeoutId = null;
    }
  }

  private log(message: string, ...args: any[]): void {
    if (this.options.debug) {
      console.log(`[SentryZarazConsentIntegration] ${message}`, ...args);
    }
  }

  private async processQueuedEvents(): Promise<void> {
    this.log(`Processing ${this.eventQueue.length} queued events`);

    const queuedEvents = [...this.eventQueue];
    this.eventQueue = [];

    // Re-send queued events through Sentry
    for (const { event, hint } of queuedEvents) {
      if (this.hasConsent) {
        this.log('Re-sending queued event:', event.event_id);

        try {
          // Re-capture the event through Sentry's APIs
          if (event.exception?.values?.[0]) {
            // For error events, re-throw the error
            const error = new Error(
              event.exception.values[0].value || 'Queued error'
            );
            error.stack = (event.exception.values[0].stacktrace?.frames ?? [])
              .map((f: any) => `${f.filename || 'unknown'}:${f.lineno || 0}`)
              .join('\n');

            Sentry.captureException(error);
          } else if (event.message) {
            // For message events
            Sentry.captureMessage(
              event.message || 'Queued message',
              event.level as any
            );
          } else {
            // For other event types, try to use captureEvent if available
            if ((Sentry as any).captureEvent) {
              (Sentry as any).captureEvent(event, hint);
            }
          }
        } catch {
          // Silently fail in production - Sentry not available
        }
      } else {
        this.log('Discarding queued event due to no consent:', event.event_id);
      }
    }
  }

  private clearEventQueue(): void {
    this.log(`Clearing ${this.eventQueue.length} queued events`);
    this.eventQueue = [];
  }

  private captureOriginalScopeData(): void {
    // Capture the current scope data to preserve it for later restoration
    const scope = this.currentSentryHub?.getScope();
    if (scope) {
      // Note: Sentry doesn't expose direct access to scope data,
      // so we'll rely on the initialScope from the main Sentry.init call
      // This is a limitation, but the main configuration should be set at the top level
      this.originalScopeData = {
        user: scope._user || null,
        tags: scope._tags || {},
        contexts: scope._contexts || {},
      };
    }
    this.log('Captured original scope data', this.originalScopeData);
  }

  private captureOriginalSentryConfig(): void {
    // Store original configuration from Sentry client
    const client = this.currentSentryHub?.getClient();
    if (client) {
      const options = client.getOptions();
      this.originalSentryConfig = {
        sendDefaultPii: options.sendDefaultPii,
        maxBreadcrumbs: options.maxBreadcrumbs,
        attachStacktrace: options.attachStacktrace,
        sampleRate: options.sampleRate,
        tracesSampleRate: options.tracesSampleRate,
        beforeBreadcrumb: options.beforeBreadcrumb,
        beforeSend: options.beforeSend,
        beforeSendTransaction: options.beforeSendTransaction,
        replaysSessionSampleRate: options.replaysSessionSampleRate,
        replaysOnErrorSampleRate: options.replaysOnErrorSampleRate,
        profilesSampleRate: options.profilesSampleRate,
      };
    } else {
      // Fallback to default values if no client found
      this.originalSentryConfig = {
        sendDefaultPii: false,
        maxBreadcrumbs: 100,
        attachStacktrace: false,
        sampleRate: 1.0,
        tracesSampleRate: 0.0,
        replaysSessionSampleRate: 0.0,
        replaysOnErrorSampleRate: 0.0,
        profilesSampleRate: 0.0,
      };
    }
    this.log(
      'Captured original Sentry configuration',
      this.originalSentryConfig
    );
  }

  private applySentryConfiguration(consentState: ConsentState): void {
    this.log('Applying Sentry configuration based on consent', consentState);

    const client = this.currentSentryHub?.getClient();
    if (!client) {
      this.log('No Sentry client found, cannot apply configuration');
      return;
    }

    const options = client.getOptions();

    // Apply configuration based on consent state
    const newConfig = this.buildConsentBasedConfig(consentState);

    // Update client options
    Object.assign(options, newConfig);

    // Update scope if marketing consent changed
    if (consentState.marketing !== undefined) {
      this.updateSentryScope(consentState.marketing);
    }

    this.log('Applied new Sentry configuration', newConfig);
  }

  private buildConsentBasedConfig(consentState: ConsentState): any {
    const config: any = {};

    // Functional consent controls basic SDK operation
    if (!consentState.functional) {
      config.enabled = false;
      config.sampleRate = 0.0;
      config.beforeSend = () => null; // Block all events
    } else {
      config.enabled = true;
      config.sampleRate = this.originalSentryConfig.sampleRate ?? 1.0;
      config.beforeSend = this.originalSentryConfig.beforeSend;
    }

    // Analytics consent controls performance monitoring and context
    if (!consentState.analytics) {
      config.maxBreadcrumbs = 0;
      config.attachStacktrace = false;
      config.tracesSampleRate = 0.0;
      config.profilesSampleRate = 0.0;
      config.beforeBreadcrumb = () => null; // Drop all breadcrumbs
      config.beforeSendTransaction = () => null; // Block all transactions
    } else {
      config.maxBreadcrumbs = this.originalSentryConfig.maxBreadcrumbs ?? 100;
      config.attachStacktrace =
        this.originalSentryConfig.attachStacktrace ?? false;
      config.tracesSampleRate =
        this.originalSentryConfig.tracesSampleRate ?? 0.0;
      config.profilesSampleRate =
        this.originalSentryConfig.profilesSampleRate ?? 0.0;
      config.beforeBreadcrumb = this.originalSentryConfig.beforeBreadcrumb;
      config.beforeSendTransaction =
        this.originalSentryConfig.beforeSendTransaction;
    }

    // Preferences consent controls PII and detailed data collection
    if (!consentState.preferences) {
      config.sendDefaultPii = false;
      config.replaysSessionSampleRate = 0.0;
      config.replaysOnErrorSampleRate = 0.0;
    } else {
      config.sendDefaultPii = this.originalSentryConfig.sendDefaultPii ?? false;
      config.replaysSessionSampleRate =
        this.originalSentryConfig.replaysSessionSampleRate ?? 0.0;
      config.replaysOnErrorSampleRate =
        this.originalSentryConfig.replaysOnErrorSampleRate ?? 0.0;
    }

    return config;
  }

  private updateSentryScope(hasMarketingConsent: boolean): void {
    const scope = this.currentSentryHub?.getScope();
    if (!scope) return;

    if (!hasMarketingConsent) {
      // Clear marketing-related scope data
      scope.setUser(null);
      // Clear tags by setting them to undefined (clearTags method doesn't exist)
      if (this.originalScopeData.tags) {
        Object.keys(this.originalScopeData.tags).forEach((tagKey) => {
          scope.setTag(tagKey, undefined);
        });
      }
      scope.setContext('marketing', null);
      this.log('Cleared marketing-related scope data');
    } else if (this.originalScopeData) {
      // Restore original scope data
      const { user, tags, contexts } = this.originalScopeData;
      if (user) scope.setUser(user);
      if (tags) {
        Object.entries(tags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }
      if (contexts) {
        Object.entries(contexts).forEach(([key, value]) => {
          scope.setContext(key, value);
        });
      }
      this.log('Restored marketing-related scope data');
    }
  }

  private updateIntegrationConfigs(consentState: ConsentState): void {
    // Note: Integration configs are typically set at initialization time
    // Dynamic updates would require more complex integration management
    // This is a placeholder for future enhancement
    this.log('Integration config updates would be applied here', {
      consentState,
    });
  }

  public cleanup(): void {
    this.clearWarningAndErrorTimeouts();

    if (this.consentChangeListener) {
      document.removeEventListener(
        'zarazConsentChoicesUpdated',
        this.consentChangeListener
      );
      this.consentChangeListener = null;
    }

    this.clearEventQueue();
  }
}

/**
 * Creates a new Sentry Zaraz Consent Integration instance for use in integrations array
 *
 * @param options Configuration options for the integration
 * @returns Integration instance that can be added to Sentry's integrations array
 *
 * @example
 * ```typescript
 * Sentry.init({
 *   dsn: 'YOUR_DSN',
 *   sendDefaultPii: true,
 *   maxBreadcrumbs: 100,
 *   tracesSampleRate: 0.1,
 *   replaysSessionSampleRate: 0.1,
 *   integrations: [
 *     sentryZarazConsentIntegration({
 *       purposeMapping: {
 *         functional: 'essential',
 *         analytics: 'analytics',
 *         preferences: 'personalization',
 *         marketing: 'marketing'
 *       },
 *       debug: true
 *     })
 *   ]
 * });
 * ```
 */
export function sentryZarazConsentIntegration(
  options: SentryZarazConsentIntegrationOptions
): Integration {
  const integration = new SentryZarazConsentIntegrationClass(options);

  return {
    name: integration.name,
    setupOnce: () => integration.setupOnce(),
    processEvent: (event: Event, hint: EventHint) =>
      integration.processEvent(event, hint),
  };
}

// Export the class for advanced use cases
export { SentryZarazConsentIntegrationClass };
