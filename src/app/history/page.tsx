"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PerformerService, type Performer } from "@/services/PerformerService";

export default function HistoryPage() {
  const { user, userProfile, loading, addFavorite, removeFavorite, logout } = useAuth();
  const router = useRouter();
  const [performers, setPerformers] = useState<Map<string, Performer>>(new Map());

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [user, loading, router]);

  // Load performers data for profile pictures
  useEffect(() => {
    const loadPerformers = async () => {
      if (!userProfile?.sessionHistory.length) return;
      
      try {
        const allPerformers = await PerformerService.getPerformers({});
        const performerMap = new Map<string, Performer>();
        
        // Map performers by their ID for quick lookup
        allPerformers.forEach(performer => {
          performerMap.set(performer.id, performer);
        });
        
        setPerformers(performerMap);
      } catch (error) {
        console.error('Error loading performers for history:', error);
      }
    };

    loadPerformers();
  }, [userProfile?.sessionHistory]);

  if (loading || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-pink-800 to-red-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds} sec${seconds !== 1 ? 's' : ''}`;
    }
    
    const mins = Math.floor(seconds / 60);
    const remainingSecs = seconds % 60;
    
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      if (remainingMins === 0) {
        return `${hours} hour${hours !== 1 ? 's' : ''}`;
      }
      return `${hours}h ${remainingMins}m`;
    }
    
    if (remainingSecs === 0) {
      return `${mins} min${mins !== 1 ? 's' : ''}`;
    }
    
    return `${mins}m ${remainingSecs}s`;
  };

  const handleFavoriteToggle = async (partnerId: string, partnerName: string) => {
    if (!user || !userProfile) return;
    
    const isFavorite = userProfile.favorites.includes(partnerId);
    
    try {
      if (isFavorite) {
        await removeFavorite(partnerId);
        console.log(`✅ Removed ${partnerName} from favorites`);
      } else {
        await addFavorite(partnerId);
        console.log(`✅ Added ${partnerName} to favorites`);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      alert('Failed to update favorites. Please try again.');
    }
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-red-900">
      {/* Header */}
      <header className="bg-black/40 backdrop-blur-lg border-b border-pink-500/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <a href="/">
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
                  XOXO
                </h1>
              </a>
              <nav className="hidden md:flex gap-6">
                <a href="/" className="text-gray-300 hover:text-pink-400 transition">
                  Explore
                </a>
                <a href="/favorites" className="text-gray-300 hover:text-pink-400 transition">
                  Favorites
                </a>
                <a href="/history" className="text-white hover:text-pink-400 transition font-medium">
                  History
                </a>
                <a href="/recordings" className="text-gray-300 hover:text-pink-400 transition">
                  Recordings
                </a>
                <a href="/earnings" className="text-gray-300 hover:text-pink-400 transition">
                  Earnings
                </a>
              </nav>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <a
                href="/profile"
                className="flex items-center gap-2 text-white hover:text-pink-400 transition"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-sm font-bold">
                  {userProfile?.displayName[0].toUpperCase() || 'U'}
                </div>
                <span className="hidden md:block">{userProfile?.displayName || 'User'}</span>
              </a>
              
              <button
                onClick={logout}
                className="hidden md:block text-gray-300 hover:text-white transition text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h2 className="text-3xl font-bold text-white mb-8">Session History</h2>

        {userProfile.sessionHistory.length === 0 ? (
          <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-pink-500/20 p-12 text-center">
            <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-xl font-semibold text-white mb-2">No sessions yet</h3>
            <p className="text-gray-400 mb-6">Your session history will appear here</p>
            <a
              href="/"
              className="inline-block bg-gradient-to-r from-pink-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-pink-700 hover:to-purple-700 transition font-semibold"
            >
              Start Exploring
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {[...userProfile.sessionHistory].reverse().map((session, index) => (
              <div
                key={index}
                className="bg-black/40 backdrop-blur-sm rounded-xl border border-pink-500/20 p-6 hover:border-pink-500/50 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Profile Picture */}
                    {(() => {
                      const performer = performers.get(session.partnerId);
                      return performer?.profilePicture ? (
                        <img
                          src={performer.profilePicture}
                          alt={session.partnerUsername}
                          className="w-12 h-12 rounded-full object-cover border-2 border-pink-500/30"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold border-2 border-pink-500/30">
                          {session.partnerUsername[0].toUpperCase()}
                        </div>
                      );
                    })()}
                    
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-lg">
                        {session.partnerUsername}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {formatDate(session.timestamp)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Duration */}
                    <div className="text-right">
                      <div className="text-white font-semibold">
                        {formatDuration(session.duration)}
                      </div>
                      {session.rating && (
                        <div className="flex items-center gap-1 mt-1 justify-end">
                          <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="text-white text-sm">{session.rating}</span>
                        </div>
                      )}
                    </div>

                    {/* Favorite Button */}
                    {(() => {
                      const isFavorite = userProfile?.favorites.includes(session.partnerId) || false;
                      return (
                        <button
                          onClick={() => handleFavoriteToggle(session.partnerId, session.partnerUsername)}
                          className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center hover:bg-black/50 transition border border-pink-500/30"
                          title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                        >
                          {isFavorite ? (
                            <svg className="w-5 h-5 text-pink-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                          )}
                        </button>
                      );
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

