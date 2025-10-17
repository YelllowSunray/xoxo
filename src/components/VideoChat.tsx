"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { VideoStorageService } from "@/utils/videoStorage";
import { WebRTCService } from "@/services/WebRTCService";

interface VideoChatProps {
  partnerId: string;
  partnerName: string;
  onEndCall: () => void;
  connectionFee: number;
}

export default function VideoChat({ partnerId, partnerName, onEndCall, connectionFee }: VideoChatProps) {
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [callDuration, setCallDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTitle, setRecordingTitle] = useState("");
  const [recordingPrice, setRecordingPrice] = useState(9.99);
  const [showRecordingSettings, setShowRecordingSettings] = useState(false);
  const [needsUserGesture, setNeedsUserGesture] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(Date.now());
  const webrtcRef = useRef<WebRTCService | null>(null);

  const { user, userProfile, addSessionHistory, addRecording, updateWallet } = useAuth();

  useEffect(() => {
    const setupWebRTC = async () => {
      try {
        if (!user?.uid) return;

        webrtcRef.current = new WebRTCService(user.uid, "https://xoxosocketbackend.onrender.com");

        const stream = await webrtcRef.current.initializeLocalStream({
          video: { width: 1280, height: 720 },
          audio: true,
        });

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        webrtcRef.current.onRemoteStream = (remoteStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.play?.().catch(() => {
              // Autoplay may be blocked (especially on mobile Safari). Ask for a tap.
              setNeedsUserGesture(true);
            });
          }
          setConnectionStatus("connected");
        };

        webrtcRef.current.onConnectionStateChange = (state) => {
          if (state === "connected") setConnectionStatus("connected");
          else if (state === "disconnected" || state === "failed" || state === "closed") setConnectionStatus("disconnected");
          else setConnectionStatus("connecting");
        };

        webrtcRef.current.onUserLeft = () => {
          setConnectionStatus("disconnected");
          onEndCall();
        };

        const roomId = [user.uid, partnerId].sort().join('_');
        await webrtcRef.current.joinRoom(roomId);
      } catch (error) {
        console.error("WebRTC setup failed:", error);
        alert("Failed to initialize video call. Please check camera/mic permissions.");
      }
    };

    setupWebRTC();

    // Duration timer
    const durationInterval = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    return () => {
      // Cleanup
      clearInterval(durationInterval);
      webrtcRef.current?.leaveRoom();
      webrtcRef.current?.disconnect();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [partnerId, user?.uid]);

  const toggleVideo = () => {
    const next = !isVideoEnabled;
    webrtcRef.current?.toggleVideo(next);
    setIsVideoEnabled(next);
  };

  const toggleAudio = () => {
    const next = !isAudioEnabled;
    webrtcRef.current?.toggleAudio(next);
    setIsAudioEnabled(next);
  };

  const startRecording = () => {
    if (!localStreamRef.current) return;

    try {
      const options = { mimeType: 'video/webm;codecs=vp9' };
      const mediaRecorder = new MediaRecorder(localStreamRef.current, options);
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setShowRecordingSettings(false);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Recording not supported in this browser');
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current) return;

    return new Promise<void>((resolve) => {
      mediaRecorderRef.current!.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        
        try {
          // Upload video to storage
          const uploadResult = await VideoStorageService.uploadRecording(blob, {
            title: recordingTitle || `Session with ${partnerName}`,
            description: `Private session recording with ${partnerName}`,
            ownerId: user?.uid || '',
            ownerName: userProfile?.displayName || '',
            partnerId,
            partnerName,
            price: recordingPrice,
            isPublic: true,
            tags: ['Session', 'Live', partnerName]
          });

          // Save recording to profile
          const recordingId = `rec_${Date.now()}`;
          await addRecording({
            id: recordingId,
            partnerId,
            partnerUsername: partnerName,
            title: recordingTitle || `Session with ${partnerName}`,
            duration: uploadResult.duration,
            timestamp: new Date(),
            views: 0,
            earnings: 0,
            price: recordingPrice,
            isPublic: true,
            thumbnail: uploadResult.thumbnailUrl,
          });

        } catch (error) {
          console.error('Failed to save recording:', error);
        }

        // Reset
        recordedChunksRef.current = [];
        setIsRecording(false);
        resolve();
      };

      mediaRecorderRef.current!.stop();
    });
  };

  const handleEndCall = async () => {
    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    
    // Stop recording if active
    if (isRecording) {
      await stopRecording();
    }

    // Leave WebRTC room to notify peer and cleanup connection
    await webrtcRef.current?.leaveRoom();

    // Save session to history
    await addSessionHistory({
      partnerId,
      partnerUsername: partnerName,
      duration,
      timestamp: new Date(),
      connectionFee,
      wasRecorded: isRecording,
    });

    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    onEndCall();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col safe-top safe-bottom">
      {/* Remote Video (Full Screen) */}
      <div className="flex-1 relative bg-gray-900">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-contain"
        />

          {needsUserGesture && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
              <button
                onClick={() => {
                  if (remoteVideoRef.current) {
                    remoteVideoRef.current.play?.().then(() => setNeedsUserGesture(false));
                  }
                }}
                className="px-6 py-3 bg-pink-600 text-white rounded-lg font-semibold shadow-lg"
              >
                Tap to start stream
              </button>
            </div>
          )}
        
        {connectionStatus === "connecting" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-500 mx-auto mb-4"></div>
              <p className="text-white text-lg">Connecting to {partnerName}...</p>
            </div>
          </div>
        )}

        {/* Local Video (Picture-in-Picture) */}
        <div className="absolute top-4 right-4 w-36 h-28 md:w-48 md:h-36 rounded-lg overflow-hidden border-2 border-pink-500 shadow-2xl">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover mirror"
          />
          {!isVideoEnabled && (
            <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-pink-600 flex items-center justify-center text-white text-2xl font-bold">
                You
              </div>
            </div>
          )}
        </div>

        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-3 md:p-4 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white text-xl font-semibold">{partnerName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${connectionStatus === "connected" ? "bg-green-500" : "bg-yellow-500"}`}></div>
                <span className="text-gray-300 text-sm capitalize">{connectionStatus}</span>
              </div>
            </div>
            <div className="text-white text-lg font-mono">
              {formatDuration(callDuration)}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-black/90 backdrop-blur-lg border-t border-pink-500/20 p-4 md:p-6 safe-bottom">
        <div className="max-w-4xl mx-auto">
          {/* Recording Settings Panel */}
          {showRecordingSettings && !isRecording && (
            <div className="bg-gradient-to-r from-pink-600/20 to-purple-600/20 border border-pink-500/30 rounded-lg p-4 mb-4">
              <h3 className="text-white font-semibold mb-3">Recording Settings</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-pink-300 text-sm mb-1">Title</label>
                  <input
                    type="text"
                    value={recordingTitle}
                    onChange={(e) => setRecordingTitle(e.target.value)}
                    placeholder={`Session with ${partnerName}`}
                    className="w-full px-3 py-2 bg-black/30 border border-pink-500/30 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-pink-300 text-sm mb-1">Price ($)</label>
                  <input
                    type="number"
                    value={recordingPrice}
                    onChange={(e) => setRecordingPrice(parseFloat(e.target.value))}
                    min="0.99"
                    step="0.50"
                    className="w-full px-3 py-2 bg-black/30 border border-pink-500/30 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={startRecording}
                  className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 text-white py-2 rounded-lg hover:from-pink-700 hover:to-purple-700 transition font-semibold"
                >
                  Start Recording
                </button>
                <button
                  onClick={() => setShowRecordingSettings(false)}
                  className="px-4 bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-600 transition"
                >
                  Cancel
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                💰 Earnings will be split 50/50 with {partnerName}
              </p>
            </div>
          )}

          <div className="flex items-center justify-center gap-3 md:gap-4">
            <button
              onClick={toggleVideo}
              className={`p-3 md:p-4 rounded-full transition touch-target ${
                isVideoEnabled
                  ? "bg-gray-700 hover:bg-gray-600"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {isVideoEnabled ? (
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A2 2 0 0018 13V7a1 1 0 00-1.447-.894l-2 1A1 1 0 0014 8v.586l-2-2V6a2 2 0 00-2-2H8.586l-2-2H10a4 4 0 014 4v.586l-2-2z" clipRule="evenodd" />
                </svg>
              )}
            </button>

            <button
              onClick={toggleAudio}
              className={`p-3 md:p-4 rounded-full transition touch-target ${
                isAudioEnabled
                  ? "bg-gray-700 hover:bg-gray-600"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {isAudioEnabled ? (
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A7.001 7.001 0 0017 8a1 1 0 10-2 0 5 5 0 01-.642 2.476l-1.31-1.31A3.001 3.001 0 0010 5c-.15 0-.3.012-.447.035L7.707 3.189A5.001 5.001 0 0115 8a1 1 0 102 0 7.001 7.001 0 00-6.07-6.93v.586zM10 12a3 3 0 01-3-3v-.172L3.293 5.121A3 3 0 003 7v1a5 5 0 006 4.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07a7.024 7.024 0 002-.36l-1.42-1.42A3.001 3.001 0 0110 12z" clipRule="evenodd" />
                </svg>
              )}
            </button>

            {/* Record Button */}
            {!isRecording ? (
              <button
                onClick={() => setShowRecordingSettings(!showRecordingSettings)}
                disabled={connectionStatus !== "connected"}
              className="p-3 md:p-4 rounded-full bg-pink-600 hover:bg-pink-700 transition disabled:opacity-50 disabled:cursor-not-allowed touch-target"
                title="Record session"
              >
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="p-3 md:p-4 rounded-full bg-red-600 hover:bg-red-700 transition animate-pulse touch-target"
                title="Stop recording"
              >
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                </svg>
              </button>
            )}

            <button
              onClick={handleEndCall}
              className="p-3 md:p-4 md:px-8 rounded-full bg-red-600 hover:bg-red-700 transition flex items-center gap-2 touch-target"
            >
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
              <span className="text-white font-semibold">End Call</span>
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
}

