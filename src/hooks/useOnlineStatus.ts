"use client";

import { useState, useEffect } from "react";

// Simulated online status hook
// In production, this would connect to a real-time database like Firebase Realtime Database
export function useOnlineStatus() {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Simulate some users being online
    const initialOnlineUsers = new Set(["1", "2", "4", "5", "6"]);
    setOnlineUsers(initialOnlineUsers);

    // Simulate users going online/offline randomly
    const interval = setInterval(() => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        const allUserIds = ["1", "2", "3", "4", "5", "6"];
        
        // Randomly add/remove users
        allUserIds.forEach(userId => {
          if (Math.random() > 0.8) { // 20% chance to change status
            if (newSet.has(userId)) {
              newSet.delete(userId);
            } else {
              newSet.add(userId);
            }
          }
        });
        
        return newSet;
      });
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const isUserOnline = (userId: string) => onlineUsers.has(userId);

  return { onlineUsers, isUserOnline };
}
