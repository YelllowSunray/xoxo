"use client";

import React from "react";
import { HMSRoomProvider } from "@100mslive/react-sdk";
import VideoChat100ms from "./VideoChat100ms";

interface VideoChat100msWrapperProps {
  partnerId: string;
  partnerName: string;
  onEndCall: () => void;
  connectionFee: number;
}

export default function VideoChat100msWrapper(props: VideoChat100msWrapperProps) {
  return (
    <HMSRoomProvider>
      <VideoChat100ms {...props} />
    </HMSRoomProvider>
  );
}

