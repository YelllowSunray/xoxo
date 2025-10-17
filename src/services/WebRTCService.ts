// WebRTC Service for peer-to-peer video chat
import { io, Socket } from 'socket.io-client';
import { FirestoreSignaling, FirestoreSignal } from '@/services/FirestoreSignaling';

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join-room' | 'leave-room' | 'user-joined' | 'user-left';
  data?: any;
  from?: string;
  to?: string;
  roomId?: string;
}

// Use full RTCConfiguration for flexibility (e.g., iceTransportPolicy)
export type WebRTCConfig = RTCConfiguration;

export class WebRTCService {
  private socket: Socket | null = null;
  private firestoreSignaling: FirestoreSignaling | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private roomId: string | null = null;
  private userId: string;
  private isInitiator = false;
  private useFirestore = (process.env.NEXT_PUBLIC_SIGNALING_MODE || 'socket').toLowerCase() === 'firestore';
  private makingOffer = false;
  private ignoreOffer = false;
  private isSettingRemoteAnswerPending = false;
  private pendingIceCandidates: RTCIceCandidate[] = [];

  // Configuration for STUN/TURN servers (env-driven with sensible defaults)
  private config: WebRTCConfig = (() => {
    const stunUrls = (process.env.NEXT_PUBLIC_STUN_URLS || 'stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302,stun:stun.cloudflare.com:3478')
      .split(',')
      .map(u => u.trim())
      .filter(Boolean);

    const turnUrlsRaw = (process.env.NEXT_PUBLIC_TURN_URLS || 'turn:openrelay.metered.ca:80,turn:openrelay.metered.ca:443,turn:relay.metered.ca:80,turn:relay.metered.ca:443')
      .split(',')
      .map(u => u.trim())
      .filter(Boolean);
    const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME || 'openrelayproject';
    const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL || 'openrelayproject';

    const iceServers: RTCIceServer[] = [
      ...stunUrls.map(url => ({ urls: url } as RTCIceServer)),
      ...turnUrlsRaw.map(url => ({ urls: url, username: turnUsername, credential: turnCredential } as RTCIceServer)),
    ];

    console.log('🧊 ICE servers configured:', iceServers.length);
    return { iceServers };
  })();

  // Event callbacks
  public onRemoteStream?: (stream: MediaStream) => void;
  public onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  public onUserJoined?: (userId: string) => void;
  public onUserLeft?: (userId: string) => void;
  public onError?: (error: Error) => void;

