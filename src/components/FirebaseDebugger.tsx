"use client";

import React, { useState } from 'react';
import { testFirebaseConnection, diagnoseFirebaseIssues, ConnectionTestResult } from '@/utils/firebaseTest';

const FirebaseDebugger: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<ConnectionTestResult[]>([]);
  const [showDebugger, setShowDebugger] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    try {
      const testResults = await testFirebaseConnection();
      setResults(testResults);
      
      // Also run diagnosis
      await diagnoseFirebaseIssues();
    } catch (error) {
      console.error('Error running Firebase tests:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (success: boolean) => {
    return success ? '✅' : '❌';
  };

  const getStatusColor = (success: boolean) => {
    return success ? 'text-green-600' : 'text-red-600';
  };

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!showDebugger ? (
        <button
          onClick={() => setShowDebugger(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium"
        >
          🔥 Firebase Debug
        </button>
      ) : (
        <div className="bg-black/80 backdrop-blur-lg border border-pink-500/30 rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-white">Firebase Debugger</h3>
            <button
              onClick={() => setShowDebugger(false)}
              className="text-gray-300 hover:text-white text-xl"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={runTests}
              disabled={isRunning}
              className={`w-full py-2 px-4 rounded-md text-white font-medium ${
                isRunning
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700'
              }`}
            >
              {isRunning ? 'Running Tests...' : 'Run Connection Tests'}
            </button>

            {results.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-pink-300">Test Results:</h4>
                {results.map((result, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between p-2 bg-white/5 rounded text-sm"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span>{getStatusIcon(result.success)}</span>
                        <span className={getStatusColor(result.success)}>
                          {result.test}
                        </span>
                      </div>
                      {result.duration && (
                        <div className="text-gray-300 text-xs mt-1">
                          {result.duration}ms
                        </div>
                      )}
                      {!result.success && result.error && (
                        <div className="text-red-400 text-xs mt-1 break-words">
                          {result.error}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                <div className="mt-3 p-2 bg-white/5 rounded text-xs text-gray-200">
                  💡 Check the browser console for detailed logs and recommendations
                </div>
              </div>
            )}

            <div className="text-xs text-gray-300 mt-3">
              <div>Network: {navigator.onLine ? '🟢 Online' : '🔴 Offline'}</div>
              <div>Protocol: {window.location.protocol}</div>
              <div>Host: {window.location.hostname}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FirebaseDebugger;
