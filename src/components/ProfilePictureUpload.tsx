"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { VideoStorageService } from "@/utils/videoStorage";

interface ProfilePictureUploadProps {
  currentImage?: string;
  onUpload: (imageUrl: string) => void;
  displayName: string;
}

export default function ProfilePictureUpload({ 
  currentImage, 
  onUpload, 
  displayName 
}: ProfilePictureUploadProps) {
  const { user, updateProfile } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Simulate upload (in production, upload to Firebase Storage or similar)
    uploadImage(file);
  };

  const uploadImage = async (file: File) => {
    setIsUploading(true);
    
    try {
      if (!user) throw new Error("Not authenticated");
      console.log("📤 Uploading profile image...");
      
      const downloadUrl = await VideoStorageService.uploadProfileImage(user.uid, file);
      console.log("✅ Upload complete:", downloadUrl);
      
      // Update Firestore profile
      await updateProfile({ profilePicture: downloadUrl });
      console.log("✅ Profile updated in Firestore");
      
      // Call the callback to trigger any parent component updates
      onUpload(downloadUrl);
      
      // Clear the preview
      setPreviewUrl(null);
      console.log("✅ Profile picture update complete!");
      
    } catch (error) {
      console.error('❌ Upload failed:', error);
      alert('Upload failed. Please try again.');
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const openCamera = async () => {
    try {
      console.log("📷 Requesting camera access...");
      
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not available. Please use HTTPS or a supported browser.");
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      
      console.log("✅ Camera access granted", stream);
      console.log("Video tracks:", stream.getVideoTracks());
      
      streamRef.current = stream;
      setIsCameraOpen(true);
      
      // Wait a tiny bit for React to render the video element
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (videoRef.current) {
        console.log("Setting video source...");
        videoRef.current.srcObject = stream;
        
        // Add event listeners for debugging
        videoRef.current.onloadedmetadata = () => {
          console.log("✅ Video metadata loaded");
          console.log("Video dimensions:", videoRef.current?.videoWidth, "x", videoRef.current?.videoHeight);
        };
        
        videoRef.current.onplay = () => {
          console.log("✅ Video playing");
        };
        
        videoRef.current.onerror = (e) => {
          console.error("❌ Video element error:", e);
        };
        
        // Force play (with error handling)
        try {
          await videoRef.current.play();
          console.log("✅ Play() called successfully");
        } catch (playError) {
          console.error("❌ Play error:", playError);
        }
      } else {
        console.error("❌ Video ref is null after opening camera!");
      }
    } catch (err: any) {
      console.error("❌ Unable to access camera:", err);
      console.error("Error name:", err.name);
      console.error("Error message:", err.message);
      
      let errorMessage = "Unable to access camera. ";
      
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        errorMessage += "Please grant camera permission in your browser settings.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        errorMessage += "No camera found on this device.";
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        errorMessage += "Camera is already in use by another application.";
      } else if (err.message?.includes("HTTPS")) {
        errorMessage += "Camera requires HTTPS. Please use file upload instead.";
      } else {
        errorMessage += "Please try file upload instead. Error: " + err.message;
      }
      
      alert(errorMessage);
    }
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const dataUrlToFile = (dataUrl: string, filename: string) => {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const size = Math.min(video.videoWidth || 720, video.videoHeight || 720);
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw centered square crop
    const sx = ((video.videoWidth || size) - size) / 2;
    const sy = ((video.videoHeight || size) - size) / 2;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setPreviewUrl(dataUrl);

    // Turn into a File so we reuse upload flow
    const selfieFile = dataUrlToFile(dataUrl, 'selfie.jpg');
    await uploadImage(selfieFile);
    closeCamera();
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const currentDisplayImage = previewUrl || currentImage;

  return (
    <div className="flex flex-col items-center">
      <div className="relative group">
        <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
          {currentDisplayImage ? (
            <img
              key={currentDisplayImage}
              src={currentDisplayImage}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-white text-4xl font-bold">
              {displayName[0]?.toUpperCase()}
            </span>
          )}
        </div>

        {/* Upload overlay */}
        <div 
          className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
          onClick={triggerFileSelect}
        >
          {isUploading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
              <span className="text-white text-xs">Uploading...</span>
            </div>
          ) : (
            <div className="text-center">
              <svg className="w-8 h-8 text-white mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-white text-xs">Change Photo</span>
            </div>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={triggerFileSelect}
          disabled={isUploading}
          className="text-pink-400 hover:text-pink-300 text-sm font-medium transition disabled:opacity-50"
        >
          {currentDisplayImage ? 'Change Picture' : 'Add Picture'}
        </button>
        <span className="text-gray-500 text-xs">or</span>
        <button
          onClick={openCamera}
          disabled={isUploading}
          className="text-purple-400 hover:text-purple-300 text-sm font-medium transition disabled:opacity-50"
        >
          Take Selfie
        </button>
      </div>

      <p className="text-gray-400 text-xs mt-2 text-center">
        JPG, PNG or GIF. Max 5MB.
      </p>
      {isCameraOpen && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-lg flex items-center justify-center p-4">
          <div className="bg-black/60 border border-pink-500/30 rounded-2xl p-4 w-full max-w-sm">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={closeCamera}
                aria-label="Close selfie camera"
                className="inline-flex items-center gap-2 text-gray-300 hover:text-white transition"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                <span className="text-sm">Back</span>
              </button>
              <span className="text-white text-sm opacity-70">Selfie</span>
              <div className="w-10" />
            </div>
            <div className="relative w-full overflow-hidden rounded-xl aspect-square bg-black/50">
              <video 
                ref={videoRef} 
                className="w-full h-full object-cover" 
                autoPlay 
                playsInline 
                muted
              />
              {/* Debug info */}
              {streamRef.current && (
                <div className="absolute top-2 left-2 bg-green-500/80 text-white text-xs px-2 py-1 rounded">
                  Stream Active ({streamRef.current.getVideoTracks()[0]?.readyState})
                </div>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={closeCamera}
                className="px-4 py-2 text-sm rounded bg-white/10 hover:bg-white/20 text-white"
              >
                Cancel
              </button>
              <button
                onClick={capturePhoto}
                className="px-4 py-2 text-sm rounded bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:from-pink-700 hover:to-purple-700"
              >
                Capture
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