  constructor(userId: string, signalingServerUrl?: string) {
    this.userId = userId;
    
    if (this.useFirestore) {
      console.log('🔁 Using Firestore for signaling');
      this.firestoreSignaling = new FirestoreSignaling(this.userId);
    } else {
      // Initialize socket connection
      // For development, you can use a local signaling server
      // For production, deploy to your server
      const defaultProtocol = (typeof window !== 'undefined' && window.location?.protocol === 'https:') ? 'https' : 'http';
      const serverUrl = signalingServerUrl || `${defaultProtocol}://localhost:3001`;
      
      try {
        this.socket = io(serverUrl, {
          transports: ['websocket', 'polling'],
          timeout: 8000,
          withCredentials: true,
          path: '/socket.io'
        });
  
        this.setupSocketListeners();
      } catch (error) {
        console.warn('Signaling server not available, using mock connection');
        this.setupMockConnection();
      }
    }
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to signaling server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from signaling server');
    });

    this.socket.on('message', (message: SignalingMessage) => {
      this.handleSignalingMessage(message);
    });

    this.socket.on('user-joined', (userId: string) => {
      console.log('User joined:', userId);
      if (this.onUserJoined) this.onUserJoined(userId);
      
      // If we're the first user in the room, we become the initiator
      if (!this.isInitiator) {
        this.isInitiator = true;
        this.createOffer();
      }
    });

    this.socket.on('user-left', (userId: string) => {
      console.log('User left:', userId);
      if (this.onUserLeft) this.onUserLeft(userId);
      this.handleUserLeft();
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      if (this.onError) this.onError(new Error('Failed to connect to signaling server'));
      // Fallback to mock connection so local UI still works during development
      this.setupMockConnection();
    });
  }

  private setupMockConnection() {
    // For development without a signaling server
    console.log('Using mock WebRTC connection for development');
    
    setTimeout(() => {
      if (this.onUserJoined) this.onUserJoined('mock-user');
      if (this.onConnectionStateChange) this.onConnectionStateChange('connected');
    }, 1500);
  }

  async initializeLocalStream(constraints: MediaStreamConstraints = { video: true, audio: true }): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Local stream initialized');
      return this.localStream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw new Error('Failed to access camera/microphone');
    }
  }

  async joinRoom(roomId: string): Promise<void> {
    this.roomId = roomId;

    // Ensure peer connection is ready BEFORE signaling, to avoid race where
    // 'user-joined' arrives and we attempt to createOffer without a connection.
    await this.setupPeerConnection();

    if (this.useFirestore && this.firestoreSignaling) {
      await this.firestoreSignaling.joinRoom(roomId, {
        onSignal: async (signal: FirestoreSignal) => {
          await this.handleSignalingMessage({ type: signal.type as any, data: signal.data, roomId });
        }
      });

      // Deterministic initiator: first uid in sorted roomId "uidA_uidB" is initiator
      const firstUid = roomId.split('_')[0];
      console.log(`🎯 Room: ${roomId}, First UID: ${firstUid}, My UID: ${this.userId}`);
      if (firstUid === this.userId) {
        this.isInitiator = true;
        console.log(`🚀 I am the initiator - creating offer`);
        await this.createOffer();
      } else {
        console.log(`👂 I am NOT the initiator - waiting for offer`);
      }
    } else if (this.socket?.connected) {
      console.log('Joining room:', roomId);
      this.socket.emit('join-room', { roomId, userId: this.userId });
    } else {
      // Mock join for development
      console.log(`Joined room (mock): ${roomId}`);
      setTimeout(() => {
        if (this.onUserJoined) this.onUserJoined('mock-partner');
      }, 1000);
    }
  }

  private async setupPeerConnection(): Promise<void> {
    this.peerConnection = new RTCPeerConnection(this.config);

    // Proactively create transceivers to ensure recv tracks are negotiated
    try {
      this.peerConnection.addTransceiver('video', { direction: 'sendrecv' });
      this.peerConnection.addTransceiver('audio', { direction: 'sendrecv' });
    } catch {}

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        if (this.peerConnection && this.localStream) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });
    }

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      console.log('Received remote track:', event.track?.kind);
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
      } else {
        // Some browsers (Safari) may not populate streams; aggregate manually
        if (!this.remoteStream) this.remoteStream = new MediaStream();
        this.remoteStream.addTrack(event.track);
      }
      if (this.onRemoteStream && this.remoteStream) {
        this.onRemoteStream(this.remoteStream);
      }
    };

    // Extra diagnostics for ICE/signaling
    this.peerConnection.oniceconnectionstatechange = () => {
      const iceState = this.peerConnection?.iceConnectionState;
      console.log('🧊 ICE connection state:', iceState);
      if (iceState === 'failed' || iceState === 'disconnected') {
        console.error('❌ ICE connection failed - TURN server may be needed');
      }
    };
    this.peerConnection.onicegatheringstatechange = () => {
      console.log('ICE gathering state:', this.peerConnection?.iceGatheringState);
    };
    this.peerConnection.onsignalingstatechange = () => {
      console.log('Signaling state:', this.peerConnection?.signalingState);
    };
    this.peerConnection.onicecandidateerror = (event: RTCPeerConnectionIceErrorEvent) => {
      console.warn('⚠️ ICE candidate error:', event.errorCode, event.errorText, event.url);
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`📤 Sending ICE candidate:`, event.candidate.type);
        this.sendSignalingMessage({
          type: 'ice-candidate',
          data: event.candidate,
          roomId: this.roomId!
        });
      } else {
        console.log(`✅ ICE gathering complete`);
      }
    };

    // In case tracks are added later, renegotiate (only initiator should create offers)
    this.peerConnection.onnegotiationneeded = async () => {
      try {
        if (this.isInitiator && this.peerConnection?.signalingState === 'stable') {
          console.log('onnegotiationneeded → creating offer');
          await this.createOffer();
        }
      } catch (e) {
        console.error('Negotiation failed:', e);
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log('Connection state changed:', state);
      if (this.onConnectionStateChange && state) {
        this.onConnectionStateChange(state);
      }
    };
  }

  private async createOffer(): Promise<void> {
    if (!this.peerConnection || this.makingOffer) return;

    try {
      this.makingOffer = true;
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      this.sendSignalingMessage({
        type: 'offer',
        data: offer,
        roomId: this.roomId!
      });
    } catch (error) {
      console.error('Error creating offer:', error);
      if (this.onError) this.onError(new Error('Failed to create offer'));
    } finally {
      this.makingOffer = false;
    }
  }

  private async createAnswer(offer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection || this.isSettingRemoteAnswerPending) {
      console.log(`⚠️ Skipping answer - already processing one`);
      return;
    }

    try {
      this.isSettingRemoteAnswerPending = true;
      const currentState = this.peerConnection.signalingState;
      console.log(`🔄 Creating answer from state: ${currentState}`);
      
      // Only set remote description if we're in the right state
      if (currentState !== 'stable' && currentState !== 'have-local-offer') {
        console.log(`⚠️ Skipping answer - wrong state: ${currentState}`);
        return;
      }
      
      await this.peerConnection.setRemoteDescription(offer);
      
      // Process any pending ICE candidates now that remote description is set
      if (this.pendingIceCandidates.length > 0) {
        console.log(`📥 Adding ${this.pendingIceCandidates.length} queued ICE candidates`);
        for (const candidate of this.pendingIceCandidates) {
          try {
            await this.peerConnection.addIceCandidate(candidate);
          } catch (err) {
            console.warn('Error adding queued candidate:', err);
          }
        }
        this.pendingIceCandidates = [];
      }
      
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      console.log(`✅ Answer created and sent`);
      this.sendSignalingMessage({
        type: 'answer',
        data: answer,
        roomId: this.roomId!
      });
    } catch (error) {
      console.error('Error creating answer:', error);
      if (this.onError) this.onError(new Error('Failed to create answer'));
    } finally {
      this.isSettingRemoteAnswerPending = false;
    }
  }

  private async handleSignalingMessage(message: SignalingMessage): Promise<void> {
    if (!this.peerConnection) return;

    const state = this.peerConnection.signalingState;
    console.log(`📨 Received ${message.type} in state: ${state}, connectionState: ${this.peerConnection.connectionState}`);

    try {
      switch (message.type) {
        case 'offer':
          const offerCollision = state !== 'stable' || this.makingOffer;
          
          this.ignoreOffer = !this.isInitiator && offerCollision;
          if (this.ignoreOffer) {
            console.log('⚠️ Ignoring offer (collision, we are polite peer making offer)');
            return;
          }
          
          // If already connected and stable, ignore duplicate offers
          if (state === 'stable' && this.peerConnection.connectionState === 'connected') {
            console.log('✅ Ignoring offer - already connected');
            return;
          }
          
          // Polite peer: rollback on collision
          if (offerCollision) {
            console.log('🔄 Rolling back (polite peer)');
            await this.peerConnection.setLocalDescription({ type: 'rollback' });
          }
          
          await this.createAnswer(message.data);
          break;
          
        case 'answer':
          if (this.ignoreOffer) {
            return;
          }
          if (state === 'have-local-offer') {
            await this.peerConnection.setRemoteDescription(message.data);
          } else {
            console.log(`⚠️ Ignoring answer in state: ${state}`);
          }
          break;
          
        case 'ice-candidate':
          if (message.data) {
            console.log(`🧊 Received ICE candidate, remoteDescription: ${this.peerConnection.remoteDescription ? 'set' : 'NOT SET'}`);
            try {
              // If remote description isn't set yet, queue the candidate
              if (!this.peerConnection.remoteDescription) {
                console.log(`⏳ Queueing ICE candidate (no remote description yet)`);
                this.pendingIceCandidates.push(new RTCIceCandidate(message.data));
              } else {
                await this.peerConnection.addIceCandidate(message.data);
                console.log(`✅ ICE candidate added`);
              }
            } catch (err) {
              if (!this.ignoreOffer) {
                console.warn('⚠️ ICE candidate error:', err);
              }
            }
          }
          break;
      }
    } catch (error) {
      console.error('Error handling signaling message:', error);
      if (this.onError) this.onError(new Error('Signaling error'));
    }
  }

  private sendSignalingMessage(message: SignalingMessage): void {
    if (this.useFirestore && this.firestoreSignaling) {
      // Firestore path
      this.firestoreSignaling.sendSignal(message.type as any, message.data);
    } else if (this.socket?.connected) {
      console.log('Sending signaling message:', message.type);
      this.socket.emit('message', message);
    } else {
      console.log('Mock signaling message:', message);
    }
  }

  private handleUserLeft(): void {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.remoteStream = null;
  }

  toggleVideo(enabled: boolean): void {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = enabled;
      }
    }
  }

  toggleAudio(enabled: boolean): void {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = enabled;
      }
    }
  }

  async leaveRoom(): Promise<void> {
    if (this.socket?.connected && this.roomId) {
      this.socket.emit('leave-room', { roomId: this.roomId, userId: this.userId });
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    this.remoteStream = null;
    this.roomId = null;
    this.isInitiator = false;
  }

  disconnect(): void {
    this.leaveRoom();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.firestoreSignaling = null;
  }

  async restartIce(): Promise<void> {
    if (!this.peerConnection) return;
    try {
      console.log('Restarting ICE...');
      const offer = await this.peerConnection.createOffer({ iceRestart: true });
      await this.peerConnection.setLocalDescription(offer);
      this.sendSignalingMessage({ type: 'offer', data: offer, roomId: this.roomId! });
    } catch (e) {
      console.error('ICE restart failed:', e);
    }
  }

  // Getters
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  getConnectionState(): RTCPeerConnectionState | null {
    return this.peerConnection?.connectionState || null;
  }

  isConnected(): boolean {
    return this.peerConnection?.connectionState === 'connected';
  }
}
