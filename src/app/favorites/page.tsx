"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PerformerCard from "@/components/PerformerCard";
import VideoChat from "@/components/VideoChat";
import { PerformerService, type Performer } from "@/services/PerformerService";


export default function FavoritesPage() {
  const { user, userProfile, loading, updateWallet, logout } = useAuth();
  const router = useRouter();
  const [activeCall, setActiveCall] = useState<{ id: string; name: string; fee: number } | null>(null);
  const [favoritePerformers, setFavoritePerformers] = useState<Performer[]>([]);
  const [loadingPerformers, setLoadingPerformers] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [user, loading, router]);

  // Load favorite performers
  useEffect(() => {
    const loadFavoritePerformers = async () => {
      if (!user || !userProfile) return;
      
      setLoadingPerformers(true);
      try {
        // Get all performers and filter for favorites
        const allPerformers = await PerformerService.getPerformers({});
        const favorites = allPerformers.filter(p => 
          userProfile.favorites.includes(p.id)
        );
        setFavoritePerformers(favorites);
      } catch (error) {
        console.error('Error loading favorite performers:', error);
      } finally {
        setLoadingPerformers(false);
      }
    };

    loadFavoritePerformers();
  }, [user, userProfile]);

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

  const handleConnect = async (performerId: string) => {
    const performer = favoritePerformers.find(p => p.id === performerId);
    if (performer && performer.isOnline) {
      // Check if user has enough balance
      if (userProfile.wallet.balance < performer.connectionFee) {
        if (confirm(`Insufficient balance. You need $${performer.connectionFee.toFixed(2)} to connect. Add funds?`)) {
          router.push("/earnings");
        }
        return;
      }

      // Confirm connection
      if (confirm(`Connect with ${performer.displayName}? Both of you will pay $${performer.connectionFee.toFixed(2)}`)) {
        // Deduct connection fee
        await updateWallet(performer.connectionFee, 'spend');
        
        setActiveCall({ 
          id: performer.id, 
          name: performer.displayName,
          fee: performer.connectionFee 
        });
      }
    }
  };

  const handleEndCall = () => {
    setActiveCall(null);
  };

  // favoritePerformers is now loaded from the service

  if (activeCall) {
    return <VideoChat partnerId={activeCall.id} partnerName={activeCall.name} connectionFee={activeCall.fee} onEndCall={handleEndCall} />;
  }

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
                <a href="/favorites" className="text-white hover:text-pink-400 transition font-medium">
                  Favorites
                </a>
                <a href="/history" className="text-gray-300 hover:text-pink-400 transition">
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
      <main className="container mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold text-white mb-8">My Favorites ❤️</h2>

        {loadingPerformers ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-black/40 backdrop-blur-sm rounded-xl overflow-hidden border border-pink-500/20 animate-pulse">
                <div className="aspect-[3/4] bg-gray-700"></div>
                <div className="p-4">
                  <div className="h-4 bg-gray-700 rounded mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-2/3 mb-3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : favoritePerformers.length === 0 ? (
          <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-pink-500/20 p-12 text-center">
            <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <h3 className="text-xl font-semibold text-white mb-2">No favorites yet</h3>
            <p className="text-gray-400 mb-6">Start adding performers you like to your favorites</p>
            <a
              href="/"
              className="inline-block bg-gradient-to-r from-pink-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-pink-700 hover:to-purple-700 transition font-semibold"
            >
              Explore Performers
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {favoritePerformers.map((performer) => (
              <PerformerCard
                key={performer.id}
                performer={performer}
                onConnect={handleConnect}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

