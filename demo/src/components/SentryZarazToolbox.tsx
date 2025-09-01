import React from 'react';
import { useZarazConsentShortcuts } from '../hooks/useZarazConsentShortcuts';
import { ToggleSwitch } from './ToggleSwitch';

interface ConsentState {
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}

interface SentryZarazToolboxProps {
  className?: string;
}

export const SentryZarazToolbox: React.FC<SentryZarazToolboxProps> = ({
  className = '',
}) => {
  const { currentConsent, currentConsentCheckboxes, showConsentDialog } =
    useZarazConsentShortcuts();

  return (
    <div className={`bg-white rounded-lg p-6 shadow-sm ${className}`}>
      <h2 className='text-slate-800 mt-0 flex justify-between items-center'>
        Zaraz Consent Sentry Interpretation
        <button
          onClick={showConsentDialog}
          className='btn primary ml-4 text-sm py-2 px-4'
        >
          Show Consent
        </button>
      </h2>

      <div className='border-2 border-slate-200 rounded-lg p-5 my-5 bg-slate-50 relative'>
        <div className='absolute -top-3 left-4 bg-slate-50 px-2 text-xs text-slate-500 font-medium'>
          Read-only - Use "Show Consent" to change settings
        </div>

        {Object.entries(currentConsent).map(([purpose, granted]) => (
          <div key={purpose} className='flex items-center gap-3 my-2.5'>
            <label className='font-medium min-w-[120px] capitalize'>
              {purpose}:
            </label>
            <ToggleSwitch
              purpose={purpose as keyof ConsentState}
              active={granted}
            />
            <span className='text-slate-600 text-sm'>
              {purpose === 'functional' && 'Required for core error tracking'}
              {purpose === 'analytics' && 'Performance monitoring & metrics'}
              {purpose === 'marketing' && 'Session replay & user behavior'}
              {purpose === 'preferences' && 'PII collection & personalization'}
            </span>
          </div>
        ))}
      </div>

      <div className='status info'>
        Raw Consent Status: {JSON.stringify(currentConsentCheckboxes, null, 2)}
      </div>
    </div>
  );
};
