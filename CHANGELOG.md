# Changelog

## [3.0.0] - 2025-09-03

### Major Refactoring 🔄

- **Architecture Change**: Complete refactoring to wrap `@imviidx/sentry-consent-integration` instead of implementing consent logic directly
- **Package Focus**: Now specifically focused on Cloudflare Zaraz consent integration as a wrapper package
- **Simplified Implementation**: Reduced codebase by ~90% by leveraging the robust generic consent integration
- **Maintained API Compatibility**: Preserved the same API surface for seamless migration

### New Architecture 🏗️

- **Wrapper Implementation**: Now acts as a Zaraz-specific wrapper around `@imviidx/sentry-consent-integration`
- **Automatic Zaraz Integration**: Handles all Zaraz API interactions automatically (`window.zaraz.consent`, events)
- **Purpose Mapping Translation**: Converts simple purpose mapping to the underlying generic consent state getters
- **Event Handling**: Automatically listens for `zarazConsentChoicesUpdated` and `zarazConsentAPIReady` events

### Benefits ✨

- **Reduced Bundle Size**: Significantly smaller package by delegating core logic to the well-tested base integration
- **Better Maintenance**: Leverages community-maintained generic consent integration
- **Enhanced Reliability**: Benefits from the robust event handling and state management of the base package
- **Focused Purpose**: Package now has a clear, single responsibility for Zaraz integration

### Breaking Changes 💥

- **Dependencies**: Now requires `@imviidx/sentry-consent-integration` as a dependency
- **Package Name**: Reverted from `sentry-consent-integration` back to `sentry-zaraz-consent-integration` to reflect focused purpose
- **Internal Implementation**: Complete rewrite of internal logic (API remains the same)

### Migration Guide 📚

**From v2.x users**: Update package name back to `sentry-zaraz-consent-integration`

```bash
npm uninstall sentry-consent-integration
npm install sentry-zaraz-consent-integration
```

**API remains identical**: No code changes needed in your Sentry.init() configuration

```typescript
// Same API as v1.x and v2.x
import { sentryZarazConsentIntegration } from 'sentry-zaraz-consent-integration';

Sentry.init({
  integrations: [
    sentryZarazConsentIntegration({
      purposeMapping: {
        functional: ['essential'],
        analytics: ['analytics'],
        // ... same as before
      },
    }),
  ],
});
```

**For users who want generic consent integration**: Use `@imviidx/sentry-consent-integration` directly

### Technical Improvements ⚡

- **TypeScript Enhancements**: Better type safety with re-exported types from base integration
- **Zaraz Type Integration**: Enhanced integration with `zaraz-ts` types
- **Error Handling**: Improved error handling through the base integration
- **Performance**: Better performance through optimized event handling

## [2.0.0] - 2025-09-02

### Breaking Changes 💥

- **Package Renamed**: `sentry-zaraz-consent-integration` → `sentry-consent-integration`
- **Generic Consent Integration**: Complete redesign to work with any consent management system, not just Cloudflare Zaraz
- **New Callback-Based API**: Integration now accepts callback functions instead of hardcoded Zaraz integration
- **Removed Legacy Code**: Completely removed Zaraz-specific wrapper and dependencies
- **Removed Zaraz Dependencies**: Package no longer depends on `zaraz-ts` or includes Zaraz-specific code

### New Generic API 🚀

- **sentryConsentIntegration()**: Main integration function with callback-based architecture
  - `getConsentState: () => ConsentState` - Function to retrieve current consent state
  - `onConsentChange: (callback) => cleanup` - Function to listen for consent changes
  - `isConsentReady?: () => boolean` - Optional function to check if consent system is ready
  - `consentReadyTimeout?: number` - Configurable timeout for consent system readiness

### Clean Architecture ✨

- **No Legacy Wrappers**: Removed all Zaraz-specific compatibility code
- **Focused Purpose**: Package now exclusively provides generic consent integration
- **Smaller Bundle**: Reduced dependencies and cleaner codebase

### Migration Guide 📚

**For Zaraz users**: Create a separate wrapper package or use the demo's `DemoConsentManager` as a reference:

```typescript
// Create your own Zaraz wrapper
class ZarazConsentManager {
  getConsentState() {
    // Your Zaraz-specific logic here
    return { functional: true, analytics: false /* ... */ };
  }

  onConsentChange(callback) {
    document.addEventListener('zarazConsentChoicesUpdated', callback);
    return () =>
      document.removeEventListener('zarazConsentChoicesUpdated', callback);
  }

  isReady() {
    return window?.zaraz?.consent?.APIReady || false;
  }
}

// Use with generic integration
sentryConsentIntegration({
  getConsentState: () => zarazManager.getConsentState(),
  onConsentChange: (callback) => zarazManager.onConsentChange(callback),
  isConsentReady: () => zarazManager.isReady(),
});
```

### Demo Updates 🎯

