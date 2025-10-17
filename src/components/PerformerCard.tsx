"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PerformerService, type Performer } from "@/services/PerformerService";

interface PerformerCardProps {
  performer: Performer;
  onConnect: (performerId: string) => void;
}

export default function PerformerCard({ performer, onConnect }: PerformerCardProps) {
  const { user, userProfile, addFavorite, removeFavorite } = useAuth();
  const [isToggling, setIsToggling] = useState(false);
  const isFavorite = userProfile?.favorites.includes(performer.id) || false;

  // Debug logging
  React.useEffect(() => {
    console.log('PerformerCard debug:', {
      performerId: performer.id,
      performerName: performer.displayName,
      userProfile: userProfile ? 'loaded' : 'not loaded',
      favorites: userProfile?.favorites || [],
      isFavorite
    });
  }, [performer.id, userProfile, isFavorite]);

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Check authentication status
    if (!user) {
      console.error('❌ No user logged in');
      alert('Please log in to add favorites');
      return;
    }
    
    if (!userProfile) {
      console.error('❌ User profile not loaded');
      alert('User profile is loading, please try again');
      return;
    }
    
    if (isToggling) return;
    
    console.log('❤️ Heart clicked for:', performer.displayName, 'Current favorite status:', isFavorite);
    console.log('🔍 Auth check:', {
      userId: user.uid,
      userEmail: user.email,
      userProfileLoaded: !!userProfile,
      favoritesArray: userProfile.favorites
    });
    
    setIsToggling(true);
    let operationSuccess = false;
    
    try {
      if (isFavorite) {
        console.log('🔄 Removing from favorites...');
        await PerformerService.removeFromFavorites(user.uid, performer.id);
        await removeFavorite(performer.id);
        console.log('✅ Removed from favorites');
        operationSuccess = true;
      } else {
        console.log('🔄 Adding to favorites...');
        await PerformerService.addToFavorites(user.uid, performer.id);
        await addFavorite(performer.id);
        console.log('✅ Added to favorites');
        operationSuccess = true;
      }
    } catch (error) {
      console.error('❌ Error toggling favorite:', error);
      
      // Only show error message if the operation actually failed
      // and it's not a temporary network issue
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        
        // Don't show alert for permission errors if user is actually logged in
        // (this might be a false positive)
        if (errorMessage.includes('permission') || errorMessage.includes('credential')) {
          // Check if user is actually authenticated
          if (user && userProfile) {
            console.warn('⚠️ Permission error but user appears authenticated - might be temporary');
            // Don't show alert, just log the warning
          } else {
            alert('Please make sure you are logged in and try again.');
          }
        } else if (errorMessage.includes('network') || errorMessage.includes('offline')) {
          alert('Network error. Please check your connection and try again.');
        } else if (errorMessage.includes('failed') || errorMessage.includes('error')) {
          alert('Failed to update favorites. Please try again.');
        }
        // For other errors, don't show alert - might be temporary
      }
    } finally {
      setIsToggling(false);
      
      // If operation succeeded, show success feedback
      if (operationSuccess) {
        console.log('🎉 Favorite operation completed successfully');
      }
    }
  };

  const getLastSeenText = () => {
    if (performer.isOnline) return "Online now";
    if (!performer.lastSeen) return "Recently";

    const now = new Date();
    const lastSeenDate = new Date(performer.lastSeen as unknown as string);
    if (isNaN(lastSeenDate.getTime())) return "Recently";

    const diffMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / (1000 * 60));
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return `${Math.floor(diffMinutes / 1440)}d ago`;
  };

  return (
    <div className="bg-black/40 backdrop-blur-sm rounded-xl overflow-hidden border border-pink-500/20 hover:border-pink-500/50 transition group">
      {/* Thumbnail */}
      <div className="relative aspect-[3/4] bg-gradient-to-br from-pink-900/30 to-purple-900/30">
        {performer.profilePicture ? (
          <img
            src={performer.profilePicture}
            alt={performer.displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold">
              {performer.displayName[0].toUpperCase()}
            </div>
          </div>
        )}
        
        {/* Stats overlay */}
        <div className="absolute bottom-3 left-3 right-3 bg-black/70 backdrop-blur-sm rounded-lg p-2 opacity-0 group-hover:opacity-100 transition">
          <div className="flex justify-between text-xs text-white">
            <span>{performer.stats?.totalSessions ?? 0} sessions</span>
            <span>{Math.floor(((performer.stats?.totalMinutes ?? 0) / 60))}h total</span>
          </div>
        </div>
        
        {/* Online Status */}
        {performer.isOnline && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold z-20">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
            LIVE
          </div>
        )}

        {/* Favorite Button - Mobile Optimized */}
        <button
          onClick={handleFavoriteToggle}
          disabled={isToggling}
          className="absolute top-2 right-2 w-12 h-12 md:w-10 md:h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 active:bg-black/90 transition-all duration-200 disabled:opacity-50 z-30 touch-target"
          title={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          {isToggling ? (
            <div className="w-5 h-5 md:w-4 md:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : isFavorite ? (
            <svg className="w-6 h-6 md:w-5 md:h-5 text-pink-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-6 h-6 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          )}
        </button>

        {/* Hover overlay - Hidden on mobile to prevent interference */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-end pb-6 px-4 hidden md:flex">
          <div className="bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 mb-3 w-full text-center">
            <p className="text-xs text-gray-300 mb-1">Both pay to connect</p>
            <p className="text-pink-400 font-bold text-lg">${performer.connectionFee.toFixed(2)} each</p>
          </div>
          <button
            onClick={() => onConnect(performer.id)}
            disabled={!performer.isOnline}
            className="bg-gradient-to-r from-pink-600 to-purple-600 text-white px-8 py-3 rounded-full font-semibold hover:from-pink-700 hover:to-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg w-full"
          >
            {performer.isOnline ? "Connect Now" : "Offline"}
          </button>
        </div>

        {/* Mobile Connect Button - Always visible on mobile */}
        <div className="absolute bottom-3 left-3 right-3 md:hidden">
          <button
            onClick={() => onConnect(performer.id)}
            disabled={!performer.isOnline}
            className="bg-gradient-to-r from-pink-600 to-purple-600 text-white px-4 py-2 rounded-full font-semibold hover:from-pink-700 hover:to-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg w-full text-sm"
          >
            {performer.isOnline ? "Connect Now" : "Offline"}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="text-white font-semibold text-lg">{performer.displayName}</h3>
            <p className="text-gray-400 text-sm">
              {performer.age} • {performer.gender}
              {performer.location && ` • ${performer.location.city || performer.location.country}`}
            </p>
            <p className="text-gray-500 text-xs mt-1">{getLastSeenText()}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 mb-1">
              <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-white text-sm font-medium">{(typeof performer.rating === 'number' ? performer.rating : 0).toFixed(1)}</span>
            </div>
            <p className="text-gray-400 text-xs">({typeof performer.totalRatings === 'number' ? performer.totalRatings : 0} reviews)</p>
          </div>
        </div>

        {/* Bio preview */}
        {performer.bio && (
          <p className="text-gray-300 text-sm mb-3 line-clamp-2">
            {performer.bio.length > 80 ? `${performer.bio.substring(0, 80)}...` : performer.bio}
          </p>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-2">
          {(performer.tags || []).slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="bg-pink-500/20 text-pink-300 text-xs px-2 py-1 rounded-full"
            >
              {tag}
            </span>
          ))}
          {((performer.tags || []).length > 3) && (
            <span className="text-gray-400 text-xs px-2 py-1">
              +{(performer.tags || []).length - 3} more
            </span>
          )}
        </div>

        {/* Quick stats */}
        <div className="flex justify-between text-xs text-gray-400 pt-2 border-t border-gray-700">
          <span>💖 {performer.stats?.favoriteCount ?? 0} favorites</span>
          <span className="text-pink-400 font-semibold">${performer.connectionFee.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

