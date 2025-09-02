import React, { useState, useEffect } from 'react';

interface LogsDisplayProps {
  className?: string;
}

export const LogsDisplay: React.FC<LogsDisplayProps> = ({ className = '' }) => {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const addLog = (type: string, ...args: any[]) => {
      const timestamp = new Date().toLocaleTimeString();
      const message = args
        .map((arg) =>
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        )
        .join(' ');

      setLogs((prevLogs) => {
        const newLogs = [
          ...prevLogs,
          `[${timestamp}] ${type.toUpperCase()}: ${message}`,
        ];
        return newLogs.length > 50 ? newLogs.slice(-50) : newLogs;
      });
    };

    let isActive = true;

    // Use Sentry's proven console instrumentation approach
    const setupConsoleInstrumentation = async () => {
      try {
        // Try to import Sentry's console instrumentation handler
        const sentryCore = await import('@sentry/core');

        // Check if addConsoleInstrumentationHandler is available
        if ('addConsoleInstrumentationHandler' in sentryCore) {
          const { addConsoleInstrumentationHandler } = sentryCore as any;

          addConsoleInstrumentationHandler(
            ({ args, level }: { args: any[]; level: string }) => {
              if (isActive) {
                addLog(level, ...args);
              }
            }
          );

          return;
        }
      } catch (error) {
        // Fall through to manual approach
      }

      console.warn('[LogsDisplay] addConsoleInstrumentationHandler failed');
    };

    setupConsoleInstrumentation();

    return () => {
      isActive = false;
    };
  }, []);

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className={`bg-white rounded-lg p-6 shadow-sm ${className}`}>
      <h2 className='text-slate-800 mt-0'>Console Logs</h2>
      <div className='logs'>{logs.join('\n')}</div>
      <button onClick={clearLogs} className='btn'>
        Clear Logs
      </button>
    </div>
  );
};
