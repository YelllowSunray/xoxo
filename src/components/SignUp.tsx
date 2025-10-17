"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function SignUp() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      return setError("Passwords do not match");
    }

    if (password.length < 6) {
      return setError("Password must be at least 6 characters");
    }

    if (parseInt(age) < 18) {
      return setError("You must be 18 or older");
    }

    if (username.length < 3) {
      return setError("Username must be at least 3 characters");
    }

    try {
      setError("");
      setLoading(true);
      console.log("🔵 Starting signup process...");
      
      await signUp(username, email, password, {
        displayName: displayName || username,
        age: parseInt(age),
        gender,
      });
      
      console.log("✅ Signup complete! Redirecting...");
      
      // Give a tiny bit of time for state to update before redirecting
      await new Promise(resolve => setTimeout(resolve, 500));
      
      router.push("/");
    } catch (err: any) {
      console.error("❌ Signup error:", err);
      if (err.code === "auth/email-already-in-use") {
        setError("Username already taken");
      } else {
        setError(err.message || "Failed to create account");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-pink-800 to-red-900 p-4">
      <div className="bg-black/40 backdrop-blur-lg p-8 rounded-2xl shadow-2xl w-full max-w-md border border-pink-500/20">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 mb-2">
            XOXO
          </h1>
          <p className="text-gray-300 text-sm">Create your account</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-pink-300 mb-1">
              Username *
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 py-2 bg-black/30 border border-pink-500/30 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition text-white placeholder-gray-500"
              placeholder="Choose a username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-pink-300 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 bg-black/30 border border-pink-500/30 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition text-white placeholder-gray-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-pink-300 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-2 bg-black/30 border border-pink-500/30 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition text-white placeholder-gray-500"
              placeholder="How you want to be called"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-pink-300 mb-1">
                Age *
              </label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                required
                min="18"
                className="w-full px-4 py-2 bg-black/30 border border-pink-500/30 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-pink-300 mb-1">
                Gender *
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                required
                className="w-full px-4 py-2 bg-black/30 border border-pink-500/30 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition text-white"
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non-binary">Non-binary</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-pink-300 mb-1">
              Password *
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

          <div>
            <label className="block text-sm font-medium text-pink-300 mb-1">
              Confirm Password *
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-2 bg-black/30 border border-pink-500/30 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition text-white placeholder-gray-500"
              placeholder="••••••••"
            />
          </div>

          <div className="text-xs text-gray-400 bg-black/20 p-3 rounded-lg">
            By signing up, you confirm you are 18+ and agree to our terms. 
            You'll get <span className="text-pink-400 font-semibold">$50 starting credit</span> to connect and earn with others!
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-pink-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          Already have an account?{" "}
          <a href="/signin" className="text-pink-400 hover:text-pink-300 font-medium">
            Sign In
          </a>
        </p>
      </div>
    </div>
  );
}
