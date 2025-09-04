import { useState, useEffect, useCallback } from 'react';
import { getZarazConsentState } from '@imviidx/sentry-zaraz-consent-integration';
import { zaraz } from 'zaraz-ts';
import { purposeMapping } from '../fake-zaraz.js';

interface ConsentState {
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}

interface Checkboxes {
  [key: string]: boolean;
}

export const useZarazConsentShortcuts = () => {
  const [currentConsentCheckboxes, setCurrentConsentCheboxes] =
    useState<Checkboxes>({});
  const [currentConsent, setCurrentConsent] = useState<ConsentState>({
    functional: false,
    analytics: false,
    marketing: false,
    preferences: false,
  });
  const [isConsentApiReady, setIsConsentApiReady] = useState<boolean>(false);

  const monitorConsentChanges = useCallback(() => {
    try {
      const newConsent = getZarazConsentState(purposeMapping);
      setCurrentConsent(newConsent);
      setCurrentConsentCheboxes(zaraz?.consent?.getAllCheckboxes?.() ?? {});
      console.log('📋 Consent updated from Zaraz:', newConsent);
    } catch (error) {
      console.warn('⚠️ Failed to read consent from Zaraz:', error);
    }
  }, [purposeMapping]);

  const showConsentDialog = useCallback(() => {
    console.log('🔧 Showing consent dialog...');
    const zaraz = (window as any).zaraz;
    if (zaraz?.showConsentModal) {
      zaraz.showConsentModal();
    } else if (zaraz?.consent?.modal?.show) {
      zaraz.consent.modal.show();
    } else if (zaraz?.consent?.show) {
      zaraz.consent.show();
    } else {
      console.warn('⚠️ Zaraz consent dialog not available');
    }
  }, []);

  // Listen for consent changes
  useEffect(() => {
    const handleConsentChange = () => {
      console.log('📡 Received zarazConsentChoicesUpdated event');
      monitorConsentChanges();
    };

    document.addEventListener(
      'zarazConsentChoicesUpdated',
      handleConsentChange
    );
    return () =>
      document.removeEventListener(
        'zarazConsentChoicesUpdated',
        handleConsentChange
      );
  }, [monitorConsentChanges]);

  // Monitor Zaraz API readiness
  useEffect(() => {
    const checkZarazReady = () => {
      const windowZaraz = (window as any).zaraz;
      const ready = windowZaraz?.consent?.APIReady === true;
      if (isConsentApiReady !== ready) {
        setIsConsentApiReady(ready);
        monitorConsentChanges();
      }
    };

    const interval = setInterval(checkZarazReady, 100);
    checkZarazReady(); // Check immediately

    return () => clearInterval(interval);
  }, [isConsentApiReady, monitorConsentChanges]);

  return {
    currentConsent,
    currentConsentCheckboxes,
    isConsentApiReady,
    showConsentDialog,
    monitorConsentChanges,
  };
};