- **Demo Updated**: Demo now uses the generic integration with a `DemoConsentManager` wrapper
- **Still Uses Fake Zaraz**: Demo continues to showcase consent integration using `fake-cloudflare-zaraz-consent`
- **Reference Implementation**: Demo provides a complete example of how to wrap any consent system

### Technical Improvements ⚡

- **Cleaner Architecture**: Focused exclusively on generic consent handling
- **Better Testing**: Generic callbacks make the integration easier to test with any consent system
- **Reduced Bundle Size**: Removed all Zaraz-specific dependencies
- **TypeScript Excellence**: Enhanced type safety with simplified API surface

## [1.2.0] - 2025-09-02

### Enhanced Privacy Compliance 🛡️

- **Corrected Session Replay Purpose Mapping**: Fixed inconsistency between documentation and implementation
  - **README.md Updated**: Moved Session Replay from `marketing` to `preferences` purpose in documentation
  - **Implementation Aligned**: Session Replay (`replaysSessionSampleRate`, `replaysOnErrorSampleRate`) now correctly documented as controlled by `preferences` consent
  - **Privacy-Conscious Approach**: Session Replay is now properly categorized as one of the most privacy-sensitive features

### Improved Purpose Definitions 📋

- **Enhanced Purpose Table**: Updated README.md with clearer descriptions of each consent purpose:
  - **Functional**: Core error tracking, session tracking, unhandled rejections - Essential functionality
  - **Analytics**: Performance monitoring, traces, profiling, breadcrumbs - Performance metrics and optimization
  - **Preferences**: Session replay, PII collection, user context, personalization - Personal data and customized experiences
  - **Marketing**: User identification for A/B testing, feature flags, campaign tracking - User interaction and behavior analysis for marketing

### Documentation Enhancements 📚

- **Marketing Purpose Clarification**: Added detailed explanation that `marketing` consent is primarily for user identification within `initialScope` (user.id, campaign tags, A/B testing cohorts) and feature flag integrations, distinguishing it from `preferences` consent which handles raw PII and screen recordings
- **Privacy-by-Default Emphasis**: Enhanced documentation to emphasize that Session Replay uses Sentry's safest defaults (maskAllText: true, maskAllInputs: true, blockAllMedia: true) even when preferences consent is granted
- **Configuration Examples**: Updated Sentry configuration adjustment examples to show correct purpose mappings
- **Code Comments**: Enhanced implementation comments to clarify that Session Replay is among the most privacy-sensitive features

### GDPR & Privacy Alignment 🎯

- **Data Minimization Support**: Integration now better supports GDPR data minimization by correctly categorizing Session Replay as privacy-sensitive
- **Consent Granularity**: Improved consent purpose definitions align with privacy best practices for different types of data collection
- **Clear Privacy Boundaries**: Better distinction between analytical performance data (analytics) and personal behavior recordings (preferences)

## [1.1.0] - 2025-09-02

### Breaking Changes

- **Simplified Integration API**: `sentryZarazConsentIntegration` now only accepts `purposeMapping` and `debug` props
  - Removed `sentryConfig` and `integrationConfig` options from integration parameters
  - Sentry configuration (sendDefaultPii, maxBreadcrumbs, etc.) should now be set directly in `Sentry.init()`
  - Integration automatically reads configuration from the Sentry instance during initialization
  - This change makes the API cleaner and follows Sentry's recommended patterns
  - **Migration**: Move all `sentryConfig` properties to the top-level `Sentry.init()` options

### Updated

- **fake-cloudflare-zaraz-consent**: Upgraded from v1.2.2 to v1.3.1
  - Updated function calls from `initializeZarazConsentTools` to `initFakeZaraz` to match new API
  - Maintained compatibility with existing functionality while using updated API

### Enhanced

- **Live Demo Available**: Interactive demo now available at https://pod666.github.io/sentry-zaraz-consent-integration/
- **Upgraded to Tailwind CSS v4**: Demo now uses Tailwind CSS v4 with modern architecture
  - Replaced PostCSS configuration with native Vite plugin approach
  - Updated CSS imports to use `@import "tailwindcss"` syntax
  - Removed traditional config files in favor of auto-detection
  - Improved build performance and modern CSS features
  - Better CSS custom properties and utility class generation

### Breaking Changes

- **Removed timeout behavior**: Removed `timeout` option and automatic consent timeout functionality. Integration now keeps consent as "not accepted" by default and only processes events when explicit consent is granted
- **Enhanced monitoring**: Replaced timeout with warning logging at 20 seconds and error logging at 45 seconds when Zaraz consent API is not available

### Enhanced

- **Fully Event-Driven Architecture**: Replaced all polling mechanisms with proper event listeners
  - **Consent Changes**: Now uses `zarazConsentChoicesUpdated` event instead of polling every second
  - **Zaraz Loading**: Now uses `zarazLoaded` event instead of polling every 100ms for API readiness
