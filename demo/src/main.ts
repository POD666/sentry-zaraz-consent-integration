import './style.css';
import {
  sentryZarazConsentIntegration,
  getConsentStatus,
  type PurposeMapping,
  zaraz,
} from 'sentry-zaraz-consent-integration';
import * as Sentry from '@sentry/browser';

// Import fake Zaraz for development mode
import { initFakeZaraz } from 'fake-cloudflare-zaraz-consent';

let fakeZarazLoaded = false;

async function loadFakeZaraz() {
  if (import.meta.env.DEV && !fakeZarazLoaded) {
    try {
      console.log('🔧 Setting up fake Zaraz for demo...');

      // Initialize fake Zaraz using the package with default purposes
      initFakeZaraz({
        enableLogging: true,
        autoShow: false, // Don't automatically show consent modal
        enableModal: true, // Enable the consent modal
        purposes: [
          {
            id: 'YYY',
            name: 'Functional',
            description:
              'Necessary for the website to function properly. Cannot be disabled.',
            order: 1,
          },
          {
            id: 'USeX',
            name: 'Analytics',
            description:
              'Help us understand how visitors interact with our website.',
            order: 2,
          },
          {
            id: 'dqVA',
            name: 'Marketing',
            description:
              'Used to deliver personalized advertisements and measure ad performance.',
            order: 3,
          },
          {
            id: 'NNN',
            name: 'Preferences',
            description:
              'Remember your preferences and settings to enhance your experience.',
            order: 4,
          },
        ],
        defaultConsent: {
          YYY: false,
          USeX: false,
          dqVA: false,
          NNN: false,
        },
      });

      fakeZarazLoaded = true;
      console.log('✅ Fake Zaraz setup completed');
      console.log('Window.zaraz:', (window as any).zaraz);
      console.log(
        'Zaraz consent API ready:',
        (window as any).zaraz?.consent?.APIReady
      );
    } catch (error) {
      console.warn('⚠️ Failed to setup fake Zaraz:', error);
      console.error('Error details:', error);
    }
  }
}

