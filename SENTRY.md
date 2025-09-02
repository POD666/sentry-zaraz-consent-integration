# Sentry Configuration Options and Consent Requirements

This document provides a comprehensive overview of all Sentry configuration options and integration settings, along with the consent purposes that should control each configuration based on privacy and data collection requirements.

**🛡️ Privacy-First Approach**: This guide emphasizes data minimization and privacy-by-default practices, ensuring that the most privacy-sensitive features (like Session Replay) are properly categorized and controlled. The purpose mappings align with GDPR requirements for consent granularity and data protection.

## Configuration Options

| Configuration         | Type            | Default      | Description                                             | Required Consent Purpose | No Purpose Value     |
| --------------------- | --------------- | ------------ | ------------------------------------------------------- | ------------------------ | -------------------- |
| `dsn`                 | string          | -            | The DSN tells the SDK where to send events              | -                        |                      |
| `debug`               | boolean         | `false`      | Enables debug mode for SDK diagnostics                  | -                        |                      |
| `release`             | string          | -            | Sets the release version for events                     | -                        |                      |
| `environment`         | string          | `production` | Sets the environment (dev, staging, prod)               | -                        |                      |
| `tunnel`              | string          | -            | Custom URL for transporting events (bypass ad-blockers) | -                        |                      |
| `sendDefaultPii`      | boolean         | `false`      | **Send default PII data including IP addresses**        | **preferences**          | `false`              |
| `maxBreadcrumbs`      | number          | `100`        | Maximum number of breadcrumbs to capture                | analytics                | `0`                  |
| `attachStacktrace`    | boolean         | `false`      | Attach stack traces to all messages                     | analytics                | `false`              |
| `initialScope`        | object/function | -            | Initial scope data (tags, user, context)                | marketing                | `undefined`          |
| `maxValueLength`      | number          | `250`        | Maximum string length before truncation                 | -                        |                      |
| `normalizeDepth`      | number          | `3`          | Data normalization depth                                | -                        |                      |
| `normalizeMaxBreadth` | number          | `1000`       | Maximum properties per object/array                     | -                        |                      |
| `enabled`             | boolean         | `true`       | Whether SDK should send events to Sentry                | functional               | `false`              |
| `sendClientReports`   | boolean         | `true`       | Send client status reports                              | analytics                | `false`              |
| `integrations`        | array/function  | `[]`         | Additional integrations to enable                       | varies by integration    | `[]` (empty array)   |
| `defaultIntegrations` | boolean         | `undefined`  | Control default integrations                            | varies by integration    | `false`              |
| `beforeBreadcrumb`    | function        | -            | Filter/modify breadcrumbs before adding                 | analytics                | Drop all breadcrumbs |
| `transport`           | function        | -            | Custom transport implementation                         | -                        |                      |
| `transportOptions`    | object          | -            | Transport configuration options                         | -                        |                      |
| `sampleRate`          | number          | `1.0`        | Sample rate for error events (0.0-1.0)                  | functional               | `0.0`                |
| `beforeSend`          | function        | -            | Filter/modify events before sending                     | functional               | Block all events     |
| `ignoreErrors`        | array           | `[]`         | Error messages to filter out                            | -                        |                      |
| `denyUrls`            | array           | `[]`         | Script URLs to ignore errors from                       | -                        |                      |
| `allowUrls`           | array           | `[]`         | Only capture errors from these URLs                     | -                        |                      |

## Performance Monitoring Options

| Configuration             | Type     | Default | Description                               | Required Consent Purpose | No Purpose Value   |
| ------------------------- | -------- | ------- | ----------------------------------------- | ------------------------ | ------------------ |
| `tracesSampleRate`        | number   | -       | Transaction sampling rate (0.0-1.0)       | **analytics**            | `0.0`              |
| `tracesSampler`           | function | -       | Custom transaction sampling logic         | **analytics**            | Block all traces   |
| `tracePropagationTargets` | array    | -       | URLs to attach tracing headers to         | **analytics**            | `[]` (empty array) |
| `beforeSendTransaction`   | function | -       | Filter/modify transactions before sending | **analytics**            | Block all traces   |
| `beforeSendSpan`          | function | -       | Filter/modify spans before sending        | **analytics**            | Block all spans    |
| `ignoreTransactions`      | array    | `[]`    | Transaction names to ignore               | -                        |                    |
| `ignoreSpans`             | array    | `[]`    | Span names/operations to ignore           | -                        |                    |

## Session Replay Options

