"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { RecordedSession } from "@/contexts/AuthContext";

export default function RecordingsPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const [selectedRecording, setSelectedRecording] = useState<RecordedSession | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [user, loading, router]);

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
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
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
                <a href="/history" className="text-gray-300 hover:text-pink-400 transition">
                  History
                </a>
                <a href="/recordings" className="text-white hover:text-pink-400 transition font-medium">
                  My Recordings
                </a>
                <a href="/earnings" className="text-gray-300 hover:text-pink-400 transition">
                  Earnings
                </a>
              </nav>
            </div>
            <a href="/profile" className="text-white hover:text-pink-400 transition">
              Profile
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-white">My Recordings 🎥</h2>
          <div className="bg-black/40 backdrop-blur-sm border border-pink-500/20 rounded-lg px-4 py-2">
            <span className="text-gray-400 text-sm">Total Earnings: </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 font-bold text-lg">
              ${userProfile.recordings.reduce((acc, rec) => acc + rec.earnings, 0).toFixed(2)}
            </span>
          </div>
        </div>

        {userProfile.recordings.length === 0 ? (
          <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-pink-500/20 p-12 text-center">
            <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <h3 className="text-xl font-semibold text-white mb-2">No recordings yet</h3>
            <p className="text-gray-400 mb-6">Record your sessions to earn money together!</p>
            <a
              href="/"
              className="inline-block bg-gradient-to-r from-pink-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-pink-700 hover:to-purple-700 transition font-semibold"
            >
              Start Connecting
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userProfile.recordings.map((recording) => (
              <div
                key={recording.id}
                className="bg-black/40 backdrop-blur-sm rounded-xl border border-pink-500/20 overflow-hidden hover:border-pink-500/50 transition group cursor-pointer"
                onClick={() => setSelectedRecording(recording)}
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-gradient-to-br from-pink-900/30 to-purple-900/30 flex items-center justify-center">
                  {recording.thumbnail ? (
                    <img
                      src={recording.thumbnail}
                      alt={recording.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg className="w-16 h-16 text-pink-500/30" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  )}
                  
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                    {formatDuration(recording.duration)}
                  </div>

                  {recording.isPublic && (
                    <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded font-semibold">
                      PUBLIC
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="text-white font-semibold mb-1 truncate">{recording.title}</h3>
                  <p className="text-gray-400 text-sm mb-3">with {recording.partnerUsername}</p>

                  <div className="flex items-center justify-between text-sm mb-2">
                    <div className="flex items-center gap-1 text-gray-400">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                      <span>{recording.views} views</span>
                    </div>
                    <div className="text-pink-400 font-semibold">
                      ${recording.price}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm pt-2 border-t border-pink-500/20">
                    <span className="text-gray-400">{formatDate(recording.timestamp)}</span>
                    <div className="text-green-400 font-semibold">
                      +${recording.earnings.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recording Modal (simplified preview) */}
        {selectedRecording && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedRecording(null)}
          >
            <div
              className="bg-black/90 border border-pink-500/30 rounded-2xl max-w-4xl w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative aspect-video bg-gradient-to-br from-pink-900/30 to-purple-900/30 flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-24 h-24 text-pink-500/50 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  <p className="text-gray-400">Video player would appear here</p>
                </div>
                
                <button
                  onClick={() => setSelectedRecording(null)}
                  className="absolute top-4 right-4 w-10 h-10 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition"
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6">
                <h2 className="text-2xl font-bold text-white mb-2">{selectedRecording.title}</h2>
                <p className="text-gray-400 mb-4">with {selectedRecording.partnerUsername}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-pink-500/10 rounded-lg p-3">
                    <div className="text-pink-400 text-sm mb-1">Views</div>
                    <div className="text-white font-semibold">{selectedRecording.views}</div>
                  </div>
                  <div className="bg-purple-500/10 rounded-lg p-3">
                    <div className="text-purple-400 text-sm mb-1">Price</div>
                    <div className="text-white font-semibold">${selectedRecording.price}</div>
                  </div>
                  <div className="bg-green-500/10 rounded-lg p-3">
                    <div className="text-green-400 text-sm mb-1">Earned</div>
                    <div className="text-white font-semibold">${selectedRecording.earnings.toFixed(2)}</div>
                  </div>
                  <div className="bg-blue-500/10 rounded-lg p-3">
                    <div className="text-blue-400 text-sm mb-1">Duration</div>
                    <div className="text-white font-semibold">{formatDuration(selectedRecording.duration)}</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 text-white py-3 rounded-lg hover:from-pink-700 hover:to-purple-700 transition font-semibold">
                    Share Link
                  </button>
                  <button className="flex-1 bg-gray-700 text-white py-3 rounded-lg hover:bg-gray-600 transition font-semibold">
                    {selectedRecording.isPublic ? 'Make Private' : 'Make Public'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

