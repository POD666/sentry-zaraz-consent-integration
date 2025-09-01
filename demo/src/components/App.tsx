import React from 'react';
import { SentrySettingsDisplay } from './SentrySettingsDisplay';
import { SentryZarazToolbox } from './SentryZarazToolbox';
import { SentryToolbox } from './SentryToolbox';
import { LogsDisplay } from './LogsDisplay';

export const App: React.FC = () => {
  return (
    <div className='font-sans max-w-6xl mx-auto p-5 leading-relaxed bg-slate-50 min-h-screen'>
      {/* Header */}
      <div className='bg-white rounded-lg p-6 shadow-sm mb-6'>
        <h1 className='text-slate-800 mt-0 flex flex-wrap items-center justify-between'>
          Sentry Zaraz Consent Integration Demo
          <a
            href='https://github.com/POD666/fake-cloudflare-zaraz-consent'
            target='_blank'
            rel='noopener noreferrer'
            className={`environment-badge`}
          >
            Fake Zaraz Consent
          </a>
        </h1>
        <p className='text-slate-600'>
          This demo shows how Sentry configuration changes based on Zaraz
          consent settings (the fake one is used for the demo). Toggle consent
          purposes below and observe how Sentry behavior adapts.
        </p>
      </div>

      {/* Main Content Grid */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-6'>
        {/* Consent Status */}
        <SentryZarazToolbox className='' />

        {/* Test Sentry Events */}
        <SentryToolbox className='' />
      </div>

      {/* Console Logs */}
      <LogsDisplay className='mb-6' />

      {/* Sentry Settings Display */}
      <SentrySettingsDisplay className='mb-6' />
    </div>
  );
};
