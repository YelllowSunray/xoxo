"use client";

import React from 'react';

interface IncomingCallToastProps {
  callerName: string;
  onAccept: () => void;
  onDecline: () => void;
}

export default function IncomingCallToast({ callerName, onAccept, onDecline }: IncomingCallToastProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 bg-black/80 backdrop-blur-lg border border-pink-500/30 rounded-xl p-3 md:p-4 w-[90vw] max-w-xs md:w-80 text-white shadow-2xl safe-bottom">
      <div className="font-semibold mb-1">Incoming Call</div>
      <div className="text-sm text-gray-300 mb-3">{callerName} is calling you…</div>
      <div className="flex gap-2">
        <button onClick={onAccept} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold">Accept</button>
        <button onClick={onDecline} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-semibold">Decline</button>
      </div>
    </div>
  );
}


