import { db } from '@/lib/firebase';
import { addDoc, collection, doc, onSnapshot, query, updateDoc, where, serverTimestamp } from 'firebase/firestore';

export interface CallInvite {
  id: string;
  roomId: string;
  callerId: string;
  callerName: string;
  calleeId: string;
  calleeName: string;
  status: 'ringing' | 'accepted' | 'ended';
  createdAt: Date;
  updatedAt: Date;
}

export class CallService {
  static async createCall(params: { callerId: string; callerName: string; calleeId: string; calleeName: string; }): Promise<{ callId: string; roomId: string; }> {
    const roomId = [params.callerId, params.calleeId].sort().join('_');
    const ref = await addDoc(collection(db, 'calls'), {
      roomId,
      callerId: params.callerId,
      callerName: params.callerName,
      calleeId: params.calleeId,
      calleeName: params.calleeName,
      status: 'ringing',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { callId: ref.id, roomId };
  }

  static listenIncoming(userId: string, callback: (invite: CallInvite) => void): () => void {
    const q = query(collection(db, 'calls'), where('calleeId', '==', userId), where('status', '==', 'ringing'));
    return onSnapshot(q, (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data() as any;
          callback({
            id: change.doc.id,
            roomId: data.roomId,
            callerId: data.callerId,
            callerName: data.callerName,
            calleeId: data.calleeId,
            calleeName: data.calleeName,
            status: data.status,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
          });
        }
      });
    });
  }

  static async acceptCall(callId: string): Promise<void> {
    const ref = doc(db, 'calls', callId);
    await updateDoc(ref, { status: 'accepted', updatedAt: serverTimestamp() });
  }

  static async endCall(callId: string): Promise<void> {
    const ref = doc(db, 'calls', callId);
    await updateDoc(ref, { status: 'ended', updatedAt: serverTimestamp() });
  }
}
