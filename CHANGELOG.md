# Changelog

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
