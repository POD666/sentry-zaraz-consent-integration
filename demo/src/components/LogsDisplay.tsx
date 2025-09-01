import React, { useState, useEffect } from 'react';

interface LogsDisplayProps {
  className?: string;
}

export const LogsDisplay: React.FC<LogsDisplayProps> = ({ className = '' }) => {
  const [logs, setLogs] = useState<string[]>([]);

  // Override console methods
  useEffect(() => {
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

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

    return () => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
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
