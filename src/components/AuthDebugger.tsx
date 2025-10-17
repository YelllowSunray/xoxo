"use client";

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';

const AuthDebugger: React.FC = () => {
  const { user, userProfile, loading, logout } = useAuth();

  const clearAllAuth = async () => {
    try {
      // Sign out from Firebase
      await auth.signOut();
      
      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear cookies (if any)
      document.cookie.split(";").forEach((c) => {
        const eqPos = c.indexOf("=");
        const name = eqPos > -1 ? c.substr(0, eqPos) : c;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      });
      
      // Reload page
      window.location.href = '/signin';
    } catch (error) {
      console.error('Error clearing auth:', error);
    }
  };

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const [minimized, setMinimized] = useState(false);

  return (
    <div className="fixed top-4 left-4 z-50 bg-black/80 backdrop-blur-lg border border-pink-500/30 rounded-lg p-3 text-white text-sm max-w-xs">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-pink-400">🔍 Auth Debug</h3>
        <button
          onClick={() => setMinimized((v) => !v)}
          className="px-2 py-0.5 text-xs rounded bg-white/10 hover:bg-white/20"
          title={minimized ? 'Expand' : 'Minimize'}
        >
          {minimized ? '▢' : '—'}
        </button>
      </div>

      {minimized ? (
        <div className="flex items-center gap-2 text-xs">
          <span>Loading: <span className={loading ? 'text-yellow-400' : 'text-green-400'}>{loading ? 'Yes' : 'No'}</span></span>
          <span>• User: <span className={user ? 'text-green-400' : 'text-red-400'}>{user ? 'In' : 'Out'}</span></span>
          <span>• Profile: <span className={userProfile ? 'text-green-400' : 'text-red-400'}>{userProfile ? 'OK' : '—'}</span></span>
        </div>
      ) : (
        <>
          <div className="space-y-1 mb-3">
            <div>Loading: <span className={loading ? 'text-yellow-400' : 'text-green-400'}>{loading ? 'Yes' : 'No'}</span></div>
            <div>User: <span className={user ? 'text-green-400' : 'text-red-400'}>{user ? 'Logged in' : 'Not logged in'}</span></div>
            <div>Profile: <span className={userProfile ? 'text-green-400' : 'text-red-400'}>{userProfile ? 'Loaded' : 'None'}</span></div>
            {user && <div>UID: <span className="text-gray-300 text-xs">{user.uid.slice(0, 8)}...</span></div>}
            {userProfile && <div>Username: <span className="text-gray-300">{userProfile.username}</span></div>}
          </div>
          
          <div className="space-y-2">
            {user && (
              <button
                onClick={logout}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-1 px-2 rounded text-xs"
              >
                Logout
              </button>
            )}
            
            <button
              onClick={clearAllAuth}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-1 px-2 rounded text-xs"
            >
              Clear All Auth
            </button>
            
            <button
              onClick={() => window.location.href = '/signin'}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded text-xs"
            >
              Go to SignIn
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AuthDebugger;
