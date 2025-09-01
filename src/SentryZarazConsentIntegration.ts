// Import types from Sentry core to ensure compatibility
import type { Event, Integration as SentryIntegration } from '@sentry/core';
import * as Sentry from '@sentry/react';
import type { EventHint } from '@sentry/react';

import { getConsentStatus, type PurposeMapping } from './zaraz';
import { logEvent } from './eventLogger';

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

  private options: Required<SentryZarazConsentIntegrationOptions>;
  private isConsentReady = false;
  private hasConsent = false;
  private eventQueue: Array<{ event: Event; hint: EventHint }> = [];
  private consentChangeListener: (() => void) | null = null;
  private currentConsentState: ConsentState = {};
  private warningTimeoutId: any = null;
  private errorTimeoutId: any = null;

  constructor(options: SentryZarazConsentIntegrationOptions) {
    this.options = {
      debug: false,
      ...options,
    };
  }

  public setupOnce(): void {
    this.log('Setting up Sentry Zaraz Consent Integration');

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
        'Zaraz consent API not ready, listening for zarazLoaded event...'
      );

      // Listen for Zaraz to become available
      const handleZarazLoaded = () => {
        const currentZaraz = window?.zaraz;
        if (currentZaraz?.consent?.APIReady) {
          this.log('Zaraz consent API became ready via zarazLoaded event');
          this.checkConsent();
          // Remove the event listener since we only need it once
          document.removeEventListener('zarazLoaded', handleZarazLoaded);
          // Clear warning and error timeouts since Zaraz is now ready
          this.clearWarningAndErrorTimeouts();
        }
      };

      document.addEventListener('zarazLoaded', handleZarazLoaded);

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

    if (hasConsent) {
      this.log('Consent granted, processing queued events');
      logEvent('Consent granted', {
        queuedEvents: this.eventQueue.length,
      });
      void this.processQueuedEvents(); // Fire and forget async call
    } else {
      this.log('Consent not granted, clearing event queue');
      logEvent('Consent denied', {
        discardedEvents: this.eventQueue.length,
      });
      this.clearEventQueue();
    }

    // Listen for consent changes
    this.listenForConsentChanges();

    // Clear warning and error timeouts since we have a consent status
    this.clearWarningAndErrorTimeouts();
  }

  private listenForConsentChanges(): void {
    if (!window?.zaraz?.consent) return;

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
        });

        this.hasConsent = currentConsent;
        this.currentConsentState = newConsentState;

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
            error.stack = event.exception.values[0].stacktrace?.frames
              ?.map((f: any) => `${f.filename || 'unknown'}:${f.lineno || 0}`)
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