- **Improved Performance**: Eliminated all background polling that was consuming CPU cycles continuously
- **Better Resource Management**: Proper cleanup of all event listeners in the cleanup method
- **Immediate Response**: Both Zaraz loading and consent changes are detected instantly via events
- **Standards Compliant**: Uses official Zaraz event names throughout the integration

### Breaking Changes

- **Removed `setConsent` function**: Consent setting functionality removed from the Sentry integration package as it's outside the scope of a monitoring integration
- **Cleaner API surface**: Integration now focuses solely on reading consent status, not modifying it

### Enhanced

- **Migrated Demo to Vite**: Demo project now uses Vite for better development experience and modern build tooling
- **Package Dependencies**: Demo now properly depends on `zaraz-ts` package and parent `sentry-zaraz-consent-integration` package
- **Improved Type Safety**: Enhanced integration with `zaraz-ts` package for better type safety and API compatibility
- **ES Module Support**: Full ES module support with proper import/export declarations
- **Modern Development Stack**: TypeScript + Vite configuration for optimal development workflow
- **Robust Event Handling**: Replaced custom `getZaraz` implementation with `zaraz-ts`'s sophisticated version featuring:
  - Automatic event queuing when Zaraz is not yet available
  - Event flushing when Zaraz becomes available
  - Better error handling and debugging logs
  - Proper handling of edge cases (e.g., undefined window)
- **Demo Uses zaraz-ts Directly**: Demo now uses `zaraz-ts` consent utilities directly for setting consent preferences
- **Hybrid API Approach**: Maintained precise type definitions while leveraging `zaraz-ts` utility functions where beneficial
- **Direct Import Strategy**: Utilized direct imports from `zaraz-ts/build/helpers/get-zaraz` to access non-exported robust implementations

### Technical Improvements

- **Vite Configuration**: Added comprehensive Vite setup with TypeScript support
- **Package Structure**: Proper package.json with exports, types, and file declarations
- **Development Scripts**: Updated scripts to work with Vite development server
- **Module Resolution**: Enhanced import resolution with proper dependency management
- **Environment Variables**: Proper environment detection using Vite's import.meta.env
- **Build Optimization**: Optimized build process for both development and production
- Added utility functions from `zaraz-ts` for consent operations (`getAllConsentStatuses`, `getConsentForPurpose`, `setConsentPreferences`)
- Maintained custom typed interfaces for maximum type safety while avoiding conflicts with `zaraz-ts` generic types
- Enhanced compatibility between custom implementation and `zaraz-ts` utilities
- Improved event queuing and reliability through battle-tested `zaraz-ts` implementation
- Demo now includes fallback handling when using `zaraz-ts` consent utilities

### Development Improvements

- **Root Package Scripts**: Added `demo:install`, `demo:dev`, `demo:build`, `demo:preview` scripts for seamless demo management
- **Hot Module Replacement**: Vite provides instant updates during development
- **Source Maps**: Enhanced debugging with proper source map generation
- **TypeScript Support**: Full TypeScript support in demo with proper type checking

## [1.0.0] - 2025-08-29

### Added

- Initial release of Sentry Zaraz Consent Integration
- Core integration that adjusts Sentry configuration based on Zaraz consent status
- Support for purpose-based consent mapping (functional, analytics, marketing, preferences)
- Event queuing system for handling events during consent determination
- Real-time consent monitoring and configuration updates
- Comprehensive demo project showcasing integration capabilities

### Features

- **SentryZarazConsentIntegration**: Main integration class with configurable purpose mapping
- **Event Processing**: Queue events when consent is unknown, process when consent is granted
- **Dynamic Configuration**: Real-time Sentry settings adjustment based on consent changes
- **Purpose Mapping**: Flexible mapping between Zaraz consent purposes and Sentry features
- **Graceful Fallback**: Handles scenarios where Zaraz is not available with configurable timeout
- **Debug Logging**: Comprehensive logging for troubleshooting and monitoring

### Demo Project

- Interactive web demo demonstrating all integration features
- Fake Zaraz consent simulation for local development
- Real-time consent toggle controls
- Sentry event testing buttons (errors, messages, transactions, breadcrumbs)
- Console log monitoring with real-time display
- Environment-aware setup (development vs production)

### Development

- TypeScript source code with comprehensive type definitions
- Build scripts for both integration and demo
- Development server setup with hot reloading
- Configurable build targets (ES2020 modules)

### Dependencies

- `@sentry/react`: Sentry SDK for React applications
- `@sentry/types`: Sentry TypeScript type definitions
- `fake-cloudflare-zaraz-consent`: Local development simulation of Zaraz consent
- `zaraz-ts`: TypeScript definitions for Zaraz APIs

### Scripts

- `npm run build`: Build the integration TypeScript files
- `npm run build:watch`: Build in watch mode for development
- `npm run demo:build`: Build both integration and demo files
- `npm run demo:dev`: Start development server with demo on port 3000
