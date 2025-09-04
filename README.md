# Sentry Zaraz Consent Integration

[![npm version](https://badge.fury.io/js/@imviidx%2Fsentry-zaraz-consent-integration.svg)](https://badge.fury.io/js/@imviidx%2Fsentry-zaraz-consent-integration)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

A TypeScript wrapper around [`@imviidx/sentry-consent-integration`](https://github.com/imviidx/sentry-consent-integration) specifically designed for Cloudflare Zaraz consent management. This package provides a simplified API for integrating Sentry with Zaraz consent choices.

**🌐 [Live Demo](https://imviidx.github.io/sentry-zaraz-consent-integration/)**

## Features

- **🎯 Zaraz-Specific**: Purpose-built wrapper for Cloudflare Zaraz consent integration
- **⚡ Automatic Event Handling**: Listens to Zaraz consent events automatically
- **📦 Simple API**: Easy-to-use purpose mapping configuration
- **🛡️ Privacy Compliant**: Respect user consent for different data processing purposes
- **🔧 Flexible Mapping**: Support for boolean and array-based purpose mapping
- **📊 Debug Support**: Comprehensive logging for troubleshooting
- **🔄 Backward Compatible**: Maintains API compatibility with previous versions

## Quick Start

### Installation

```bash
npm install @imviidx/sentry-zaraz-consent-integration
```

### Basic Usage

```typescript
import { sentryZarazConsentIntegration } from '@imviidx/sentry-zaraz-consent-integration';
import * as Sentry from '@sentry/browser';

Sentry.init({
  dsn: 'your-sentry-dsn',
  integrations: [
    sentryZarazConsentIntegration({
      purposeMapping: {
        functional: ['essential'], // Requires 'essential' purpose to be granted
        analytics: ['analytics'], // Requires 'analytics' purpose to be granted
        marketing: ['marketing'], // Requires 'marketing' purpose to be granted
        preferences: ['preferences'], // Requires 'preferences' purpose to be granted
      },
      debug: true,
    }),
  ],
});
```

## API Reference

### sentryZarazConsentIntegration(options)

The main integration function for Cloudflare Zaraz consent management.

#### Options

| Property         | Type             | Required | Description                                                    |
| ---------------- | ---------------- | -------- | -------------------------------------------------------------- |
| `purposeMapping` | `PurposeMapping` | Yes      | Maps consent categories to Zaraz purpose IDs or boolean values |
| `zarazTimeout`   | `number`         | No       | Timeout in ms to wait for Zaraz to be ready (default: 30000)   |
| `debug`          | `boolean`        | No       | Enable debug logging (default: false)                          |

#### PurposeMapping

```typescript
interface PurposeMapping {
  functional?: string[] | boolean; // Core error tracking
  analytics?: string[] | boolean; // Performance monitoring
  preferences?: string[] | boolean; // PII and session replay
  marketing?: string[] | boolean; // User identification
}
```

#### Purpose Mapping Examples

```typescript
// Map to Zaraz purpose IDs
{
  functional: ['essential'],           // Requires 'essential' purpose
  analytics: ['analytics', 'stats'],   // Requires BOTH 'analytics' AND 'stats'
  preferences: ['personalization'],   // Requires 'personalization' purpose
  marketing: ['advertising']          // Requires 'advertising' purpose
}

// Mixed mapping with booleans
{
  functional: true,                   // Always granted
  analytics: ['analytics'],           // Requires 'analytics' purpose
  preferences: false,                 // Always denied
  marketing: ['marketing', 'ads']     // Requires BOTH purposes
}
```

### Utility Functions

#### isZarazConsentReady()

Checks if Zaraz consent API is ready and available.

```typescript
import { isZarazConsentReady } from '@imviidx/sentry-zaraz-consent-integration';

if (isZarazConsentReady()) {
  console.log('Zaraz consent API is ready');
}
```

#### getZarazConsentState(purposeMapping)

Gets the current consent state for all mapped purposes.

```typescript
import { getZarazConsentState } from '@imviidx/sentry-zaraz-consent-integration';

const mapping = {
  functional: ['essential'],
  analytics: ['analytics'],
};

const consentState = getZarazConsentState(mapping);
// Returns: { functional: boolean, analytics: boolean, marketing: boolean, preferences: boolean }
```

## Underlying Technology

This package is a wrapper around [`@imviidx/sentry-consent-integration`](https://github.com/imviidx/sentry-consent-integration), which provides the core consent management functionality. The wrapper handles:

- **Zaraz API Integration**: Automatically connects to `window.zaraz.consent` API
- **Event Listening**: Listens for `zarazConsentChoicesUpdated` and `zarazConsentAPIReady` events
- **Purpose Mapping**: Translates Zaraz purpose IDs to consent categories
- **Simplified Configuration**: Reduces boilerplate code for Zaraz users

## Purpose Mapping

The integration supports four consent categories that map to different Sentry features:

| Purpose         | Sentry Features                                                       | Description                                          |
| --------------- | --------------------------------------------------------------------- | ---------------------------------------------------- |
| **Functional**  | Core error tracking, session tracking, unhandled rejections           | Essential functionality for error monitoring         |
| **Analytics**   | Performance monitoring, traces, profiling, breadcrumbs                | Performance metrics and optimization data            |
| **Preferences** | Session replay, PII collection, user context, personalization         | Personal data and customized experiences             |
| **Marketing**   | User identification for A/B testing, feature flags, campaign tracking | User interaction and behavior analysis for marketing |

## Configuration Examples

### Basic Zaraz Integration

```typescript
import { sentryZarazConsentIntegration } from '@imviidx/sentry-zaraz-consent-integration';
import * as Sentry from '@sentry/browser';

Sentry.init({
  dsn: 'your-sentry-dsn',
  integrations: [
    sentryZarazConsentIntegration({
      purposeMapping: {
        functional: ['essential'],
        analytics: ['analytics'],
        marketing: ['marketing'],
        preferences: ['personalization'],
      },
      zarazTimeout: 30000, // 30 seconds
      debug: true,
    }),
  ],
});
```

### Advanced Purpose Mapping

```typescript
sentryZarazConsentIntegration({
  purposeMapping: {
    // Always allow functional tracking (essential for app operation)
    functional: true,

    // Require both analytics AND performance consent
    analytics: ['analytics', 'performance'],

    // Never allow marketing tracking in this configuration
    marketing: false,

    // Only allow personalization if user explicitly consents
    preferences: ['personalization', 'customization'],
  },
  debug: process.env.NODE_ENV === 'development',
});
```

## Integration Behavior

### Event Processing Flow

1. **Event Captured**: Sentry attempts to capture an event
2. **Consent Check**: Integration checks current Zaraz consent status
3. **Decision Making**:
   - ✅ **Consent Granted**: Event is allowed through
   - ❌ **Consent Denied**: Event is blocked
   - ⏳ **Zaraz Not Ready**: Event is blocked until Zaraz becomes available
4. **Real-time Updates**: When Zaraz consent changes, Sentry configuration updates immediately

### Sentry Configuration Adjustments

Based on consent status, the integration automatically adjusts:

```typescript
// Functional consent affects core tracking
autoSessionTracking: functionalConsent;
captureUnhandledRejections: functionalConsent;
enabled: functionalConsent;

// Analytics consent affects performance monitoring and detailed context
tracesSampleRate: analyticsConsent ? originalRate : 0;
profilesSampleRate: analyticsConsent ? originalRate : 0;
maxBreadcrumbs: analyticsConsent ? originalValue : 0;
attachStacktrace: analyticsConsent;

// Preferences consent affects PII and session replay (most privacy-sensitive)
sendDefaultPii: preferencesConsent;
replaysSessionSampleRate: preferencesConsent ? originalRate : 0;
replaysOnErrorSampleRate: preferencesConsent ? originalRate : 0;

// Marketing consent affects user identification and behavioral tracking
initialScope: marketingConsent
  ? {
      user: { id: userId, segment: userSegment },
      tags: { campaign: campaignId, cohort: userCohort },
    }
  : {};
```

````

## Demo

The package includes a demo that shows the integration working with Cloudflare Zaraz consent management. The demo uses `fake-cloudflare-zaraz-consent` to simulate a real Zaraz environment.

To run the demo:

```bash
npm run demo:install
npm run demo:dev
````

Visit [http://localhost:3000](http://localhost:3000) to see the integration in action.

## Migration Guide

### From v2.x (Generic Package)

If you're upgrading from the generic `sentry-consent-integration` v2.x:

```typescript
// Before (v2.x - generic)
import { sentryConsentIntegration } from 'sentry-consent-integration';

sentryConsentIntegration({
  getConsentState: () => ({
    functional: window.zaraz?.consent?.get('essential') ?? false,
    analytics: window.zaraz?.consent?.get('analytics') ?? false,
    // ... more Zaraz-specific code
  }),
  onConsentChange: (callback) => {
    document.addEventListener('zarazConsentChoicesUpdated', callback);
    // ... more Zaraz event handling
  },
});

// After (v3.x - Zaraz-specific wrapper)
import { sentryZarazConsentIntegration } from '@imviidx/sentry-zaraz-consent-integration';

sentryZarazConsentIntegration({
  purposeMapping: {
    functional: ['essential'],
    analytics: ['analytics'],
  },
});
```

### From v1.x (Legacy)

The v3.x API is backward compatible with v1.x:

```typescript
// v1.x and v3.x both work the same way
import { sentryZarazConsentIntegration } from '@imviidx/sentry-zaraz-consent-integration';

sentryZarazConsentIntegration({
  purposeMapping: {
    functional: ['essential'],
    analytics: ['analytics'],
    marketing: ['marketing'],
    preferences: ['personalization'],
  },
  debug: true,
});
```

## Browser Compatibility

- ES2020+ support required
- Modern browsers (Chrome 80+, Firefox 74+, Safari 13.1+, Edge 80+)
- ES Modules support
- Cloudflare Zaraz environment

## Dependencies

### Required Dependencies

- `@imviidx/sentry-consent-integration`: Core consent management functionality
- `zaraz-ts`: TypeScript definitions for Zaraz APIs

### Required Peer Dependencies

- `@sentry/browser` OR `@sentry/react` OR `@sentry/vue` (^8.29.0)
- `@sentry/types` (^8.29.0)

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes and add tests
4. Update CHANGELOG.md with your changes
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- 🌐 [Live Demo](https://imviidx.github.io/sentry-zaraz-consent-integration/)
- 📚 [Demo Documentation](demo/README.md)
- 🐛 [Issue Tracker](https://github.com/imviidx/sentry-zaraz-consent-integration/issues)
- 📝 [Changelog](CHANGELOG.md)
- 🔧 [Base Integration](https://github.com/imviidx/sentry-consent-integration) - The underlying generic consent integration
