// Payment and Wallet Service
import { doc, updateDoc, collection, addDoc, query, where, orderBy, getDocs, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'connection_fee' | 'session_payment' | 'recording_purchase' | 'recording_sale';
  amount: number;
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  completedAt?: Date;
  metadata?: {
    partnerId?: string;
    partnerName?: string;
    sessionId?: string;
    recordingId?: string;
    paymentMethod?: string;
    transactionId?: string;
  };
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'crypto' | 'bank';
  last4?: string;
  brand?: string;
  email?: string;
  isDefault: boolean;
  createdAt: Date;
}

export interface WalletBalance {
  available: number;
  pending: number;
  totalEarned: number;
  totalSpent: number;
  totalWithdrawn: number;
}

export class PaymentService {
  // Add funds to wallet
  static async addFunds(userId: string, amount: number, paymentMethod: string = 'card'): Promise<Transaction> {
    try {
      // In production, integrate with Stripe, PayPal, etc.
      const transaction: Omit<Transaction, 'id'> = {
        userId,
        type: 'deposit',
        amount,
        description: `Added $${amount.toFixed(2)} to wallet`,
        status: 'pending',
        createdAt: new Date(),
        metadata: {
          paymentMethod
        }
      };

      // Add transaction record
      const docRef = await addDoc(collection(db, 'transactions'), transaction);
      
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update transaction status and user wallet
      await runTransaction(db, async (transaction) => {
        const transactionRef = doc(db, 'transactions', docRef.id);
        const userRef = doc(db, 'users', userId);
        
        // Update transaction
        transaction.update(transactionRef, {
          status: 'completed',
          completedAt: new Date()
        });
        
        // Update user wallet
        transaction.update(userRef, {
          'wallet.balance': amount,
          'wallet.totalEarned': amount
        });
      });

      return {
        id: docRef.id,
        ...transaction,
        status: 'completed',
        completedAt: new Date()
      };
    } catch (error) {
      console.error('Error adding funds:', error);
      throw new Error('Failed to add funds. Please try again.');
    }
  }

  // Process connection fee payment
  static async processConnectionFee(
    payerId: string, 
    receiverId: string, 
    amount: number,
    sessionId: string
  ): Promise<{ payerTransaction: Transaction; receiverTransaction: Transaction }> {
    try {
      return await runTransaction(db, async (transaction) => {
        const payerRef = doc(db, 'users', payerId);
        const receiverRef = doc(db, 'users', receiverId);
        
        const payerDoc = await transaction.get(payerRef);
        const receiverDoc = await transaction.get(receiverRef);
        
        if (!payerDoc.exists() || !receiverDoc.exists()) {
          throw new Error('User not found');
        }
        
        const payerWallet = payerDoc.data().wallet;
        const receiverWallet = receiverDoc.data().wallet;
        
        if (payerWallet.balance < amount) {
          throw new Error('Insufficient funds');
        }
        
        // Calculate platform fee (10%)
        const platformFee = amount * 0.1;
        const receiverAmount = amount - platformFee;
        
        // Update payer wallet
        transaction.update(payerRef, {
          'wallet.balance': payerWallet.balance - amount,
          'wallet.totalSpent': payerWallet.totalSpent + amount
        });
        
        // Update receiver wallet
        transaction.update(receiverRef, {
          'wallet.balance': receiverWallet.balance + receiverAmount,
          'wallet.totalEarned': receiverWallet.totalEarned + receiverAmount
        });
        
        // Create transaction records
        const payerTransaction: Omit<Transaction, 'id'> = {
          userId: payerId,
          type: 'connection_fee',
          amount: -amount,
          description: `Connection fee payment`,
          status: 'completed',
          createdAt: new Date(),
          completedAt: new Date(),
          metadata: {
            partnerId: receiverId,
            sessionId
          }
        };
        
        const receiverTransaction: Omit<Transaction, 'id'> = {
          userId: receiverId,
          type: 'session_payment',
          amount: receiverAmount,
          description: `Session payment received`,
          status: 'completed',
          createdAt: new Date(),
          completedAt: new Date(),
          metadata: {
            partnerId: payerId,
            sessionId
          }
        };
        
        const payerTxRef = await addDoc(collection(db, 'transactions'), payerTransaction);
        const receiverTxRef = await addDoc(collection(db, 'transactions'), receiverTransaction);
        
        return {
          payerTransaction: { id: payerTxRef.id, ...payerTransaction },
          receiverTransaction: { id: receiverTxRef.id, ...receiverTransaction }
        };
      });
    } catch (error) {
      console.error('Error processing connection fee:', error);
      throw error;
    }
  }

