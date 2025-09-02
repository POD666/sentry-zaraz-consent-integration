// Import types from Sentry core to ensure compatibility
import type { Event, Integration as SentryIntegration } from '@sentry/core';
import * as Sentry from '@sentry/react';
import type { EventHint } from '@sentry/react';

import { getConsentStatus, type PurposeMapping } from './zaraz';
import { logEvent } from './eventLogger';

/**
 * Sentry Zaraz Consent Integration
 *
 * This integration provides comprehensive consent management for Sentry with a privacy-first approach, including:
 *
 * 1. Event Filtering: Blocks/allows events based on functional consent
 * 2. Dynamic Configuration: Updates Sentry settings based on consent changes
 * 3. Privacy-by-Default: Enforces safest settings even with consent granted
 * 4. Granular Scope Management: Manages user data and marketing context precisely
 *
 * Privacy-Conscious Consent Purposes:
 * - functional: Core error monitoring, basic session health (autoSessionTracking)
 * - analytics: Performance monitoring, breadcrumbs, detailed context, detailed session analytics
 * - preferences: PII data, session replay (most privacy-sensitive), detailed network capture
 * - marketing: User identification for A/B testing, feature flags, behavioral tracking
 *
 * Key Privacy Features:
 * - Session Replay properly categorized as most privacy-sensitive (preferences)
 * - Marketing consent specifically targets user identification, not general PII
 * - Privacy-by-default approach even when consent is granted
 * - Granular session tracking (basic health vs detailed analytics)
 * - GDPR-aligned consent granularity for data minimization
 *
 * ⚠️ Important Privacy Note for Session Replay:
 * This integration controls Session Replay sample rates but cannot dynamically modify
 * integration-specific privacy settings (maskAllText, maskAllInputs, blockAllMedia).
 *
 * However, it WILL monitor for unsafe privacy settings and:
 * - Stop recording if unsafe settings are detected (when preferences consent is granted)
 * - Resume recording if settings become safe later (e.g., after developer fixes configuration)
 * - Track replay state across consent changes
 *
 * Developers MUST configure replayIntegration() with privacy-safe defaults:
 *
 * ```typescript
 * Sentry.init({
 *   integrations: [
 *     Sentry.replayIntegration({
 *       maskAllText: true,        // Keep this true for privacy
 *       maskAllInputs: true,      // Keep this true for privacy
 *       blockAllMedia: true,      // Keep this true for privacy
 *       networkCaptureBodies: false, // Keep this false for privacy
 *     }),
 *     sentryZarazConsentIntegration({ ... })
 *   ]
 * });
 * ```
 *
 * The integration automatically adjusts Sentry configuration when consent changes,
 * ensuring compliance with privacy regulations while maintaining functionality.
 */ // Re-export types for convenience
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
  private replayStoppedDueToUnsafeSettings = false;

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

        // Handle Session Replay state changes specifically
        this.handleReplayConsentChange(
          this.currentConsentState.preferences,
          newConsentState.preferences
        );

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
        autoSessionTracking: options.autoSessionTracking,
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
        autoSessionTracking: true,
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
      config.autoSessionTracking = false; // Disable basic session health tracking
    } else {
      config.enabled = true;
      config.sampleRate = this.originalSentryConfig.sampleRate ?? 1.0;
      config.beforeSend = this.originalSentryConfig.beforeSend;
      config.autoSessionTracking =
        this.originalSentryConfig.autoSessionTracking ?? true;
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

    // Preferences consent controls PII and session replay (most privacy-sensitive features)
    if (!consentState.preferences) {
      config.sendDefaultPii = false;
      config.replaysSessionSampleRate = 0.0;
      config.replaysOnErrorSampleRate = 0.0;
      // Reset replay stop flag when consent is revoked
      this.replayStoppedDueToUnsafeSettings = false;
    } else {
      config.sendDefaultPii = this.originalSentryConfig.sendDefaultPii ?? false;
      config.replaysSessionSampleRate =
        this.originalSentryConfig.replaysSessionSampleRate ?? 0.0;
      config.replaysOnErrorSampleRate =
        this.originalSentryConfig.replaysOnErrorSampleRate ?? 0.0;

      // Note: Session Replay sample rates are now enabled, but the privacy-safe
      // integration settings (maskAllText, maskAllInputs, blockAllMedia) must be
      // configured by developers in their replayIntegration() at initialization time.
      // This integration cannot dynamically modify integration-specific settings,
      // only the main Sentry configuration options like sample rates.
      this.log(
        'Session Replay sample rates enabled - ensure replayIntegration() uses privacy-safe settings'
      );

      // Check for potentially unsafe replay integration settings and handle resume
      this.validateReplayPrivacySettings();
    }

    return config;
  }

  private updateSentryScope(hasMarketingConsent: boolean): void {
    const scope = this.currentSentryHub?.getScope();
    if (!scope) return;

    if (!hasMarketingConsent) {
      // Clear marketing-related scope data (user identification for A/B testing, campaign tracking)
      scope.setUser(null);

      // Clear marketing-specific tags (preserve non-marketing tags if any)
      if (this.originalScopeData.tags) {
        Object.keys(this.originalScopeData.tags).forEach((tagKey) => {
          // Clear tags that are typically used for marketing/behavioral analysis
          if (this.isMarketingTag(tagKey)) {
            scope.setTag(tagKey, undefined);
          }
        });
      }

      // Clear marketing context
      scope.setContext('marketing', null);
      scope.setContext('campaign', null);
      scope.setContext('cohort', null);

      this.log(
        'Cleared marketing-related scope data (user identification, campaign tags)'
      );
    } else if (this.originalScopeData) {
      // Restore original scope data for marketing analysis
      const { user, tags, contexts } = this.originalScopeData;

      if (user) {
        scope.setUser(user);
        this.log('Restored user identification for marketing analysis', {
          userId: user.id,
        });
      }

      if (tags) {
        Object.entries(tags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
        this.log(
          'Restored marketing tags for A/B testing and campaign tracking'
        );
      }

      if (contexts) {
        Object.entries(contexts).forEach(([key, value]) => {
          scope.setContext(key, value);
        });
      }

      this.log('Restored marketing-related scope data for behavioral analysis');
    }
  }

  private isMarketingTag(tagKey: string): boolean {
    // Common marketing/behavioral analysis tag patterns
    const marketingTagPatterns = [
      'campaign',
      'cohort',
      'segment',
      'experiment',
      'variant',
      'source',
      'medium',
      'channel',
      'funnel',
      'journey',
      'user_type',
      'subscription',
      'plan',
      'tier',
    ];

    const lowerKey = tagKey.toLowerCase();
    return marketingTagPatterns.some((pattern) => lowerKey.includes(pattern));
  }

  private validateReplayPrivacySettings(): void {
    // Check if Replay integration is configured and warn about potentially unsafe settings
    const client = this.currentSentryHub?.getClient();
    if (!client) return;

    try {
      // Access integrations to check for replay configuration
      // In Sentry v8, integrations are accessed via the options object
      const options = client.getOptions();
      const integrations = options.integrations || [];

      // Debug: log integration information
      this.log('Available integrations', {
        count: Array.isArray(integrations)
          ? integrations.length
          : Object.keys(integrations).length,
        names: Array.isArray(integrations)
          ? integrations
              .map((i: any) => i.name || i.constructor?.name)
              .filter(Boolean)
          : Object.keys(integrations),
      });

      // Find replay integration
      const replayIntegration = Array.isArray(integrations)
        ? integrations.find(
            (integration: any) =>
              integration.name === 'Replay' ||
              integration.constructor?.name === 'Replay' ||
              integration.constructor?.name === 'ReplayIntegration'
          )
        : integrations['Replay'];

      if (replayIntegration && replayIntegration.getOptions) {
        const replayOptions = replayIntegration.getOptions();

        // Check for potentially unsafe settings
        const warnings: string[] = [];

        if (replayOptions.maskAllText === false) {
          warnings.push(
            'maskAllText: false (text content will be visible in recordings)'
          );
        }

        if (replayOptions.maskAllInputs === false) {
          warnings.push(
            'maskAllInputs: false (input values will be visible in recordings)'
          );
        }

        if (replayOptions.blockAllMedia === false) {
          warnings.push(
            'blockAllMedia: false (media content will be recorded)'
          );
        }

        if (replayOptions.networkCaptureBodies === true) {
          warnings.push(
            'networkCaptureBodies: true (request/response bodies will be captured)'
          );
        }

        if (warnings.length > 0) {
          console.warn(
            '[SentryZarazConsentIntegration] Privacy Warning: Session Replay has potentially unsafe settings:',
            warnings
          );
          this.log('Session Replay privacy warnings', { warnings });
          // Stop replay recording and track that we did so due to unsafe settings
          replayIntegration.stopRecording();
          this.replayStoppedDueToUnsafeSettings = true;
          this.log('Session Replay stopped due to unsafe privacy settings');
        } else {
          this.log('Session Replay appears to be using privacy-safe settings');
          // If we previously stopped due to unsafe settings, but now settings are safe, resume
          if (this.replayStoppedDueToUnsafeSettings) {
            this.attemptReplayResume(replayIntegration);
          }
        }
      }
    } catch (error) {
      // Log detailed error information for debugging
      const errorInfo = {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined,
        hasClient: !!client,
        clientHasOptions: !!client?.getOptions,
      };
      this.log('Could not validate replay privacy settings', {
        error: errorInfo,
      });
    }
  }

  private attemptReplayResume(replayIntegration: any): void {
    try {
      // Try to start a new recording session
      if (typeof replayIntegration.startRecording === 'function') {
        replayIntegration.startRecording();
        this.replayStoppedDueToUnsafeSettings = false;
        this.log('Session Replay resumed - privacy settings are now safe');
        console.log(
          '[SentryZarazConsentIntegration] Session Replay resumed with safe privacy settings'
        );
      } else {
        // Fallback: log that manual intervention may be needed
        this.log(
          'Cannot automatically resume Session Replay - manual restart may be required'
        );
        console.warn(
          '[SentryZarazConsentIntegration] Cannot automatically resume Session Replay. Consider restarting the application or manually managing replay state.'
        );
      }
    } catch (error) {
      this.log('Failed to resume Session Replay recording', { error });
      console.warn(
        '[SentryZarazConsentIntegration] Failed to resume Session Replay recording:',
        error
      );
    }
  }

  private handleReplayConsentChange(
    previousPreferencesConsent: boolean | undefined,
    newPreferencesConsent: boolean | undefined
  ): void {
    // Only act if preferences consent specifically changed
    if (previousPreferencesConsent === newPreferencesConsent) {
      return;
    }

    this.log('Preferences consent changed', {
      from: previousPreferencesConsent,
      to: newPreferencesConsent,
      replayWasStopped: this.replayStoppedDueToUnsafeSettings,
    });

    // If preferences consent was just granted and we previously stopped replay due to unsafe settings
    if (newPreferencesConsent && this.replayStoppedDueToUnsafeSettings) {
      this.log(
        'Preferences consent granted - checking if Session Replay can be resumed'
      );

      // Re-validate privacy settings to see if we can resume
      const client = this.currentSentryHub?.getClient();
      if (client) {
        try {
          const options = client.getOptions();
          const integrations = options.integrations || [];
          const replayIntegration = Array.isArray(integrations)
            ? integrations.find(
                (integration: any) =>
                  integration.name === 'Replay' ||
                  integration.constructor?.name === 'Replay' ||
                  integration.constructor?.name === 'ReplayIntegration'
              )
            : integrations['Replay'];

          if (replayIntegration) {
            // This will check settings and potentially resume if they're now safe
            this.validateReplayPrivacySettings();
          }
        } catch (error) {
          this.log('Could not check replay integration for resume', { error });
        }
      }
    }

    // If preferences consent was revoked, reset the stopped flag
    if (!newPreferencesConsent) {
      this.replayStoppedDueToUnsafeSettings = false;
      this.log('Preferences consent revoked - reset replay stop flag');
    }
  }

  private updateIntegrationConfigs(consentState: ConsentState): void {
    // Note: Integration configs are typically set at initialization time in Sentry.
    // Dynamic updates to integration configurations would require more complex
    // integration management that's beyond the scope of this consent integration.
    //
    // However, the main Sentry configuration changes (sample rates, PII settings, etc.)
    // applied in buildConsentBasedConfig() effectively control integration behavior:
    //
    // Analytics consent controls:
    // - tracesSampleRate: 0 → disables browserTracingIntegration traces
    // - maxBreadcrumbs: 0 → disables breadcrumbsIntegration collection
    // - beforeBreadcrumb: null → drops all breadcrumbs from any integration
    // - beforeSendTransaction: null → blocks all performance transactions
    //
    // Preferences consent controls:
    // - replaysSessionSampleRate: 0 → disables replayIntegration session recording
    // - sendDefaultPii: false → prevents PII collection across all integrations
    //
    // Marketing consent controls:
    // - Scope management in updateSentryScope() → removes user identification
    //
    // For more granular integration control, developers should configure integrations
    // with consent-aware settings in their initial Sentry.init() call.

    this.log('Integration behavior controlled via main Sentry configuration', {
      consentState,
      analytics: consentState.analytics
        ? 'enabled'
        : 'disabled (traces, breadcrumbs blocked)',
      preferences: consentState.preferences
        ? 'enabled'
        : 'disabled (replay, PII blocked)',
      marketing: consentState.marketing
        ? 'enabled'
        : 'disabled (user identification cleared)',
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

    // Reset replay state tracking
    this.replayStoppedDueToUnsafeSettings = false;
  }

  /**
   * Manually check and potentially resume Session Replay if it was stopped due to unsafe settings
   * This can be called by developers after they've fixed their replay integration configuration
   *
   * @returns boolean indicating whether replay was resumed
   */
  public checkAndResumeReplay(): boolean {
    if (!this.replayStoppedDueToUnsafeSettings) {
      this.log(
        'Session Replay was not stopped due to unsafe settings - no action needed'
      );
      return false;
    }

    if (!this.currentConsentState.preferences) {
      this.log(
        'Cannot resume Session Replay - preferences consent not granted'
      );
      return false;
    }

    this.log(
      'Manually checking Session Replay privacy settings for potential resume'
    );
    this.validateReplayPrivacySettings();

    // Return whether we successfully resumed (flag will be cleared if we did)
    return !this.replayStoppedDueToUnsafeSettings;
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
 *   replaysSessionSampleRate: 0.1, // Controlled by preferences consent
 *   integrations: [
 *     // Configure Session Replay with privacy-safe defaults BEFORE the consent integration
 *     Sentry.replayIntegration({
 *       maskAllText: true,           // Privacy-safe: mask all text content
 *       maskAllInputs: true,         // Privacy-safe: mask all input values
 *       blockAllMedia: true,         // Privacy-safe: block all media content
 *       networkCaptureBodies: false, // Privacy-safe: don't capture request/response bodies
 *       stickySession: true,         // Can be enabled as it doesn't expose PII
 *     }),
 *     // The consent integration will control when replay is active via sample rates
 *     sentryZarazConsentIntegration({
 *       purposeMapping: {
 *         functional: 'essential',
 *         analytics: 'analytics',
 *         preferences: 'personalization', // Controls Session Replay
 *         marketing: 'marketing'
 *       },
 *       debug: true
 *     })
 *   ]
 * });
 *
 * // Later, if you fix unsafe replay settings and want to manually resume:
 * const client = Sentry.getClient();
 * const options = client?.getOptions();
 * const consentIntegration = options?.integrations?.find(
 *   (i: any) => i.name === 'SentryZarazConsentIntegration'
 * );
 * if (consentIntegration?.checkAndResumeReplay) {
 *   const resumed = consentIntegration.checkAndResumeReplay();
 *   console.log('Replay resumed:', resumed);
 * }
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
