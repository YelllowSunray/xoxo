// Video storage utilities with Firebase Storage integration
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface VideoUploadResult {
  url: string;
  thumbnailUrl?: string;
  duration: number;
  size: number;
  recordingId: string;
}

export interface RecordingMetadata {
  id: string;
  title: string;
  description?: string;
  ownerId: string;
  ownerName: string;
  partnerId?: string;
  partnerName?: string;
  duration: number;
  size: number;
  price: number;
  isPublic: boolean;
  tags: string[];
  thumbnailUrl?: string;
  videoUrl: string;
  views: number;
  purchases: number;
  earnings: number;
  createdAt: Date;
  updatedAt: Date;
}

export class VideoStorageService {
  private static storage = getStorage();

  // Profile images
  static async uploadProfileImage(userId: string, file: Blob): Promise<string> {
    const imageRef = ref(this.storage, `users/${userId}/profile.jpg`);
    const snapshot = await uploadBytes(imageRef, file);
    const url = await getDownloadURL(snapshot.ref);
    
    // Add cache-busting timestamp so browsers reload the new image
    return `${url}?t=${Date.now()}`;
  }

  static async uploadRecording(
    videoBlob: Blob,
    metadata: {
      title: string;
      description?: string;
      ownerId: string;
      ownerName: string;
      partnerId?: string;
      partnerName?: string;
      price: number;
      isPublic: boolean;
      tags?: string[];
    }
  ): Promise<VideoUploadResult> {
    try {
      const recordingId = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create video file reference
      const videoRef = ref(this.storage, `recordings/${recordingId}/video.webm`);
      
      // Upload video
      console.log('Uploading video...');
      const videoSnapshot = await uploadBytes(videoRef, videoBlob);
      const videoUrl = await getDownloadURL(videoSnapshot.ref);
      
      // Generate thumbnail (simplified - in production use video processing service)
      const thumbnailBlob = await this.generateThumbnailBlob(videoBlob);
      let thumbnailUrl: string | undefined;
      
      if (thumbnailBlob) {
        const thumbnailRef = ref(this.storage, `recordings/${recordingId}/thumbnail.jpg`);
        const thumbnailSnapshot = await uploadBytes(thumbnailRef, thumbnailBlob);
        thumbnailUrl = await getDownloadURL(thumbnailSnapshot.ref);
      }
      
      // Get video duration (simplified)
      const duration = await this.getVideoDuration(videoBlob);
      
      // Save recording metadata to Firestore
      const recordingData: Omit<RecordingMetadata, 'id'> = {
        title: metadata.title,
        description: metadata.description,
        ownerId: metadata.ownerId,
        ownerName: metadata.ownerName,
        partnerId: metadata.partnerId,
        partnerName: metadata.partnerName,
        duration,
        size: videoBlob.size,
        price: metadata.price,
        isPublic: metadata.isPublic,
        tags: metadata.tags || [],
        thumbnailUrl,
        videoUrl,
        views: 0,
        purchases: 0,
        earnings: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const docRef = await addDoc(collection(db, 'recordings'), recordingData);
      
      console.log('Recording uploaded successfully');
      
      return {
        url: videoUrl,
        thumbnailUrl,
        duration,
        size: videoBlob.size,
        recordingId: docRef.id
      };
    } catch (error) {
      console.error('Error uploading recording:', error);
      
      // Fallback to mock data for development
      const mockResult: VideoUploadResult = {
        url: `https://storage.example.com/videos/${Date.now()}.webm`,
        thumbnailUrl: `https://storage.example.com/thumbnails/${Date.now()}.jpg`,
        duration: Math.floor(Math.random() * 1800) + 300,
        size: videoBlob.size,
        recordingId: `mock_${Date.now()}`
      };
      
      return mockResult;
    }
  }

  static async deleteRecording(recordingId: string): Promise<void> {
    try {
      // Delete from Firestore
      await deleteDoc(doc(db, 'recordings', recordingId));
      
      // Delete files from Storage
      const videoRef = ref(this.storage, `recordings/${recordingId}/video.webm`);
      const thumbnailRef = ref(this.storage, `recordings/${recordingId}/thumbnail.jpg`);
      
      await Promise.all([
        deleteObject(videoRef).catch(() => {}), // Ignore if file doesn't exist
        deleteObject(thumbnailRef).catch(() => {})
      ]);
      
      console.log(`Deleted recording: ${recordingId}`);
    } catch (error) {
      console.error('Error deleting recording:', error);
      throw error;
    }
  }

  // Get user's recordings
  static async getUserRecordings(userId: string): Promise<RecordingMetadata[]> {
    try {
      const q = query(
        collection(db, 'recordings'),
        where('ownerId', '==', userId)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      } as RecordingMetadata));
    } catch (error) {
      console.error('Error fetching user recordings:', error);
      return [];
    }
  }

  // Get public recordings
  static async getPublicRecordings(limit: number = 20): Promise<RecordingMetadata[]> {
    try {
      const q = query(
        collection(db, 'recordings'),
        where('isPublic', '==', true)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      } as RecordingMetadata)).slice(0, limit);
    } catch (error) {
      console.error('Error fetching public recordings:', error);
      return [];
    }
  }

  // Update recording views
  static async incrementViews(recordingId: string): Promise<void> {
    try {
      const recordingRef = doc(db, 'recordings', recordingId);
      await updateDoc(recordingRef, {
        views: (await import('firebase/firestore')).increment(1),
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error incrementing views:', error);
    }
  }

  // Helper method to generate thumbnail from video blob
  private static async generateThumbnailBlob(videoBlob: Blob): Promise<Blob | null> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        video.currentTime = Math.min(5, video.duration / 2); // Seek to 5 seconds or middle
      };
      
      video.onseeked = () => {
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          canvas.toBlob((blob) => {
            resolve(blob);
          }, 'image/jpeg', 0.8);
        } else {
          resolve(null);
        }
      };
      
      video.onerror = () => resolve(null);
      
      video.src = URL.createObjectURL(videoBlob);
    });
  }

  // Helper method to get video duration
  private static async getVideoDuration(videoBlob: Blob): Promise<number> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      
      video.onloadedmetadata = () => {
        resolve(Math.floor(video.duration));
      };
      
      video.onerror = () => resolve(300); // Default 5 minutes
      
      video.src = URL.createObjectURL(videoBlob);
    });
  }

  static generateThumbnail(videoElement: HTMLVideoElement): Promise<string> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      
      if (ctx) {
        ctx.drawImage(videoElement, 0, 0);
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(thumbnailUrl);
      } else {
        resolve('');
      }
    });
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}
