"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PaymentService, type Transaction, type WalletBalance } from "@/services/PaymentService";

export default function EarningsPage() {
  const { user, userProfile, loading, updateWallet } = useAuth();
  const router = useRouter();
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [user, loading, router]);

  // Load wallet data
  useEffect(() => {
    const loadWalletData = async () => {
      if (!user) return;
      
      setLoadingTransactions(true);
      try {
        const [balance, userTransactions] = await Promise.all([
          PaymentService.getWalletBalance(user.uid),
          PaymentService.getUserTransactions(user.uid)
        ]);
        
        setWalletBalance(balance);
        setTransactions(userTransactions);
      } catch (error) {
        console.error('Error loading wallet data:', error);
      } finally {
        setLoadingTransactions(false);
      }
    };

    loadWalletData();
  }, [user]);

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

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    if (amount < 5) {
      alert("Minimum deposit amount is $5");
      return;
    }

    setIsDepositing(true);
    try {
      await PaymentService.addFunds(user!.uid, amount);
      await updateWallet(amount, 'earn');
      
      // Refresh wallet data
      const [balance, userTransactions] = await Promise.all([
        PaymentService.getWalletBalance(user!.uid),
        PaymentService.getUserTransactions(user!.uid)
      ]);
      setWalletBalance(balance);
      setTransactions(userTransactions);
      
      alert(`Successfully added $${amount.toFixed(2)} to your wallet`);
      setDepositAmount("");
    } catch (error: any) {
      alert(error.message || "Deposit failed. Please try again.");
    } finally {
      setIsDepositing(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    if (amount > (walletBalance?.available || 0)) {
      alert("Insufficient balance");
      return;
    }
    if (amount < 10) {
      alert("Minimum withdrawal amount is $10");
      return;
    }

    setIsWithdrawing(true);
    try {
      const mockPaymentMethod = {
        id: '1',
        type: 'card' as const,
        last4: '4242',
        brand: 'Visa',
        isDefault: true,
        createdAt: new Date()
      };
      
      await PaymentService.withdrawFunds(user!.uid, amount, mockPaymentMethod);
      await updateWallet(amount, 'spend');
      
      // Refresh wallet data
      const [balance, userTransactions] = await Promise.all([
        PaymentService.getWalletBalance(user!.uid),
        PaymentService.getUserTransactions(user!.uid)
      ]);
      setWalletBalance(balance);
      setTransactions(userTransactions);
      
      alert(`Withdrawal of $${amount.toFixed(2)} is being processed`);
      setWithdrawAmount("");
    } catch (error: any) {
      alert(error.message || "Withdrawal failed. Please try again.");
    } finally {
      setIsWithdrawing(false);
    }
  };

  const recordingEarnings = userProfile.recordings.reduce((acc, rec) => acc + rec.earnings, 0);
  const connectionSpending = userProfile.sessionHistory.reduce((acc, session) => acc + session.connectionFee, 0);

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
                <a href="/recordings" className="text-gray-300 hover:text-pink-400 transition">
                  My Recordings
                </a>
                <a href="/earnings" className="text-white hover:text-pink-400 transition font-medium">
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
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <h2 className="text-3xl font-bold text-white mb-8">Earnings & Wallet 💰</h2>

        {/* Wallet Balance Card */}
        <div className="bg-gradient-to-br from-pink-600 to-purple-600 rounded-2xl p-8 mb-8 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-pink-100 text-sm mb-1">Available Balance</p>
              <h3 className="text-5xl font-bold text-white">
                ${userProfile.wallet.balance.toFixed(2)}
              </h3>
            </div>
            <div className="w-20 h-20 bg-black/20 rounded-full flex items-center justify-center border border-white/20">
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
              </svg>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
            <div>
              <p className="text-pink-100 text-sm mb-1">Total Earned</p>
              <p className="text-white text-2xl font-semibold">
                ${userProfile.wallet.totalEarned.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-pink-100 text-sm mb-1">Total Spent</p>
              <p className="text-white text-2xl font-semibold">
                ${userProfile.wallet.totalSpent.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Withdraw */}
          <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-pink-500/20 p-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-pink-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              Withdraw Funds
            </h3>
            <div className="mb-4">
              <label className="block text-pink-300 text-sm mb-2">Amount ($)</label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.00"
                min="10"
                max={userProfile.wallet.balance}
                step="0.01"
                className="w-full px-4 py-3 bg-black/30 border border-pink-500/30 rounded-lg text-white text-lg outline-none focus:ring-2 focus:ring-pink-500"
              />
              <p className="text-gray-400 text-xs mt-1">Minimum withdrawal: $10.00</p>
            </div>
            <button
              onClick={handleWithdraw}
              disabled={isWithdrawing || parseFloat(withdrawAmount) < 10}
              className="w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white py-3 rounded-lg hover:from-pink-700 hover:to-purple-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isWithdrawing ? "Processing..." : "Withdraw to Bank"}
            </button>
          </div>

          {/* Add Funds */}
          <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-pink-500/20 p-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
              Add Funds
            </h3>
            <p className="text-gray-400 mb-4">Purchase credits to connect with others</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button className="bg-black/30 border border-pink-500/30 hover:border-pink-500 text-white py-3 rounded-lg transition">
                <div className="text-lg font-semibold">$25</div>
                <div className="text-xs text-gray-400">+$2 bonus</div>
              </button>
              <button className="bg-black/30 border border-pink-500/30 hover:border-pink-500 text-white py-3 rounded-lg transition">
                <div className="text-lg font-semibold">$50</div>
                <div className="text-xs text-gray-400">+$5 bonus</div>
              </button>
              <button className="bg-black/30 border border-pink-500/30 hover:border-pink-500 text-white py-3 rounded-lg transition">
                <div className="text-lg font-semibold">$100</div>
                <div className="text-xs text-gray-400">+$15 bonus</div>
              </button>
            </div>
            <button className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-semibold">
              Purchase Credits
            </button>
          </div>
        </div>

        {/* Earnings Breakdown */}
        <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-pink-500/20 p-6">
          <h3 className="text-xl font-semibold text-white mb-6">Earnings Breakdown</h3>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 border border-green-500/30 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-green-400 text-sm">Recording Sales</p>
                  <p className="text-white text-2xl font-bold">${recordingEarnings.toFixed(2)}</p>
                </div>
              </div>
              <p className="text-gray-400 text-sm">{userProfile.recordings.length} recordings</p>
            </div>

            <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border border-blue-500/30 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                    <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                  </svg>
                </div>
                <div>
                  <p className="text-blue-400 text-sm">Sessions</p>
                  <p className="text-white text-2xl font-bold">{userProfile.sessionHistory.length}</p>
                </div>
              </div>
              <p className="text-gray-400 text-sm">Total connections made</p>
            </div>

            <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border border-purple-500/30 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-purple-400 text-sm">Connection Spent</p>
                  <p className="text-white text-2xl font-bold">${connectionSpending.toFixed(2)}</p>
                </div>
              </div>
              <p className="text-gray-400 text-sm">Paid to connect</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

