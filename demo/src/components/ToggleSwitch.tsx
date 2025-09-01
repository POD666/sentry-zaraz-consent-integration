import React from 'react';

interface ConsentState {
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}

interface ToggleSwitchProps {
  purpose: keyof ConsentState;
  active: boolean;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  purpose,
  active,
}) => (
  <div
    className={`toggle-switch ${active ? 'active' : ''} readonly`}
    data-purpose={purpose}
  ></div>
);
