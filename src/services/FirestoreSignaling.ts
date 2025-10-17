import { db } from '@/lib/firebase';
import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, setDoc, updateDoc, serverTimestamp, query, orderBy, where, getDocs, writeBatch } from 'firebase/firestore';

export type FirestoreSignalType = 'offer' | 'answer' | 'ice-candidate';

export interface FirestoreSignal {
  type: FirestoreSignalType;
  data: any;
  from: string;
  createdAt?: any;
}

export class FirestoreSignaling {
  private roomId: string | null = null;
  private unsubscribes: Array<() => void> = [];
  private localUserId: string;
  private joinedAt: Date;

  constructor(localUserId: string) {
    this.localUserId = localUserId;
    this.joinedAt = new Date();
  }

  async joinRoom(roomId: string, opts?: { onSignal?: (signal: FirestoreSignal) => void }): Promise<void> {
    this.roomId = roomId;
    this.joinedAt = new Date(); // Reset join time

    const roomRef = doc(db, 'webrtcRooms', roomId);
    const signalsCol = collection(roomRef, 'signals');

    // Clear old signals to prevent replay issues
    try {
      const oldSignals = await getDocs(signalsCol);
      if (!oldSignals.empty) {
        const batch = writeBatch(db);
        oldSignals.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        console.log(`Cleared ${oldSignals.size} old signals`);
      }
    } catch (error) {
      console.warn('Could not clear old signals:', error);
    }

    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) {
      await setDoc(roomRef, {
        createdAt: serverTimestamp(),
        participants: [this.localUserId],
        lastActivity: serverTimestamp()
      }, { merge: true });
    } else {
      await updateDoc(roomRef, {
        participants: Array.from(new Set([...(roomSnap.data()?.participants || []), this.localUserId])),
        lastActivity: serverTimestamp()
      });
    }

    // Small delay to ensure cleanup completes before listening
    await new Promise(resolve => setTimeout(resolve, 100));

    // Listen to incoming signals ordered by time
    const q = query(signalsCol, orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      console.log(`📬 Firestore snapshot: ${snapshot.docChanges().length} changes`);
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const signal = change.doc.data() as FirestoreSignal;
          console.log(`📨 Firestore signal received: ${signal.type} from ${signal.from}`);
          
          // Ignore our own signals
          if (signal.from === this.localUserId) {
            console.log(`⏭️ Skipping own signal`);
            return;
          }
          
          console.log(`✅ Processing signal: ${signal.type}`);
          opts?.onSignal?.(signal);
        }
      });
    });
    this.unsubscribes.push(unsub);
  }

  async leaveRoom(): Promise<void> {
    this.unsubscribes.forEach((u) => u());
    this.unsubscribes = [];
    this.roomId = null;
  }

  async sendSignal(type: FirestoreSignalType, data: any): Promise<void> {
    if (!this.roomId) return;
    const roomRef = doc(db, 'webrtcRooms', this.roomId);
    const signalsCol = collection(roomRef, 'signals');
    
    // Serialize data to plain object (Firestore can't store RTCIceCandidate/RTCSessionDescription objects)
    let serializedData = null;
    if (data) {
      if (type === 'ice-candidate' && data.candidate) {
        // ICE candidates need special handling - convert to plain object
        serializedData = {
          candidate: data.candidate,
          sdpMid: data.sdpMid,
          sdpMLineIndex: data.sdpMLineIndex,
          usernameFragment: data.usernameFragment
        };
      } else {
        serializedData = JSON.parse(JSON.stringify(data));
      }
    }
    
    console.log(`📡 Sending ${type} signal to Firestore`);
    try {
      await addDoc(signalsCol, {
        type,
        data: serializedData,
        from: this.localUserId,
        createdAt: serverTimestamp()
      });
      console.log(`✅ ${type} signal sent successfully`);
    } catch (error) {
      console.error(`❌ Failed to send ${type} signal:`, error);
      throw error;
    }
  }
}


