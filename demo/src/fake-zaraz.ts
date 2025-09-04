import { initFakeZaraz } from '@imviidx/fake-cloudflare-zaraz-consent';
import { type PurposeMapping } from '@imviidx/sentry-zaraz-consent-integration';

// Fake purposes, aka CF Consent
const purposes = [
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
    description: 'Help us understand how visitors interact with our website.',
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
];

export const purposeMapping: PurposeMapping = {
  functional: ['YYY'], // Depends on CF purpose with id=YYY
  analytics: ['USeX'], // Depends on CF purpose with id=USeX
  marketing: ['dqVA'], // Depends on CF purpose with id=dqVA
  preferences: ['NNN'], // Depends on CF purpose with id=NNN
};

export const initFakeZarazShort = () =>
  initFakeZaraz({
    enableLogging: true,
    autoShow: false,
    enableModal: true,
    purposes: purposes,
    // deselect all by default
    defaultConsent: { YYY: false, USeX: false, dqVA: false, NNN: false },
  });
