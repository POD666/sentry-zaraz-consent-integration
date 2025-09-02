import React, { useState, useEffect } from 'react';
import * as Sentry from '@sentry/browser';

interface SentrySettingsDisplayProps {
  className?: string;
}

interface ConfigItem {
  key: string;
  defaultValue: any;
  currentValue: any;
  isOverridden: boolean;
  isForbidden: boolean;
  description?: string;
}

interface IntegrationItem {
  name: string;
  enabled: boolean;
  isDefault: boolean;
  config?: any;
}

export const SentrySettingsDisplay: React.FC<SentrySettingsDisplayProps> = ({
  className = '',
}) => {
  const [sentrySettings, setSentrySettings] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [originalUserConfig, setOriginalUserConfig] = useState<any>(null);
  const [originalUserIntegrations, setOriginalUserIntegrations] =
    useState<any>(null);

  // Get actual Sentry defaults by creating a shadow client
  const getSentryDefaults = () => {
    try {
      // Get default integrations from Sentry
      const defaultIntegrations = (Sentry as any).getDefaultIntegrations({});

      // Create a minimal shadow client to extract default values
      const shadowOptions = {
        dsn: 'https://fake@fake.ingest.sentry.io/fake', // Fake DSN to avoid network calls
        transport: () => ({
          send: () => Promise.resolve({}),
          flush: () => Promise.resolve(true),
        }),
        beforeSend: () => null, // Block all events
      };

      // Apply Sentry's internal default options processing
      let processedDefaults = shadowOptions;
      try {
        // Try to access Sentry's internal default option processing
        if ((Sentry as any).BrowserClient) {
          const tempClient = new (Sentry as any).BrowserClient(shadowOptions);
          const tempOptions = tempClient.getOptions();
          processedDefaults = tempOptions;
        }
      } catch (e) {
        // Fallback to known defaults if internal processing fails
        console.warn(
          'Could not access Sentry default processing, using fallback defaults'
        );
      }

      return {
        config: {
          // Core configuration defaults (from Sentry documentation)
          sampleRate: 1.0,
          tracesSampleRate: 0.0, // Default is 0 (no tracing)
          sendDefaultPii: false, // Default is false
          maxBreadcrumbs: 100,
          attachStacktrace: false, // Default is false
          autoSessionTracking: true,
          replaysSessionSampleRate: 0.0, // Default is 0
          replaysOnErrorSampleRate: 0.0, // Default is 0
          profilesSampleRate: 0.0, // Default is 0
          ...processedDefaults,
        },
        integrations: defaultIntegrations.reduce(
          (acc: any, integration: any) => {
            acc[integration.name] = {
              enabled: true,
              isDefault: true,
            };
            return acc;
          },
          {}
        ),
      };
    } catch (err) {
      console.error('Error getting Sentry defaults:', err);
      return {
        config: {
          // Fallback defaults if extraction fails
          sampleRate: 1.0,
          tracesSampleRate: 0.0,
          sendDefaultPii: false,
          maxBreadcrumbs: 100,
          attachStacktrace: false,
          autoSessionTracking: true,
          replaysSessionSampleRate: 0.0,
          replaysOnErrorSampleRate: 0.0,
          profilesSampleRate: 0.0,
        },
        integrations: {
          InboundFilters: {
            name: 'InboundFilters',
            enabled: true,
            isDefault: true,
          },
          FunctionToString: {
            name: 'FunctionToString',
            enabled: true,
            isDefault: true,
          },
          BrowserApiErrors: {
            name: 'BrowserApiErrors',
            enabled: true,
            isDefault: true,
          },
          Breadcrumbs: { name: 'Breadcrumbs', enabled: true, isDefault: true },
          GlobalHandlers: {
            name: 'GlobalHandlers',
            enabled: true,
            isDefault: true,
          },
          LinkedErrors: {
            name: 'LinkedErrors',
            enabled: true,
            isDefault: true,
          },
          Dedupe: { name: 'Dedupe', enabled: true, isDefault: true },
          HttpContext: { name: 'HttpContext', enabled: true, isDefault: true },
          BrowserSession: {
            name: 'BrowserSession',
            enabled: true,
            isDefault: true,
          },
        },
      };
    }
  };

  const getSentrySettings = () => {
    try {
      const client = Sentry.getCurrentHub().getClient();
      if (!client) {
        return { error: 'Sentry client not available' };
      }

      const options = client.getOptions();

      // Get actual Sentry defaults
      const sentryDefaults = getSentryDefaults();

      // Build configuration comparison
      const configKeys = [
        'sampleRate',
        'tracesSampleRate',
        'sendDefaultPii',
        'maxBreadcrumbs',
        'attachStacktrace',
        'autoSessionTracking',
        'replaysSessionSampleRate',
        'replaysOnErrorSampleRate',
        'profilesSampleRate',
      ];

      const configItems: Record<string, ConfigItem> = {};

      configKeys.forEach((key) => {
        const currentValue = (options as any)[key];
        const defaultValue = (sentryDefaults.config as any)[key];
        const isOverridden = currentValue !== defaultValue;
        const isForbidden = determineForbiddenState(
          key,
          currentValue,
          defaultValue
        );

        configItems[key] = {
          key,
          defaultValue,
          currentValue,
          isOverridden,
          isForbidden,
          description: getConfigDescription(key),
        };
      });

      // Get active integrations
      const activeIntegrations: Record<string, IntegrationItem> = {};
      try {
        if (options.integrations && Array.isArray(options.integrations)) {
          options.integrations.forEach((integration: any) => {
            const name = integration?.name || 'UnknownIntegration';
            activeIntegrations[name] = {
              name,
              enabled: true,
              isDefault: sentryDefaults.integrations[name]?.isDefault || false,
              config: integration,
            };
          });
        }

        // Add missing default integrations as disabled
        Object.entries(sentryDefaults.integrations).forEach(
          ([name, defaultIntegration]: [string, any]) => {
            if (!activeIntegrations[name]) {
              activeIntegrations[name] = {
                ...defaultIntegration,
                enabled: false,
              };
            }
          }
        );
      } catch (integrationError) {
        console.error('Error processing integrations:', integrationError);
      }

      return {
        configItems,
        activeIntegrations,
        rawOptions: options,
        sentryDefaults,
      };
    } catch (err) {
      return { error: `Failed to get Sentry settings: ${err}` };
    }
  };

  const getConfigDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      sampleRate: 'Percentage of events to send to Sentry',
      tracesSampleRate: 'Percentage of transactions to trace',
      sendDefaultPii: 'Send personally identifiable information',
      maxBreadcrumbs: 'Maximum number of breadcrumbs to store',
      attachStacktrace: 'Attach stack traces to all events',
      autoSessionTracking: 'Automatically track user sessions',
      replaysSessionSampleRate: 'Percentage of sessions to record',
      replaysOnErrorSampleRate: 'Percentage of error sessions to record',
      profilesSampleRate: 'Percentage of transactions to profile',
    };
    return descriptions[key] || 'Sentry configuration option';
  };

  const determineForbiddenState = (
    key: string,
    currentValue: any,
    defaultValue: any
  ): boolean => {
    // Logic to determine if a setting is forbidden based on consent restrictions
    // This simulates the consent integration's behavior

    // These settings are typically disabled when consent is not granted
    const consentRestrictedSettings = [
      'sendDefaultPii',
      'tracesSampleRate',
      'replaysSessionSampleRate',
      'replaysOnErrorSampleRate',
      'profilesSampleRate',
    ];

    if (consentRestrictedSettings.includes(key)) {
      // If current value is more restrictive than default, it might be due to consent restrictions
      if (
        typeof currentValue === 'number' &&
        typeof defaultValue === 'number'
      ) {
        return currentValue < defaultValue;
      }
      if (
        typeof currentValue === 'boolean' &&
        typeof defaultValue === 'boolean'
      ) {
        return !currentValue && defaultValue;
      }
    }

    return false;
  };

  const captureOriginalUserConfiguration = () => {
    try {
      const client = Sentry.getCurrentHub().getClient();
      if (!client) return;

      const options = client.getOptions();
      const sentryDefaults = getSentryDefaults();

      // Capture original user configuration
      const configKeys = [
        'sampleRate',
        'tracesSampleRate',
        'sendDefaultPii',
        'maxBreadcrumbs',
        'attachStacktrace',
        'autoSessionTracking',
        'replaysSessionSampleRate',
        'replaysOnErrorSampleRate',
        'profilesSampleRate',
      ];

      const userConfig: any = {};
      configKeys.forEach((key) => {
        const optionValue = (options as any)[key];
        if (optionValue !== undefined) {
          userConfig[key] = optionValue;
        }
      });

      // Capture original user integrations
      const userIntegrations: any = {};
      if (options.integrations && Array.isArray(options.integrations)) {
        options.integrations.forEach((integration: any) => {
          const name = integration?.name || 'UnknownIntegration';
          userIntegrations[name] = {
            enabled: true,
            isDefault: sentryDefaults.integrations[name]?.isDefault || false,
          };
        });
      }

      setOriginalUserConfig(userConfig);
      setOriginalUserIntegrations(userIntegrations);
    } catch (err) {
      console.error('Error capturing original user configuration:', err);
    }
  };

  const refreshSettings = () => {
    try {
      setError(null);
      const settings = getSentrySettings();
      setSentrySettings(settings);
    } catch (err) {
      setError(`Error getting Sentry settings: ${err}`);
      setSentrySettings(null);
    }
  };

  useEffect(() => {
    // Capture original user configuration first (only once)
    if (!originalUserConfig || !originalUserIntegrations) {
      captureOriginalUserConfiguration();
    }

    // Initial load
    refreshSettings();

    // Refresh every 2 seconds to catch changes
    const interval = setInterval(refreshSettings, 2000);

    return () => clearInterval(interval);
  }, [originalUserConfig, originalUserIntegrations]);

  const buildDefaultConfigObject = (sentryDefaults: any) => {
    if (!sentryDefaults?.config) return {};

    const configKeys = [
      'sampleRate',
      'tracesSampleRate',
      'sendDefaultPii',
      'maxBreadcrumbs',
      'attachStacktrace',
      'autoSessionTracking',
      'replaysSessionSampleRate',
      'replaysOnErrorSampleRate',
      'profilesSampleRate',
    ];

    const result: any = {};
    configKeys.forEach((key) => {
      result[key] = (sentryDefaults.config as any)[key];
    });
    return result;
  };

  const buildUserCodedConfigObject = () => {
    // Return the captured original user configuration
    return originalUserConfig || {};
  };

  const buildCurrentConfigObject = (
    configItems: Record<string, ConfigItem>
  ) => {
    const result: any = {};
    Object.entries(configItems).forEach(([key, item]) => {
      result[key] = item.currentValue;
    });
    return result;
  };

  const buildUserCodedIntegrationsObject = () => {
    // Return the captured original user integrations
    return originalUserIntegrations || {};
  };

  const buildDefaultIntegrationsObject = (sentryDefaults: any) => {
    if (!sentryDefaults?.integrations) return {};
    return sentryDefaults.integrations;
  };

  const buildCurrentIntegrationsObject = (
    activeIntegrations: Record<string, IntegrationItem>
  ) => {
    const result: any = {};
    Object.entries(activeIntegrations).forEach(([key, item]) => {
      result[key] = {
        enabled: item.enabled,
        isDefault: item.isDefault,
      };
    });
    return result;
  };

  const highlightDifferences = (
    jsonString: string,
    configItems?: Record<string, ConfigItem>,
    activeIntegrations?: Record<string, IntegrationItem>
  ) => {
    if (!configItems && !activeIntegrations) return jsonString;

    let highlightedJson = jsonString;

    // Highlight overridden config values
    if (configItems) {
      Object.entries(configItems).forEach(([key, item]) => {
        if (item.isOverridden || item.isForbidden) {
          const valueStr = JSON.stringify(item.currentValue);
          // More flexible regex that matches the key-value pair in JSON
          const regex = new RegExp(
            `("${key}")(:)(\\s*)(${valueStr.replace(
              /[.*+?^${}()|[\]\\]/g,
              '\\$&'
            )})`,
            'g'
          );
          const bgColor = item.isForbidden ? 'bg-amber-200' : 'bg-green-200';
          const textColor = item.isForbidden
            ? 'text-amber-800'
            : 'text-green-800';
          highlightedJson = highlightedJson.replace(
            regex,
            `$1$2$3<span class="${bgColor} ${textColor} px-1 rounded font-semibold">$4</span>`
          );
        }
      });
    }

    // Also highlight integration differences
    if (activeIntegrations) {
      Object.entries(activeIntegrations).forEach(([key, item]) => {
        if (!item.isDefault) {
          // Highlight custom integrations
          const regex = new RegExp(`("${key}")(:)`, 'g');
          highlightedJson = highlightedJson.replace(
            regex,
            `<span class="bg-blue-200 text-blue-800 px-1 rounded font-semibold">$1</span>$2`
          );
        }
      });
    }

    return highlightedJson;
  };

  const highlightCurrentDifferences = (
    jsonString: string,
    configItems?: Record<string, ConfigItem>,
    activeIntegrations?: Record<string, IntegrationItem>
  ) => {
    if (!configItems && !activeIntegrations) return jsonString;

    let highlightedJson = jsonString;

    // Highlight config values based on their relationship to user-coded and default values
    if (configItems && originalUserConfig) {
      Object.entries(configItems).forEach(([key, item]) => {
        const userCodedValue = originalUserConfig[key];
        const currentValue = item.currentValue;
        const defaultValue = item.defaultValue;

        // Check if current value matches user-coded value
        const matchesUserCode =
          userCodedValue !== undefined && currentValue === userCodedValue;
        // Check if current value differs from user-coded value
        const isModifiedFromUserCode =
          userCodedValue !== undefined && currentValue !== userCodedValue;
        // Check if user had overridden the default
        const userOverrodeDefault =
          userCodedValue !== undefined && userCodedValue !== defaultValue;

        let shouldHighlight = false;
        let bgColor = '';
        let textColor = '';

        if (item.isForbidden) {
          // Always highlight forbidden values in amber
          shouldHighlight = true;
          bgColor = 'bg-amber-200';
          textColor = 'text-amber-800';
        } else if (matchesUserCode && userOverrodeDefault) {
          // Current value matches user config AND user had overridden default -> green (overridden from default)
          shouldHighlight = true;
          bgColor = 'bg-green-200';
          textColor = 'text-green-800';
        } else if (isModifiedFromUserCode) {
          // Current value differs from user config -> orange (modified from user config)
          shouldHighlight = true;
          bgColor = 'bg-orange-200';
          textColor = 'text-orange-800';
        }

        if (shouldHighlight) {
          const valueStr = JSON.stringify(currentValue);
          // More flexible regex that matches the key-value pair in JSON
          const regex = new RegExp(
            `("${key}")(:)(\\s*)(${valueStr.replace(
              /[.*+?^${}()|[\]\\]/g,
              '\\$&'
            )})`,
            'g'
          );
          highlightedJson = highlightedJson.replace(
            regex,
            `$1$2$3<span class="${bgColor} ${textColor} px-1 rounded font-semibold">$4</span>`
          );
        }
      });
    }

    // Highlight integration differences from user-coded integrations
    if (activeIntegrations && originalUserIntegrations) {
      Object.entries(activeIntegrations).forEach(([key, item]) => {
        const userHadIntegration = originalUserIntegrations[key];
        const isModifiedFromUserCode =
          userHadIntegration?.enabled !== item.enabled;

        if (isModifiedFromUserCode || !item.isDefault) {
          // Highlight modified or custom integrations
          const regex = new RegExp(`("${key}")(:)`, 'g');
          const bgColor = !item.isDefault ? 'bg-blue-200' : 'bg-orange-200';
          const textColor = !item.isDefault
            ? 'text-blue-800'
            : 'text-orange-800';
          highlightedJson = highlightedJson.replace(
            regex,
            `<span class="${bgColor} ${textColor} px-1 rounded font-semibold">$1</span>$2`
          );
        }
      });
    }

    return highlightedJson;
  };

  const highlightUserCodedDifferences = (
    jsonString: string,
    sentryDefaults?: any
  ) => {
    if (!originalUserConfig && !originalUserIntegrations && !sentryDefaults)
      return jsonString;

    let highlightedJson = jsonString;

    // Highlight config values that differ from default (user overrides)
    if (originalUserConfig && sentryDefaults) {
      Object.entries(originalUserConfig).forEach(([key, userValue]) => {
        const defaultValue = (sentryDefaults.config as any)[key];
        const isUserOverride = userValue !== defaultValue;

        if (isUserOverride) {
          const valueStr = JSON.stringify(userValue);
          // More flexible regex that matches the key-value pair in JSON
          const regex = new RegExp(
            `("${key}")(:)(\\s*)(${valueStr.replace(
              /[.*+?^${}()|[\]\\]/g,
              '\\$&'
            )})`,
            'g'
          );
          highlightedJson = highlightedJson.replace(
            regex,
            `$1$2$3<span class="bg-green-200 text-green-800 px-1 rounded font-semibold">$4</span>`
          );
        }
      });
    }

    // Highlight custom integrations (non-default)
    if (originalUserIntegrations) {
      Object.entries(originalUserIntegrations).forEach(
        ([key, integration]: [string, any]) => {
          if (!integration.isDefault) {
            // Highlight custom integrations
            const regex = new RegExp(`("${key}")(:)`, 'g');
            highlightedJson = highlightedJson.replace(
              regex,
              `<span class="bg-blue-200 text-blue-800 px-1 rounded font-semibold">$1</span>$2`
            );
          }
        }
      );
    }

    return highlightedJson;
  };

  return (
    <div className={`bg-white rounded-lg p-6 shadow-sm ${className}`}>
      <div className='flex justify-between items-center mb-4'>
        <h2 className='text-slate-800 text-xl font-semibold m-0'>
          Sentry Configuration Diff
        </h2>
        <button
          onClick={refreshSettings}
          className='px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors'
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className='bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4'>
          {error}
        </div>
      )}

      {sentrySettings ? (
        <div className='space-y-6'>
          {sentrySettings.error ? (
            <div className='bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded'>
              {sentrySettings.error}
            </div>
          ) : (
            <>
              {/* Legend */}
              <div className='flex flex-wrap gap-4 p-4 bg-slate-50 rounded-lg'>
                <div className='flex items-center gap-2'>
                  <div className='w-4 h-4 bg-green-200 rounded'></div>
                  <span className='text-sm text-slate-600'>
                    Overridden from default
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <div className='w-4 h-4 bg-orange-200 rounded'></div>
                  <span className='text-sm text-slate-600'>
                    Modified from user config
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <div className='w-4 h-4 bg-amber-200 rounded'></div>
                  <span className='text-sm text-slate-600'>
                    Restricted by consent
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <div className='w-4 h-4 bg-blue-200 rounded'></div>
                  <span className='text-sm text-slate-600'>
                    Custom integration
                  </span>
                </div>
              </div>

              {/* Client Configuration Comparison */}
              <div>
                <h3 className='text-lg font-medium text-slate-700 mb-4'>
                  Client Configuration
                </h3>
                <div className='grid grid-cols-3 gap-4'>
                  {/* Default Config */}
                  <div>
                    <h4 className='text-sm font-medium text-slate-600 mb-2 p-2 bg-gray-100 rounded-t'>
                      Default Configuration
                    </h4>
                    <pre className='bg-slate-900 text-slate-300 p-4 rounded-b text-xs'>
                      <code>
                        {JSON.stringify(
                          buildDefaultConfigObject(
                            sentrySettings.sentryDefaults
                          ),
                          null,
                          2
                        )}
                      </code>
                    </pre>
                  </div>

                  {/* User Coded Config */}
                  <div>
                    <h4 className='text-sm font-medium text-slate-600 mb-2 p-2 bg-blue-100 rounded-t'>
                      User coded Configuration
                    </h4>
                    <pre className='bg-slate-900 text-slate-300 p-4 rounded-b text-xs'>
                      <code
                        dangerouslySetInnerHTML={{
                          __html: highlightUserCodedDifferences(
                            JSON.stringify(
                              buildUserCodedConfigObject(),
                              null,
                              2
                            ),
                            sentrySettings.sentryDefaults
                          ),
                        }}
                      />
                    </pre>
                  </div>

                  {/* Current Config */}
                  <div>
                    <h4 className='text-sm font-medium text-slate-600 mb-2 p-2 bg-gray-100 rounded-t'>
                      Current Configuration
                    </h4>
                    <pre className='bg-slate-900 text-slate-300 p-4 rounded-b text-xs'>
                      <code
                        dangerouslySetInnerHTML={{
                          __html: highlightCurrentDifferences(
                            JSON.stringify(
                              buildCurrentConfigObject(
                                sentrySettings.configItems || {}
                              ),
                              null,
                              2
                            ),
                            sentrySettings.configItems
                          ),
                        }}
                      />
                    </pre>
                  </div>
                </div>
              </div>

              {/* Active Integrations Comparison */}
              <div>
                <h3 className='text-lg font-medium text-slate-700 mb-4'>
                  Active Integrations
                </h3>
                <div className='grid grid-cols-3 gap-4'>
                  {/* Default Integrations */}
                  <div>
                    <h4 className='text-sm font-medium text-slate-600 mb-2 p-2 bg-gray-100 rounded-t'>
                      Default Integrations
                    </h4>
                    <pre className='bg-slate-900 text-slate-300 p-4 rounded-b text-xs'>
                      <code>
                        {JSON.stringify(
                          buildDefaultIntegrationsObject(
                            sentrySettings.sentryDefaults
                          ),
                          null,
                          2
                        )}
                      </code>
                    </pre>
                  </div>

                  {/* User Coded Integrations */}
                  <div>
                    <h4 className='text-sm font-medium text-slate-600 mb-2 p-2 bg-blue-100 rounded-t'>
                      User coded Integrations
                    </h4>
                    <pre className='bg-slate-900 text-slate-300 p-4 rounded-b text-xs'>
                      <code
                        dangerouslySetInnerHTML={{
                          __html: highlightUserCodedDifferences(
                            JSON.stringify(
                              buildUserCodedIntegrationsObject(),
                              null,
                              2
                            ),
                            sentrySettings.sentryDefaults
                          ),
                        }}
                      />
                    </pre>
                  </div>

                  {/* Current Integrations */}
                  <div>
                    <h4 className='text-sm font-medium text-slate-600 mb-2 p-2 bg-gray-100 rounded-t'>
                      Current Integrations
                    </h4>
                    <pre className='bg-slate-900 text-slate-300 p-4 rounded-b text-xs'>
                      <code
                        dangerouslySetInnerHTML={{
                          __html: highlightCurrentDifferences(
                            JSON.stringify(
                              buildCurrentIntegrationsObject(
                                sentrySettings.activeIntegrations || {}
                              ),
                              null,
                              2
                            ),
                            undefined,
                            sentrySettings.activeIntegrations
                          ),
                        }}
                      />
                    </pre>
                  </div>
                </div>
              </div>

              {/* Raw Configuration (Collapsible) */}
              <details className='border border-slate-200 rounded-lg'>
                <summary className='p-4 cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors font-medium text-slate-700'>
                  Raw Sentry Options
                </summary>
                <div className='p-4 border-t border-slate-200'>
                  <pre className='bg-slate-900 text-green-400 p-4 rounded-lg text-sm'>
                    <code>
                      {JSON.stringify(
                        sentrySettings.rawOptions,
                        (key, value) => {
                          // Handle circular references and complex objects
                          if (value && typeof value === 'object') {
                            // Skip circular references and complex internal objects
                            if (value === value.constructor?.prototype)
                              return '[Circular]';
                            if (
                              key.startsWith('_') &&
                              typeof value === 'object'
                            )
                              return '[Internal Object]';
                            if (
                              value.constructor &&
                              value.constructor.name &&
                              [
                                'ReplayContainer',
                                'HTMLElement',
                                'Window',
                                'Document',
                              ].includes(value.constructor.name)
                            ) {
                              return `[${value.constructor.name}]`;
                            }
                          }
                          return value;
                        },
                        2
                      )}
                    </code>
                  </pre>
                </div>
              </details>
            </>
          )}
        </div>
      ) : (
        <div className='flex items-center justify-center p-8'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500'></div>
          <span className='ml-2 text-slate-600'>
            Loading Sentry settings...
          </span>
        </div>
      )}
    </div>
  );
};
