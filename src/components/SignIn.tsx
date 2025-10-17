"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function SignIn() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Debug: Log auth state
  console.log("SignIn component - Auth state:", { user: !!user, authLoading });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError("");
      setLoading(true);
      await signIn(username, password);
      router.push("/");
    } catch (err: any) {
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        setError("Invalid username or password");
      } else {
        setError(err.message || "Failed to sign in");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-pink-800 to-red-900 p-4">
      <div className="bg-black/40 backdrop-blur-lg p-8 rounded-2xl shadow-2xl w-full max-w-md border border-pink-500/20">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 mb-2">
            XOXO
          </h1>
          <p className="text-gray-300 text-sm">Welcome back</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-pink-300 mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 py-2 bg-black/30 border border-pink-500/30 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition text-white placeholder-gray-500"
              placeholder="Your username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-pink-300 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 bg-black/30 border border-pink-500/30 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition text-white placeholder-gray-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-pink-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          Don't have an account?{" "}
          <a href="/signup" className="text-pink-400 hover:text-pink-300 font-medium">
            Sign Up
          </a>
        </p>

        {/* Debug info - remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-3 bg-gray-800/50 rounded-lg text-xs text-gray-300">
            <p>Debug Info:</p>
            <p>User: {user ? 'Logged in' : 'Not logged in'}</p>
            <p>Auth Loading: {authLoading ? 'Yes' : 'No'}</p>
            {user && (
              <button
                onClick={() => {
                  // Force logout for debugging
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.reload();
                }}
                className="mt-2 text-red-400 hover:text-red-300 underline"
              >
                Force Logout (Debug)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