| Configuration              | Type   | Default | Description                                | Required Consent Purpose | No Purpose Value |
| -------------------------- | ------ | ------- | ------------------------------------------ | ------------------------ | ---------------- |
| `replaysSessionSampleRate` | number | -       | Sample rate for session recordings         | **preferences**          | `0.0`            |
| `replaysOnErrorSampleRate` | number | -       | Sample rate for error-triggered recordings | **preferences**          | `0.0`            |

## Profiling Options

| Configuration        | Type   | Default | Description                           | Required Consent Purpose | No Purpose Value |
| -------------------- | ------ | ------- | ------------------------------------- | ------------------------ | ---------------- |
| `profilesSampleRate` | number | -       | Sample rate for performance profiling | **analytics**            | `0.0`            |

## Integration-Specific Configurations

Many integrations have their own configuration options that should also be controlled based on consent. Here are the key configurations for major integrations:

### Replay Integration (`replayIntegration`)

| Configuration Option      | Type     | Default | Description                               | Required Consent Purpose | No Purpose Value |
| ------------------------- | -------- | ------- | ----------------------------------------- | ------------------------ | ---------------- |
| `stickySession`           | boolean  | `true`  | Track user across page refreshes          | **preferences**          | `false`          |
| `maskAllText`             | boolean  | `true`  | Mask all text content in recordings       | **preferences**          | `true`           |
| `maskAllInputs`           | boolean  | `true`  | Mask all input values                     | **preferences**          | `true`           |
| `blockAllMedia`           | boolean  | `true`  | Block all media elements                  | **preferences**          | `true`           |
| `networkDetailAllowUrls`  | array    | `[]`    | Capture request/response details for URLs | **preferences**          | `[]`             |
| `networkCaptureBodies`    | boolean  | `true`  | Capture request/response bodies           | **preferences**          | `false`          |
| `networkRequestHeaders`   | array    | `[]`    | Additional request headers to capture     | **preferences**          | `[]`             |
| `networkResponseHeaders`  | array    | `[]`    | Additional response headers to capture    | **preferences**          | `[]`             |
| `beforeAddRecordingEvent` | function | -       | Filter recording events                   | **preferences**          | Block all events |

> **🛡️ Privacy-by-Default for Session Replay**: The integration enforces the safest Session Replay settings by default, even when `preferences` consent is granted. Sentry's defaults (maskAllText: true, maskAllInputs: true, blockAllMedia: true) ensure privacy protection. Developers must explicitly override these settings in their `replayIntegration()` configuration if they need to unmask specific elements for debugging purposes.

### Browser Tracing Integration (`browserTracingIntegration`)

| Configuration Option | Type     | Default | Description                     | Required Consent Purpose | No Purpose Value |
| -------------------- | -------- | ------- | ------------------------------- | ------------------------ | ---------------- |
| `traceFetch`         | boolean  | `true`  | Trace fetch requests            | **analytics**            | `false`          |
| `traceXHR`           | boolean  | `true`  | Trace XHR requests              | **analytics**            | `false`          |
| `enableLongTask`     | boolean  | `true`  | Track long tasks                | **analytics**            | `false`          |
| `enableInp`          | boolean  | `true`  | Track Interaction to Next Paint | **analytics**            | `false`          |
| `beforeNavigate`     | function | -       | Filter navigation transactions  | **analytics**            | Block all        |
| `beforeStartSpan`    | function | -       | Filter spans before creation    | **analytics**            | Block all        |
| `idleTimeout`        | number   | `1000`  | Idle timeout for transactions   | **analytics**            |                  |
| `markBackgroundSpan` | boolean  | `true`  | Mark background spans           | **analytics**            | `false`          |

### Browser Profiling Integration (`browserProfilingIntegration`)

| Configuration Option | Type   | Default | Description                   | Required Consent Purpose | No Purpose Value |
| -------------------- | ------ | ------- | ----------------------------- | ------------------------ | ---------------- |
| `maxProfileDuration` | number | `30000` | Maximum profile duration (ms) | **analytics**            | `0`              |

### Capture Console Integration (`captureConsoleIntegration`)

| Configuration Option | Type  | Default                                               | Description               | Required Consent Purpose | No Purpose Value |
| -------------------- | ----- | ----------------------------------------------------- | ------------------------- | ------------------------ | ---------------- |
| `levels`             | array | `['log', 'info', 'warn', 'error', 'debug', 'assert']` | Console levels to capture | **analytics**            | `[]`             |

### HTTP Client Integration (`httpClientIntegration`)