  // Withdraw funds
  static async withdrawFunds(
    userId: string, 
    amount: number, 
    paymentMethod: PaymentMethod
  ): Promise<Transaction> {
    try {
      return await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', userId);
        const userDoc = await transaction.get(userRef);
        
        if (!userDoc.exists()) {
          throw new Error('User not found');
        }
        
        const wallet = userDoc.data().wallet;
        
        if (wallet.balance < amount) {
          throw new Error('Insufficient funds');
        }
        
        // Minimum withdrawal amount
        if (amount < 10) {
          throw new Error('Minimum withdrawal amount is $10');
        }
        
        // Update user wallet
        transaction.update(userRef, {
          'wallet.balance': wallet.balance - amount,
          'wallet.totalWithdrawn': (wallet.totalWithdrawn || 0) + amount
        });
        
        // Create transaction record
        const withdrawalTransaction: Omit<Transaction, 'id'> = {
          userId,
          type: 'withdrawal',
          amount: -amount,
          description: `Withdrawal to ${paymentMethod.type}`,
          status: 'pending',
          createdAt: new Date(),
          metadata: {
            paymentMethod: paymentMethod.type,
            transactionId: `wd_${Date.now()}`
          }
        };
        
        const docRef = await addDoc(collection(db, 'transactions'), withdrawalTransaction);
        
        // In production, process withdrawal with payment provider
        // For now, simulate processing
        setTimeout(async () => {
          await updateDoc(doc(db, 'transactions', docRef.id), {
            status: 'completed',
            completedAt: new Date()
          });
        }, 5000);
        
        return { id: docRef.id, ...withdrawalTransaction };
      });
    } catch (error) {
      console.error('Error withdrawing funds:', error);
      throw error;
    }
  }

  // Get user transactions
  static async getUserTransactions(userId: string, limit: number = 50): Promise<Transaction[]> {
    try {
      const q = query(
        collection(db, 'transactions'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        // limit(limit) // Uncomment when using real Firestore
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        completedAt: doc.data().completedAt?.toDate(),
      } as Transaction));
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return this.getMockTransactions(userId);
    }
  }

  // Get wallet balance
  static async getWalletBalance(userId: string): Promise<WalletBalance> {
    try {
      const transactions = await this.getUserTransactions(userId);
      
      const balance = transactions.reduce((acc, tx) => {
        if (tx.status === 'completed') {
          acc.available += tx.amount;
          
          if (tx.amount > 0) {
            acc.totalEarned += tx.amount;
          } else {
            acc.totalSpent += Math.abs(tx.amount);
          }
          
          if (tx.type === 'withdrawal') {
            acc.totalWithdrawn += Math.abs(tx.amount);
          }
        } else if (tx.status === 'pending' && tx.amount > 0) {
          acc.pending += tx.amount;
        }
        
        return acc;
      }, {
        available: 0,
        pending: 0,
        totalEarned: 0,
        totalSpent: 0,
        totalWithdrawn: 0
      });
      
      return balance;
    } catch (error) {
      console.error('Error getting wallet balance:', error);
      return {
        available: 50.00,
        pending: 0,
        totalEarned: 50.00,
        totalSpent: 0,
        totalWithdrawn: 0
      };
    }
  }

  // Process recording purchase
  static async purchaseRecording(
    buyerId: string,
    sellerId: string,
    recordingId: string,
    price: number
  ): Promise<{ buyerTransaction: Transaction; sellerTransaction: Transaction }> {
    try {
      return await runTransaction(db, async (transaction) => {
        const buyerRef = doc(db, 'users', buyerId);
        const sellerRef = doc(db, 'users', sellerId);
        
        const buyerDoc = await transaction.get(buyerRef);
        const sellerDoc = await transaction.get(sellerRef);
        
        if (!buyerDoc.exists() || !sellerDoc.exists()) {
          throw new Error('User not found');
        }
        
        const buyerWallet = buyerDoc.data().wallet;
        const sellerWallet = sellerDoc.data().wallet;
        
        if (buyerWallet.balance < price) {
          throw new Error('Insufficient funds');
        }
        
        // Calculate platform fee (20% for recordings)
        const platformFee = price * 0.2;
        const sellerAmount = price - platformFee;
        
        // Update wallets
        transaction.update(buyerRef, {
          'wallet.balance': buyerWallet.balance - price,
          'wallet.totalSpent': buyerWallet.totalSpent + price
        });
        
        transaction.update(sellerRef, {
          'wallet.balance': sellerWallet.balance + sellerAmount,
          'wallet.totalEarned': sellerWallet.totalEarned + sellerAmount
        });
        
        // Create transaction records
        const buyerTransaction: Omit<Transaction, 'id'> = {
          userId: buyerId,
          type: 'recording_purchase',
          amount: -price,
          description: `Recording purchase`,
          status: 'completed',
          createdAt: new Date(),
          completedAt: new Date(),
          metadata: {
            partnerId: sellerId,
            recordingId
          }
        };
        
        const sellerTransaction: Omit<Transaction, 'id'> = {
          userId: sellerId,
          type: 'recording_sale',
          amount: sellerAmount,
          description: `Recording sale`,
          status: 'completed',
          createdAt: new Date(),
          completedAt: new Date(),
          metadata: {
            partnerId: buyerId,
            recordingId
          }
        };
        
        const buyerTxRef = await addDoc(collection(db, 'transactions'), buyerTransaction);
        const sellerTxRef = await addDoc(collection(db, 'transactions'), sellerTransaction);
        
        return {
          buyerTransaction: { id: buyerTxRef.id, ...buyerTransaction },
          sellerTransaction: { id: sellerTxRef.id, ...sellerTransaction }
        };
      });
    } catch (error) {
      console.error('Error processing recording purchase:', error);
      throw error;
    }
  }

  // Mock transactions for development
  private static getMockTransactions(userId: string): Transaction[] {
    return [
      {
        id: '1',
        userId,
        type: 'deposit',
        amount: 50.00,
        description: 'Welcome bonus',
        status: 'completed',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        metadata: { paymentMethod: 'bonus' }
      },
      {
        id: '2',
        userId,
        type: 'connection_fee',
        amount: -2.99,
        description: 'Connection fee payment',
        status: 'completed',
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
        metadata: { partnerId: '1', partnerName: 'Nikki Divine' }
      }
    ];
  }

  // Format currency
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  // Get transaction icon
  static getTransactionIcon(type: Transaction['type']): string {
    switch (type) {
      case 'deposit': return '💰';
      case 'withdrawal': return '🏦';
      case 'connection_fee': return '📞';
      case 'session_payment': return '💎';
      case 'recording_purchase': return '🎬';
      case 'recording_sale': return '💸';
      default: return '💳';
    }
  }
}
