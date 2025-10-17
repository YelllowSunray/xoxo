"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  selectIsConnectedToRoom,
  selectLocalPeer,
  selectPeers,
  useHMSActions,
  useHMSStore,
  useVideo,
} from "@100mslive/react-sdk";

interface VideoChat100msProps {
  partnerId: string;
  partnerName: string;
  onEndCall: () => void;
  connectionFee: number;
}

export default function VideoChat100ms({
  partnerId,
  partnerName,
  onEndCall,
  connectionFee,
}: VideoChat100msProps) {
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");

  const startTimeRef = useRef<number>(Date.now());
  const { user, addSessionHistory } = useAuth();

  const hmsActions = useHMSActions();
  const isConnected = useHMSStore(selectIsConnectedToRoom);
  const localPeer = useHMSStore(selectLocalPeer);
  const peers = useHMSStore(selectPeers);

  // Get remote peer (the other person in the 1-on-1 call)
  const remotePeer = peers.find((p) => p.id !== localPeer?.id);

  useEffect(() => {
    const joinRoom = async () => {
      try {
        if (!user?.uid) return;

        // Create deterministic room ID (sorted UIDs)
        const roomId = [user.uid, partnerId].sort().join("_");

        console.log("🎯 Joining 100ms room:", roomId);

        // Fetch auth token from our API
        const response = await fetch("/api/hms-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId,
            userId: user.uid,
            role: "guest", // or 'host' based on your 100ms template
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to get 100ms token");
        }

        const { token } = await response.json();

        // Join the room
        await hmsActions.join({
          authToken: token,
          userName: user.displayName || user.uid,
        });

        console.log("✅ Joined 100ms room");
      } catch (error) {
        console.error("❌ 100ms join error:", error);
        alert("Failed to join video call. Please try again.");
        onEndCall();
      }
    };

    joinRoom();

    // Duration timer
    const durationInterval = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    return () => {
      clearInterval(durationInterval);
      hmsActions.leave();
    };
  }, [partnerId, user?.uid, hmsActions, onEndCall]);

  // Update connection status
  useEffect(() => {
    if (isConnected && remotePeer) {
      setConnectionStatus("connected");
    } else if (isConnected) {
      setConnectionStatus("connecting");
    } else {
      setConnectionStatus("disconnected");
    }
  }, [isConnected, remotePeer]);

  const toggleVideo = async () => {
    await hmsActions.setLocalVideoEnabled(!isVideoEnabled);
    setIsVideoEnabled(!isVideoEnabled);
  };

  const toggleAudio = async () => {
    await hmsActions.setLocalAudioEnabled(!isAudioEnabled);
    setIsAudioEnabled(!isAudioEnabled);
  };

  const handleEndCall = async () => {
    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);

    // Save session to history
    await addSessionHistory({
      partnerId,
      partnerUsername: partnerName,
      duration,
      timestamp: new Date(),
      connectionFee,
      wasRecorded: false,
    });

    await hmsActions.leave();
    onEndCall();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col safe-top safe-bottom">
      {/* Remote Video (Full Screen) */}
      <div className="flex-1 relative bg-gray-900">
        {remotePeer?.videoTrack ? (
          <RemoteVideo peer={remotePeer} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center">
              {connectionStatus === "connecting" ? (
                <>
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-500 mx-auto mb-4"></div>
                  <p className="text-white text-lg">Connecting to {partnerName}...</p>
                </>
              ) : (
                <div className="w-32 h-32 rounded-full bg-pink-600 flex items-center justify-center text-white text-4xl font-bold mb-4 mx-auto">
                  {partnerName[0]?.toUpperCase()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Local Video (Picture-in-Picture) */}
        <div className="absolute top-4 right-4 w-36 h-28 md:w-48 md:h-36 rounded-lg overflow-hidden border-2 border-pink-500 shadow-2xl">
          {localPeer?.videoTrack && isVideoEnabled ? (
            <LocalVideo peer={localPeer} />
          ) : (
            <div className="w-full h-full bg-gray-900 flex items-center justify-center">
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
                <div
                  className={`w-2 h-2 rounded-full ${
                    connectionStatus === "connected" ? "bg-green-500" : "bg-yellow-500"
                  }`}
                ></div>
                <span className="text-gray-300 text-sm capitalize">{connectionStatus}</span>
              </div>
            </div>
            <div className="text-white text-lg font-mono">{formatDuration(callDuration)}</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-black/90 backdrop-blur-lg border-t border-pink-500/20 p-4 md:p-6 safe-bottom">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-3 md:gap-4">
            <button
              onClick={toggleVideo}
              className={`p-3 md:p-4 rounded-full transition touch-target ${
                isVideoEnabled ? "bg-gray-700 hover:bg-gray-600" : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {isVideoEnabled ? (
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A2 2 0 0018 13V7a1 1 0 00-1.447-.894l-2 1A1 1 0 0014 8v.586l-2-2V6a2 2 0 00-2-2H8.586l-2-2H10a4 4 0 014 4v.586l-2-2z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>

            <button
              onClick={toggleAudio}
              className={`p-3 md:p-4 rounded-full transition touch-target ${
                isAudioEnabled ? "bg-gray-700 hover:bg-gray-600" : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {isAudioEnabled ? (
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A7.001 7.001 0 0017 8a1 1 0 10-2 0 5 5 0 01-.642 2.476l-1.31-1.31A3.001 3.001 0 0010 5c-.15 0-.3.012-.447.035L7.707 3.189A5.001 5.001 0 0115 8a1 1 0 102 0 7.001 7.001 0 00-6.07-6.93v.586zM10 12a3 3 0 01-3-3v-.172L3.293 5.121A3 3 0 003 7v1a5 5 0 006 4.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07a7.024 7.024 0 002-.36l-1.42-1.42A3.001 3.001 0 0110 12z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>

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
    </div>
  );
}

// Helper component to render remote video
function RemoteVideo({ peer }: { peer: any }) {
  const { videoRef } = useVideo({
    trackId: peer.videoTrack,
  });

  return <video ref={videoRef} autoPlay playsInline muted={false} className="w-full h-full object-contain" />;
}

// Helper component to render local video
function LocalVideo({ peer }: { peer: any }) {
  const { videoRef } = useVideo({
    trackId: peer.videoTrack,
  });

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="w-full h-full object-cover mirror"
      style={{ transform: "scaleX(-1)" }}
    />
  );
}