| Configuration Option       | Type    | Default      | Description                          | Required Consent Purpose | No Purpose Value |
| -------------------------- | ------- | ------------ | ------------------------------------ | ------------------------ | ---------------- |
| `breadcrumbs`              | boolean | `true`       | Create breadcrumbs for HTTP requests | **analytics**            | `false`          |
| `tracing`                  | boolean | `true`       | Create spans for HTTP requests       | **analytics**            | `false`          |
| `failedRequestStatusCodes` | array   | `[500, 599]` | Status codes considered failures     | **analytics**            | `[]`             |

### Feature Flags Integrations

| Integration               | Configuration Option | Type   | Default | Description             | Required Consent Purpose | No Purpose Value |
| ------------------------- | -------------------- | ------ | ------- | ----------------------- | ------------------------ | ---------------- |
| `launchDarklyIntegration` | `flagKey`            | string | -       | LaunchDarkly flag key   | **marketing**            | `undefined`      |
| `statsigIntegration`      | `statsigClient`      | object | -       | Statsig client instance | **marketing**            | `undefined`      |
| `unleashIntegration`      | `unleashClient`      | object | -       | Unleash client instance | **marketing**            | `undefined`      |

### Breadcrumbs Integration (`breadcrumbsIntegration`)

| Configuration Option | Type    | Default | Description                       | Required Consent Purpose | No Purpose Value |
| -------------------- | ------- | ------- | --------------------------------- | ------------------------ | ---------------- |
| `console`            | boolean | `true`  | Capture console breadcrumbs       | **analytics**            | `false`          |
| `dom`                | boolean | `true`  | Capture DOM event breadcrumbs     | **analytics**            | `false`          |
| `fetch`              | boolean | `true`  | Capture fetch request breadcrumbs | **analytics**            | `false`          |
| `history`            | boolean | `true`  | Capture navigation breadcrumbs    | **analytics**            | `false`          |
| `sentry`             | boolean | `true`  | Capture Sentry event breadcrumbs  | **analytics**            | `false`          |
| `xhr`                | boolean | `true`  | Capture XHR request breadcrumbs   | **analytics**            | `false`          |

### Context Lines Integration (`contextLinesIntegration`)

| Configuration Option | Type   | Default | Description                 | Required Consent Purpose | No Purpose Value |
| -------------------- | ------ | ------- | --------------------------- | ------------------------ | ---------------- |
| `frameContextLines`  | number | `5`     | Number of source code lines | **analytics**            | `0`              |

## Consent Purpose Definitions

| Purpose         | Description                                                                         | Typical Use Cases                                                                                                                    |
| --------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **functional**  | Essential functionality required for basic error monitoring                         | Core error tracking, unhandled exceptions, basic session health (`autoSessionTracking`), basic SDK operation                         |
| **analytics**   | Performance monitoring, detailed context, and usage analytics                       | Performance tracing, breadcrumbs, detailed context, profiling, detailed session analytics                                            |
| **preferences** | User-specific data and personally identifiable information (most privacy-sensitive) | IP addresses, **session replays**, user profiles, detailed personal context, PII collection                                          |
| **marketing**   | User identification and behavioral analysis for marketing purposes                  | User identification within `initialScope` (user.id, campaign tags), A/B test analytics, feature flag integrations, marketing cohorts |

> **Privacy Note**: Session Replay is categorized under **preferences** as it's one of the most privacy-sensitive features, capable of capturing user interactions and potentially PII. Even with consent, Sentry's Session Replay defaults to privacy-safe settings (maskAllText: true, maskAllInputs: true, blockAllMedia: true).

## Implementation Recommendations

### Basic Error Monitoring (functional consent only)

```javascript
Sentry.init({
  dsn: 'YOUR_DSN',
  enabled: true,
  sendDefaultPii: false,
  integrations: [
    Sentry.browserApiErrorsIntegration(),
    Sentry.globalHandlersIntegration(),
    Sentry.linkedErrorsIntegration(),
    Sentry.webWorkerIntegration(),
  ],
});
```

### Enhanced Monitoring (functional + analytics consent)