// Environment detection
const isProduction =
  import.meta.env.PROD ||
  (window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1');

// Purpose mapping configuration
const purposeMapping: PurposeMapping = {
  functional: ['YYY'], // Always enabled
  analytics: ['USeX'], // Depend on CF purpose with id=USeX
  marketing: ['dqVA'], // Depend on CF purpose with id=dqVA
  preferences: ['NNN'], // Always disabled
};

// Console logging interception for demo
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

let logs: string[] = [];

function addLog(type: string, ...args: any[]) {
  const timestamp = new Date().toLocaleTimeString();
  const message = args
    .map((arg) =>
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    )
    .join(' ');

  logs.push(`[${timestamp}] ${type.toUpperCase()}: ${message}`);

  // Keep only last 50 logs
  if (logs.length > 50) {
    logs = logs.slice(-50);
  }

  updateLogsDisplay();
}

console.log = (...args: any[]) => {
  originalConsoleLog(...args);
  addLog('log', ...args);
};

console.error = (...args: any[]) => {
  originalConsoleError(...args);
  addLog('error', ...args);
};

console.warn = (...args: any[]) => {
  originalConsoleWarn(...args);
  addLog('warn', ...args);
};

function updateLogsDisplay() {
  const logsElement = document.getElementById('console-logs');
  if (logsElement) {
    logsElement.textContent = logs.join('\n');
    logsElement.scrollTop = logsElement.scrollHeight;
  }
}

// Initialize Sentry with consent integration
function initializeSentry() {
  console.log('🚀 Initializing Sentry with Zaraz consent integration...');

  try {
    Sentry.init({
      dsn: isProduction
        ? 'https://your-real-dsn@sentry.io/project-id'
        : 'https://abc123def456789@o123456.ingest.sentry.io/123456', // Valid format fake DSN for demo

      // Core settings
      debug: !isProduction,
      environment: isProduction ? 'production' : 'development',

      // Performance monitoring
      tracesSampleRate: 1.0,
      profilesSampleRate: 1.0,

      // Session replay
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,

      // Other settings
      autoSessionTracking: true,
      sendDefaultPii: true,

      // Integrations including our consent integration
      integrations: [
        sentryZarazConsentIntegration({
          purposeMapping,
          debug: true,
        }),
        // Add other integrations as needed
      ],

      beforeSend(event: any) {
        console.log('📤 Sentry beforeSend called:', {
          eventType: event.type,
          eventId: event.event_id,
          level: event.level,
        });
        // Always return the event to allow it to be sent
        return event;
      },
    });

    console.log('✅ Sentry initialized successfully');
    updateSentryStatus('Sentry initialized with consent integration');
  } catch (error) {
    console.error('❌ Failed to initialize Sentry:', error);
    updateSentryStatus('Failed to initialize Sentry', 'error');
  }
}

// UI State Management
let currentConsent = {
  functional: false,
  analytics: false,
  marketing: false,
  preferences: false,
};

let lastConsentCheck = '';

function updateConsentDisplay() {
  // Update toggle switches
  Object.entries(currentConsent).forEach(([purpose, granted]) => {
    const toggle = document.getElementById(`${purpose}-toggle`);
    if (toggle) {
      toggle.classList.toggle('active', granted);
    }
  });

  // Update status display
  const statusEl = document.getElementById('consent-status');
  if (statusEl) {
    statusEl.className = 'status success';
    statusEl.textContent = `Consent Status: ${JSON.stringify(
      zaraz.consent.getAllCheckboxes(),
      null,
      2
    )}`;
  }
}

function updateSentryStatus(
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info'
) {
  const statusEl = document.getElementById('sentry-status');
  if (statusEl) {
    statusEl.className = `status ${type}`;
    statusEl.textContent = message;
  }
}

function updateEnvironmentBadge() {
  const badge = document.getElementById('environment-badge');
  if (badge) {
    badge.textContent = isProduction ? 'Production' : 'Development';
    badge.className = `environment-badge ${isProduction ? 'production' : ''}`;
  }
}

// Consent management functions - READ ONLY, changes come from Zaraz dialog
function monitorConsentChanges() {
  // Get current consent status using getConsentStatus
  try {
    const newConsent = getConsentStatus(purposeMapping);

    const newConsentString = JSON.stringify(newConsent);
    if (newConsentString !== lastConsentCheck) {
      currentConsent = newConsent;
      lastConsentCheck = newConsentString;
      updateConsentDisplay();
      console.log('📋 Consent updated from Zaraz:', currentConsent);
    }
  } catch (error) {
    console.warn('⚠️ Failed to read consent from Zaraz:', error);
  }
}

function showConsentDialog() {
  console.log('🔧 Showing consent dialog...');

  const zaraz = (window as any).zaraz;
  if (zaraz?.showConsentModal) {
    zaraz.showConsentModal();
    console.log('✅ Consent modal shown via showConsentModal()');
  } else if (zaraz?.consent?.modal?.show) {
    zaraz.consent.modal.show();
    console.log('✅ Consent dialog shown via consent.modal.show()');
  } else if (zaraz?.consent?.show) {
    zaraz.consent.show();
    console.log('✅ Consent dialog shown via consent.show()');
  } else {
    console.warn('⚠️ Zaraz consent dialog not available');
    console.log('Available zaraz methods:', Object.keys(zaraz || {}));
    console.log(
      'Available consent methods:',
      Object.keys(zaraz?.consent || {})
    );
  }
}

// Test functions for Sentry events
function testError() {
  console.log('🧪 Testing Sentry error capture...');
  try {
    throw new Error('This is a test error from the demo ' + Math.random());
  } catch (error) {
    Sentry.captureException(error);
  }
}

function testMessage() {
  console.log('🧪 Testing Sentry message capture...');
  Sentry.captureMessage('This is a test message from the demo', 'info');
}

function testTransaction() {
  console.log('🧪 Testing Sentry transaction...');
  Sentry.startSpan(
    {
      name: 'demo-transaction',
      op: 'demo',
    },
    () => {
      // Simulate some work
      console.log('✅ Transaction completed');
    }
  );
}

function addBreadcrumb() {
  console.log('🧪 Adding Sentry breadcrumb...');
  Sentry.addBreadcrumb({
    message: 'Demo breadcrumb added',
    category: 'demo',
    level: 'info',
    data: { timestamp: new Date().toISOString() },
  });
}

function setUserInfo() {
  console.log('🧪 Setting Sentry user info...');
  Sentry.setUser({
    id: 'demo-user-123',
    email: 'demo@example.com',
    username: 'demo-user',
  });
}

// Event listeners
function setupEventListeners() {
  // Show consent dialog button
  document
    .getElementById('show-consent')
    ?.addEventListener('click', showConsentDialog);

  // Set up consent change monitoring - listen for the proper Zaraz event
  document.addEventListener('zarazConsentChoicesUpdated', () => {
    console.log('📡 Received zarazConsentChoicesUpdated event');
    monitorConsentChanges();
  });

  // Test buttons
  document.getElementById('test-error')?.addEventListener('click', testError);
  document
    .getElementById('test-message')
    ?.addEventListener('click', testMessage);
  document
    .getElementById('test-transaction')
    ?.addEventListener('click', testTransaction);
  document
    .getElementById('test-breadcrumb')
    ?.addEventListener('click', addBreadcrumb);
  document.getElementById('test-user')?.addEventListener('click', setUserInfo);

  // Clear logs button
  document.getElementById('clear-logs')?.addEventListener('click', () => {
    logs = [];
    updateLogsDisplay();
  });
}

// Initialize the demo
async function init() {
  console.log('🎬 Starting Sentry Zaraz Consent Integration Demo');

  updateEnvironmentBadge();
  setupEventListeners();

  // Load fake Zaraz first in development mode
  if (!isProduction) {
    console.log('⏳ Loading fake Zaraz...');
    await loadFakeZaraz();

    // Check if Zaraz is ready after initialization
    const windowZaraz = (window as any).zaraz;
    const isZarazReady = windowZaraz?.consent?.APIReady === true;

    if (isZarazReady) {
      console.log('✅ Fake Zaraz is ready immediately after initialization');
      console.log('Available zaraz object:', windowZaraz);
      initializeSentry();
      updateConsentDisplay();
      monitorConsentChanges(); // Monitor initial consent
      return; // Exit early since we're ready
    }

    console.log('⏳ Waiting for fake Zaraz to be ready...');
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds max

    const checkZaraz = () => {
      attempts++;
      console.log(
        `🔍 Checking for Zaraz (attempt ${attempts}/${maxAttempts})...`
      );

      // Check both window.zaraz and window.zaraz.consent.APIReady
      const windowZaraz = (window as any).zaraz;
      const isZarazReady = windowZaraz?.consent?.APIReady === true;

      if (isZarazReady) {
        console.log('✅ Fake Zaraz is ready');
        console.log('Available zaraz object:', windowZaraz);
        console.log('Zaraz consent API ready:', windowZaraz.consent.APIReady);
        initializeSentry();
        updateConsentDisplay();
        monitorConsentChanges(); // Monitor initial consent
      } else if (attempts >= maxAttempts) {
        console.warn('⚠️ Fake Zaraz timed out, proceeding without it');
        console.log('Available on window:', Object.keys(window));
        console.log('Window.zaraz:', windowZaraz);
        console.log('Window.zaraz.consent:', windowZaraz?.consent);
        initializeSentry();
        updateConsentDisplay();
      } else {
        setTimeout(checkZaraz, 100);
      }
    };

    // Give fake Zaraz a moment to initialize after loading
    setTimeout(checkZaraz, 100);
  } else {
    // In production, initialize immediately
    initializeSentry();
    updateConsentDisplay();
    monitorConsentChanges();
  }
}

// Handle production script loading
if (isProduction) {
  // Remove fake Zaraz script in production
  const fakeScript = document.getElementById('fake-zaraz-script');
  if (fakeScript) {
    fakeScript.remove();
  }

  // Load real Zaraz script (this would be your actual Zaraz script)
  console.log('🌐 Production mode: expecting real Zaraz to be available');
}

// Start the demo when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    init().catch((error) => {
      console.error('Failed to initialize demo:', error);
    });
  });
} else {
  init().catch((error) => {
    console.error('Failed to initialize demo:', error);
  });
}

// Export for debugging
(window as any).demoApp = {
  monitorConsentChanges,
  showConsentDialog,
  testError,
  testMessage,
  testTransaction,
  addBreadcrumb,
  setUserInfo,
  currentConsent,
  purposeMapping,
};
