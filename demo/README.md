# Sentry Zaraz Consent Integration Demo

This demo showcases how the Sentry Zaraz Consent Integration dynamically adjusts Sentry configuration based on user consent preferences managed through Cloudflare Zaraz.

## Features Demonstrated

- **Real-time Consent Management**: Toggle consent purposes and see immediate effects on Sentry configuration
- **Purpose-based Configuration**: Different Sentry features are enabled/disabled based on specific consent purposes:
  - **Functional**: Core error tracking and essential functionality
  - **Analytics**: Performance monitoring, traces, and profiling
  - **Marketing**: Session replay and user behavior tracking
  - **Preferences**: PII collection and personalized tracking

## Architecture

This demo is built with:

- **Vite**: Modern build tool with hot module replacement
- **TypeScript**: Full type safety and modern JavaScript features
- **ES Modules**: Native module support with proper imports/exports
- **Package Dependencies**:
  - `sentry-zaraz-consent-integration`: The main integration package
  - `zaraz-ts`: TypeScript definitions and utilities for Zaraz
  - `@sentry/browser`: Sentry SDK for browsers
  - `fake-cloudflare-zaraz-consent`: Development simulation of Zaraz consent API

## Environment Setup

### Development Mode (Default)

- Uses `fake-cloudflare-zaraz-consent` package to simulate Zaraz consent API
- Fake Sentry DSN for testing without sending real data
- Debug logging enabled
- Hot module replacement for instant updates
- Served locally with Vite dev server

### Production Mode

- Expects real Cloudflare Zaraz to be available
- Uses real Sentry DSN (configure in `demo/src/main.ts`)
- Debug logging disabled
- Optimized build with source maps

## Purpose Mapping Configuration

The demo uses the following consent purpose mapping:

```typescript
const purposeMapping: PurposeMapping = {
  functional: ['necessary', 'functional'],
  analytics: ['analytics', 'performance'],
  marketing: ['marketing', 'advertising'],
  preferences: ['preferences', 'personalization'],
};
```

## Sentry Configuration Changes

Based on consent status, the integration automatically adjusts:

| Consent Purpose | Affected Sentry Settings                                                    |
| --------------- | --------------------------------------------------------------------------- |
| **Functional**  | `autoSessionTracking`, core integrations                                    |
| **Analytics**   | `tracesSampleRate`, `profilesSampleRate`, performance integrations          |
| **Marketing**   | `replaysSessionSampleRate`, `replaysOnErrorSampleRate`, replay integrations |
| **Preferences** | `sendDefaultPii`, personalization integrations                              |

## Running the Demo

### From Root Directory

```bash
# Install demo dependencies (first time only)
npm run demo:install

# Start development server
npm run demo:dev

# Build for production
npm run demo:build

# Preview production build
npm run demo:preview
```

### Development Workflow

```bash
# For development with automatic rebuilding
npm run build:watch  # In one terminal
npm run demo:dev     # In another terminal
```

The demo will be available at:

- **Development**: `http://localhost:3000` (or next available port)
- **Network**: Accessible on your local network for testing on other devices

## Testing the Integration

1. **Start the demo**: Run `npm run demo:dev` from the root directory
2. **Open browser**: Navigate to the provided localhost URL
3. **Toggle consent**: Use the consent toggles to change permissions
4. **Test Sentry events**: Click the test buttons to generate different types of Sentry events
5. **Observe behavior**: Watch the console logs to see how events are handled based on consent

## Demo Interface

### Consent Control Panel

- Toggle switches for each consent purpose
- Quick action buttons: "Accept All", "Reject All", "Functional Only"
- Real-time consent status display

### Sentry Testing Panel

- Buttons to trigger different Sentry events:
  - **Test Error**: Captures an exception
  - **Test Message**: Captures a message
  - **Test Transaction**: Creates a performance span
  - **Add Breadcrumb**: Adds a breadcrumb
  - **Set User**: Updates user context

### Console Logs

- Real-time display of all console logs
- Shows integration behavior and Sentry event processing
- Clear button to reset logs

## Key Integration Features Demonstrated

1. **Event Queuing**: Events are queued when consent status is unknown and processed when consent is determined
2. **Dynamic Configuration**: Sentry settings update in real-time as consent changes
3. **Purpose-based Filtering**: Different Sentry features are controlled by specific consent purposes
4. **Graceful Fallback**: Integration handles cases where Zaraz is not available
5. **Debug Logging**: Comprehensive logging for troubleshooting

## File Structure

```
demo/
├── package.json        # Demo project dependencies and scripts
├── vite.config.ts      # Vite configuration
├── tsconfig.json       # TypeScript configuration for demo
├── tsconfig.node.json  # TypeScript configuration for Node tools
├── index.html          # Main demo page with UI
├── src/
│   ├── main.ts         # Demo application logic
│   └── vite-env.d.ts   # Vite environment type definitions
└── README.md           # This file
```

## Development Features

- **Hot Module Replacement**: Instant updates without page refresh
- **TypeScript Support**: Full type checking and intellisense
- **Source Maps**: Easy debugging with original TypeScript code
- **Modern JavaScript**: ES2020 target with full feature support
- **Import Resolution**: Proper package imports from parent directory

## Customization

To adapt this demo for your specific use case:

1. **Update Purpose Mapping**: Modify the `purposeMapping` object in `demo/src/main.ts`
2. **Configure Sentry DSN**: Replace the DSN in the Sentry initialization
3. **Adjust UI**: Modify `demo/index.html` for different consent categories or styling
4. **Add Custom Logic**: Extend the test functions to demonstrate your specific use cases
5. **Build Configuration**: Modify `vite.config.ts` for different build settings

## Browser Compatibility

The demo requires a modern browser with support for:

- ES2020 modules
- Dynamic imports
- Import.meta API
- Fetch API
- Local storage (for consent persistence in fake Zaraz)