```javascript
Sentry.init({
  dsn: 'YOUR_DSN',
  enabled: true,
  sendDefaultPii: false,
  sampleRate: 1.0,
  tracesSampleRate: 0.1,
  maxBreadcrumbs: 100,
  attachStacktrace: true,
  integrations: [
    // All functional integrations +
    Sentry.breadcrumbsIntegration({
      console: true,
      dom: true,
      fetch: true,
      history: true,
      xhr: true,
    }),
    Sentry.browserSessionIntegration(),
    Sentry.browserTracingIntegration({
      traceFetch: true,
      traceXHR: true,
      enableLongTask: true,
    }),
    Sentry.captureConsoleIntegration({
      levels: ['error', 'warn'],
    }),
    Sentry.contextLinesIntegration({
      frameContextLines: 5,
    }),
    Sentry.httpContextIntegration(),
    Sentry.httpClientIntegration({
      breadcrumbs: true,
      tracing: true,
    }),
    Sentry.reportingObserverIntegration(),
  ],
});
```

### Full Monitoring (functional + analytics + preferences consent)

```javascript
Sentry.init({
  dsn: 'YOUR_DSN',
  enabled: true,
  sendDefaultPii: true, // NOW ALLOWED
  sampleRate: 1.0,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  profilesSampleRate: 0.1,
  maxBreadcrumbs: 100,
  attachStacktrace: true,
  integrations: [
    // All previous integrations +
    Sentry.replayIntegration({
      stickySession: true,
      maskAllText: false, // More detailed recording allowed
      networkDetailAllowUrls: [window.location.origin],
      networkCaptureBodies: true,
      networkRequestHeaders: ['Authorization'],
      networkResponseHeaders: ['Content-Type'],
    }),
    Sentry.replayCanvasIntegration(),
  ],
});
```

### Marketing Consent Example (functional + analytics + preferences + marketing)

> **Marketing Purpose Focus**: This example shows how `marketing` consent specifically enables user identification and behavioral tracking for marketing purposes - distinct from the PII collection under `preferences` consent or performance analytics under `analytics` consent.

```javascript
Sentry.init({
  dsn: 'YOUR_DSN',
  enabled: true,
  sendDefaultPii: true,
  initialScope: {
    // User identification for marketing analysis and A/B testing cohorts
    user: { id: userId, email: userEmail },
    tags: {
      segment: userSegment,
      cohort: userCohort,
      campaign: campaignId,
    },
  },
  // ... all other configurations
  integrations: [
    // All previous integrations +
    Sentry.launchDarklyIntegration({
      flagKey: 'user-tracking-enabled',
    }),
    Sentry.statsigIntegration({
      statsigClient: statsigInstance,
    }),
  ],
});
```

## Dynamic Configuration Updates

The Sentry Zaraz Consent Integration should dynamically update these configurations based on consent changes:

1. **Functional consent revoked**: Disable the SDK entirely (`enabled: false`, `sampleRate: 0.0`)
2. **Analytics consent revoked**: Remove performance monitoring, breadcrumbs, and detailed context
3. **Preferences consent revoked**: Disable PII collection, **session replay** (most privacy-sensitive), and detailed network capture
4. **Marketing consent revoked**: Remove user identification, feature flag tracking, and marketing tags from `initialScope`
5. **Consent granted**: Enable corresponding features and process queued events

### Integration Configuration Updates

When consent changes, the integration should also update integration-specific configurations:

- **Analytics consent revoked**: Set integration configs like `traceFetch: false`, `breadcrumbs: false`, `levels: []`
- **Preferences consent revoked**: Set replay configs like `replaysSessionSampleRate: 0.0`, `networkCaptureBodies: false`, `stickySession: false`
- **Marketing consent revoked**: Remove feature flag integrations and clear user identification from scope

## Notes

- Configurations marked with **bold** consent purposes are particularly sensitive and should be carefully controlled
- The `-` in the consent purpose column indicates the configuration doesn't directly impact privacy and can be used regardless of consent status
- The "No Purpose Value" column shows what value to use when the required consent is not granted
- **Key insight**: `dsn` can always be set (it's just a configuration), but `enabled` and `sampleRate` control whether data is actually sent
- **Marketing consent usage**: Now used for user identification (`initialScope` with user data), feature flag integrations, and behavioral tracking
- **Integration configurations**: Many integrations have their own privacy-sensitive options that need consent control
- **Session Replay Privacy**: Session Replay is correctly categorized under **preferences** as one of the most privacy-sensitive features, capable of capturing user interactions and potentially PII
- **Session Tracking Distinction**: Basic session health tracking (`autoSessionTracking`) is **functional**, while detailed session analytics (`browserSessionIntegration`) is **analytics**
- When consent is revoked, existing data should not be retroactively removed, but new data collection should be stopped
- Consider implementing graceful degradation where core functionality remains available even with limited consent
