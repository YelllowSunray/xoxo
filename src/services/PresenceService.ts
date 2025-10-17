import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { UserProfile } from '@/contexts/AuthContext';

export class PresenceService {
  static async upsertPerformer(userId: string, profile: UserProfile, isOnline: boolean = true): Promise<void> {
    const performerRef = doc(db, 'performers', userId);

    const performerDoc = {
      username: profile.username,
      displayName: profile.displayName,
      age: profile.age,
      gender: profile.gender,
      isOnline: !!isOnline,
      lastSeen: serverTimestamp(),
      tags: profile.preferences?.categories || [],
      connectionFee: profile.connectionFee ?? 2.99,
      profilePicture: profile.profilePicture || null,
      bio: profile.bio || '',
      preferences: {
        categories: profile.preferences?.categories || [],
      },
      stats: {
        totalSessions: 0,
        totalMinutes: 0,
        totalEarnings: 0,
        favoriteCount: 0,
      },
      availability: {
        isAvailable: !!isOnline,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      },
    };

    await setDoc(performerRef, performerDoc, { merge: true });
  }

  static async setOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    const performerRef = doc(db, 'performers', userId);
    await setDoc(
      performerRef,
      {
        isOnline,
        lastSeen: serverTimestamp(),
        'availability.isAvailable': isOnline,
      },
      { merge: true }
    );
  }

  // Heartbeat presence update – returns a stop function
  static startHeartbeat(userId: string, intervalMs: number = 15000): () => void {
    let stopped = false;
    let intervalId: NodeJS.Timeout | null = null;
    
    const tick = async () => {
      if (stopped) return;
      try {
        await this.setOnlineStatus(userId, true);
        console.log("💓 Heartbeat sent for", userId);
      } catch (error) {
        console.error("❌ Heartbeat failed:", error);
      }
    };
    
    // Immediate tick then interval
    tick();
    intervalId = setInterval(tick, intervalMs);

    // Mark offline when page closes
    const markOffline = async () => {
      console.log("👋 Marking user offline:", userId);
      try {
        await this.setOnlineStatus(userId, false);
      } catch (error) {
        console.error("Failed to mark offline:", error);
      }
    };
    
    // Attach event listeners
    window.addEventListener('pagehide', markOffline);
    window.addEventListener('beforeunload', markOffline);
    

    // Cleanup function
    return () => {
      console.log("⏹️ Stopping heartbeat for", userId);
      stopped = true;
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener('pagehide', markOffline);
      window.removeEventListener('beforeunload', markOffline);
      // Best-effort offline when stopping
      this.setOnlineStatus(userId, false).catch(() => {});
    };
  }
}
