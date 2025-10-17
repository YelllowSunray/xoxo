// Performer Discovery and Matching Service
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Performer {
  id: string;
  username: string;
  displayName: string;
  age: number;
  gender: string;
  isOnline: boolean;
  lastSeen?: Date;
  rating?: number;
  totalRatings?: number;
  tags: string[];
  connectionFee: number;
  profilePicture?: string;
  bio?: string;
  preferences?: {
    categories: string[];
    minAge?: number;
    maxAge?: number;
    genderPreference?: string[];
  };
  stats: {
    totalSessions?: number;
    totalMinutes?: number;
    totalEarnings?: number;
    favoriteCount?: number;
  };
  availability: {
    isAvailable: boolean;
    busyUntil?: Date;
    timezone?: string;
  };
  location?: {
    country: string;
    city?: string;
  };
}

export interface MatchFilters {
  gender?: string;
  minAge?: number;
  maxAge?: number;
  maxConnectionFee?: number;
  tags?: string[];
  onlineOnly?: boolean;
  minRating?: number;
  location?: string;
  searchQuery?: string;
}

export class PerformerService {
  private static performersCache = new Map<string, Performer>();
  private static onlineStatusListeners = new Map<string, () => void>();

  // Normalize Firestore doc into a strongly-typed Performer
  private static mapDocToPerformer(docSnap: any): Performer {
    const data = docSnap.data ? docSnap.data() : docSnap;

    const lastSeen = data?.lastSeen?.toDate ? data.lastSeen.toDate() : data?.lastSeen;
    const busyUntil = data?.availability?.busyUntil?.toDate
      ? data.availability.busyUntil.toDate()
      : data?.availability?.busyUntil;

    return {
      id: docSnap.id ?? data.id,
      username: data?.username ?? "",
      displayName: data?.displayName ?? "",
      age: data?.age ?? 18,
      gender: data?.gender ?? "Other",
      isOnline: !!data?.isOnline,
      lastSeen: lastSeen,
      rating: data?.rating ?? 0,
      totalRatings: data?.totalRatings ?? 0,
      tags: Array.isArray(data?.tags) ? data.tags : [],
      connectionFee: data?.connectionFee ?? 2.99,
      profilePicture: data?.profilePicture ?? undefined,
      bio: data?.bio ?? undefined,
      preferences: data?.preferences
        ? {
            categories: Array.isArray(data.preferences.categories)
              ? data.preferences.categories
              : [],
            minAge: data.preferences.minAge,
            maxAge: data.preferences.maxAge,
            genderPreference: data.preferences.genderPreference,
          }
        : undefined,
      stats: {
        totalSessions: data?.stats?.totalSessions ?? 0,
        totalMinutes: data?.stats?.totalMinutes ?? 0,
        totalEarnings: data?.stats?.totalEarnings ?? 0,
        favoriteCount: data?.stats?.favoriteCount ?? 0,
      },
      availability: {
        isAvailable: data?.availability?.isAvailable ?? !!data?.isOnline,
        busyUntil: busyUntil,
        timezone: data?.availability?.timezone ?? "UTC",
      },
      location: data?.location
        ? {
            country: data.location.country ?? "",
            city: data.location.city,
          }
        : undefined,
    };
  }

  // Get all performers with filters
  static async getPerformers(filters: MatchFilters = {}): Promise<Performer[]> {
    try {
      let performersQuery = query(collection(db, 'performers'));

      // Apply filters
      if (filters.gender && filters.gender !== 'all') {
        performersQuery = query(performersQuery, where('gender', '==', filters.gender));
      }

      if (filters.onlineOnly) {
        performersQuery = query(performersQuery, where('isOnline', '==', true));
      }

      if (filters.minRating) {
        performersQuery = query(performersQuery, where('rating', '>=', filters.minRating));
      }

      if (filters.maxConnectionFee) {
        performersQuery = query(performersQuery, where('connectionFee', '<=', filters.maxConnectionFee));
      }

      // Order by online status first, then lastSeen desc
      performersQuery = query(performersQuery, orderBy('isOnline', 'desc'), orderBy('lastSeen', 'desc'));

      const snapshot = await getDocs(performersQuery);
      let performers: Performer[] = snapshot.docs.map((doc) => this.mapDocToPerformer(doc));

      // Derive online if lastSeen within 2 minutes
      const now = Date.now();
      performers = performers.map(p => ({
        ...p,
        isOnline: p.isOnline || (!!p.lastSeen && (now - new Date(p.lastSeen as any).getTime()) < 120000),
      }));

      // Apply client-side filters
      performers = this.applyClientFilters(performers, filters);

      // Cache results
      performers.forEach(performer => {
        this.performersCache.set(performer.id, performer);
      });

      return performers;
    } catch (error) {
      console.error('Error fetching performers:', error);
      return this.getMockPerformers(filters);
    }
  }

  // Get a specific performer
  static async getPerformer(performerId: string): Promise<Performer | null> {
    try {
      // Check cache first
      if (this.performersCache.has(performerId)) {
        return this.performersCache.get(performerId)!;
      }

      const docRef = doc(db, 'performers', performerId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const performer = this.mapDocToPerformer(docSnap);
        this.performersCache.set(performerId, performer);
        return performer;
      }

      return null;
    } catch (error) {
      console.error('Error fetching performer:', error);
      return null;
    }
  }

  // Subscribe to real-time online status updates
  static subscribeToOnlineStatus(callback: (performers: Performer[]) => void): () => void {
    try {
      const q = query(
        collection(db, 'performers'),
        where('isOnline', '==', true),
        orderBy('lastSeen', 'desc')
      );

      return onSnapshot(q, (snapshot) => {
        const onlinePerformers: Performer[] = snapshot.docs.map((doc) => this.mapDocToPerformer(doc));
        callback(onlinePerformers);
      });
    } catch (error) {
      console.error('Error subscribing to online status:', error);
      // Return mock data for development
      setTimeout(() => callback(this.getMockPerformers({ onlineOnly: true })), 1000);
      return () => {};
    }
  }

  // Add performer to favorites
  static async addToFavorites(userId: string, performerId: string): Promise<void> {
    try {
      console.log('🔄 PerformerService: Adding to favorites', { userId, performerId });
      
      const userRef = doc(db, 'users', userId);
      console.log('📝 Updating user document:', userRef.path);
      
      await updateDoc(userRef, {
        favorites: arrayUnion(performerId)
      });
      console.log('✅ User favorites updated');

      // Update performer's favorite count
      const performerRef = doc(db, 'performers', performerId);
      console.log('📝 Updating performer document:', performerRef.path);
      
      await updateDoc(performerRef, {
        'stats.favoriteCount': increment(1)
      });
      console.log('✅ Performer favorite count updated');
      
    } catch (error) {
      console.error('❌ PerformerService: Error adding to favorites:', error);
      
      // Log more details about the error for debugging
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack?.substring(0, 200) + '...'
        });
      }
      
      throw error;
    }
  }

  // Remove performer from favorites
  static async removeFromFavorites(userId: string, performerId: string): Promise<void> {
    try {
      console.log('🔄 PerformerService: Removing from favorites', { userId, performerId });
      
      const userRef = doc(db, 'users', userId);
      console.log('📝 Updating user document:', userRef.path);
      
      await updateDoc(userRef, {
        favorites: arrayRemove(performerId)
      });
      console.log('✅ User favorites updated');

      // Update performer's favorite count
      const performerRef = doc(db, 'performers', performerId);
      console.log('📝 Updating performer document:', performerRef.path);
      
      await updateDoc(performerRef, {
        'stats.favoriteCount': increment(-1)
      });
      console.log('✅ Performer favorite count updated');
      
    } catch (error) {
      console.error('❌ PerformerService: Error removing from favorites:', error);
      throw error;
    }
  }

  // Get recommended performers based on user preferences
  static async getRecommendedPerformers(userId: string, limit: number = 10): Promise<Performer[]> {
    try {
      // Get user preferences
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) return [];

      const userPrefs = userDoc.data().preferences;
      const favorites = userDoc.data().favorites || [];

      // Get performers matching user preferences
      let performers = await this.getPerformers({
        gender: userPrefs.interestedIn?.[0],
        onlineOnly: true,
        minRating: 4.0,
      });

      // Score performers based on compatibility
      performers = performers
        .filter(p => !favorites.includes(p.id)) // Exclude already favorited
        .map(performer => ({
          ...performer,
          compatibilityScore: this.calculateCompatibilityScore(performer, userPrefs)
        }))
        .sort((a, b) => (b as any).compatibilityScore - (a as any).compatibilityScore)
        .slice(0, limit);

      return performers;
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return this.getMockPerformers({ onlineOnly: true }).slice(0, limit);
    }
  }

  // Calculate compatibility score between user and performer
  private static calculateCompatibilityScore(performer: Performer, userPrefs: any): number {
    let score = 0;

    // Base score from rating
    score += (performer.rating ?? 0) * 20;

    // Bonus for matching categories/tags
    const userCategories = userPrefs.categories || [];
    const matchingTags = performer.tags.filter(tag => 
      userCategories.some((cat: string) => cat.toLowerCase().includes(tag.toLowerCase()))
    );
    score += matchingTags.length * 10;

    // Bonus for being online
    if (performer.isOnline) score += 15;

    // Bonus for availability
    if (performer.availability.isAvailable) score += 10;

    // Penalty for high connection fee
    score -= Math.max(0, (performer.connectionFee - 2.99) * 5);

    return Math.max(0, score);
  }

  // Apply client-side filters that can't be done in Firestore
  private static applyClientFilters(performers: Performer[], filters: MatchFilters): Performer[] {
    return performers.filter(performer => {
      // Age filter
      if (filters.minAge && performer.age < filters.minAge) return false;
      if (filters.maxAge && performer.age > filters.maxAge) return false;

      // Tags filter
      if (filters.tags && filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some(tag =>
          performer.tags.some(performerTag =>
            performerTag.toLowerCase().includes(tag.toLowerCase())
          )
        );
        if (!hasMatchingTag) return false;
      }

      // Search query filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesName = performer.displayName.toLowerCase().includes(query);
        const matchesUsername = performer.username.toLowerCase().includes(query);
        const matchesTags = performer.tags.some(tag => tag.toLowerCase().includes(query));
        const matchesBio = performer.bio?.toLowerCase().includes(query);

        if (!matchesName && !matchesUsername && !matchesTags && !matchesBio) {
          return false;
        }
      }

      return true;
    });
  }

  // Mock data for development
  private static getMockPerformers(filters: MatchFilters = {}): Performer[] {
    const mockPerformers: Performer[] = [
      {
        id: "1",
        username: "nikki_divine",
        displayName: "Nikki Divine",
        age: 24,
        gender: "Female",
        isOnline: true,
        lastSeen: new Date(),
        rating: 4.9,
        totalRatings: 156,
        tags: ["Interactive", "Roleplay", "JOI", "Dominant"],
        connectionFee: 2.99,
        bio: "Experienced performer who loves interactive sessions and roleplay. Always ready to make your fantasies come true! 💋",
        preferences: {
          categories: ["Interactive", "Roleplay"],
          minAge: 21,
          genderPreference: ["Male", "Female"]
        },
        stats: {
          totalSessions: 234,
          totalMinutes: 12450,
          totalEarnings: 2340.50,
          favoriteCount: 89
        },
        availability: {
          isAvailable: true,
          timezone: "EST"
        },
        location: {
          country: "US",
          city: "Miami"
        }
      },
      {
        id: "2",
        username: "jade_xxx",
        displayName: "Jade XXX",
        age: 28,
        gender: "Female",
        isOnline: true,
        lastSeen: new Date(Date.now() - 5 * 60 * 1000),
        rating: 4.8,
        totalRatings: 203,
        tags: ["Dominant", "Fetish", "Experienced", "BDSM"],
        connectionFee: 3.99,
        bio: "Dominant mistress with years of experience. I specialize in fetish content and BDSM sessions. Not for beginners! 🔥",
        preferences: {
          categories: ["BDSM", "Fetish"],
          minAge: 25,
          genderPreference: ["Male"]
        },
        stats: {
          totalSessions: 189,
          totalMinutes: 15670,
          totalEarnings: 3456.78,
          favoriteCount: 67
        },
        availability: {
          isAvailable: true,
          timezone: "PST"
        },
        location: {
          country: "US",
          city: "Los Angeles"
        }
      },
      {
        id: "3",
        username: "luna_rose",
        displayName: "Luna Rose",
        age: 22,
        gender: "Female",
        isOnline: false,
        lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000),
        rating: 4.7,
        totalRatings: 89,
        tags: ["Sweet", "Playful", "New", "GFE"],
        connectionFee: 1.99,
        bio: "Sweet and playful girl next door. New to the scene but eager to please! Let's have some fun together 😘",
        preferences: {
          categories: ["GFE", "Vanilla"],
          minAge: 18,
          genderPreference: ["Male"]
        },
        stats: {
          totalSessions: 67,
          totalMinutes: 3420,
          totalEarnings: 567.89,
          favoriteCount: 34
        },
        availability: {
          isAvailable: false,
          busyUntil: new Date(Date.now() + 3 * 60 * 60 * 1000),
          timezone: "EST"
        },
        location: {
          country: "CA",
          city: "Toronto"
        }
      },
      {
        id: "4",
        username: "max_steel",
        displayName: "Max Steel",
        age: 29,
        gender: "Male",
        isOnline: true,
        lastSeen: new Date(),
        rating: 4.6,
        totalRatings: 134,
        tags: ["Fit", "Friendly", "Open-minded", "Muscle"],
        connectionFee: 2.49,
        bio: "Fit and friendly guy who's open to all kinds of fun. Great for couples or solo sessions. Let's get wild! 💪",
        preferences: {
          categories: ["Couples", "Solo"],
          minAge: 18,
          genderPreference: ["Female", "Male", "Couples"]
        },
        stats: {
          totalSessions: 178,
          totalMinutes: 8900,
          totalEarnings: 1789.45,
          favoriteCount: 56
        },
        availability: {
          isAvailable: true,
          timezone: "CST"
        },
        location: {
          country: "US",
          city: "Austin"
        }
      },
      {
        id: "5",
        username: "amber_wild",
        displayName: "Amber Wild",
        age: 26,
        gender: "Female",
        isOnline: true,
        lastSeen: new Date(),
        rating: 4.9,
        totalRatings: 267,
        tags: ["Energetic", "Fun", "JOI", "Interactive"],
        connectionFee: 3.49,
        bio: "High energy performer who loves to have fun! Specializing in JOI and interactive shows. Always up for anything! ⚡",
        preferences: {
          categories: ["JOI", "Interactive"],
          minAge: 21,
          genderPreference: ["Male"]
        },
        stats: {
          totalSessions: 345,
          totalMinutes: 18900,
          totalEarnings: 4567.23,
          favoriteCount: 123
        },
        availability: {
          isAvailable: true,
          timezone: "EST"
        },
        location: {
          country: "US",
          city: "New York"
        }
      },
      {
        id: "6",
        username: "crystal_moon",
        displayName: "Crystal Moon",
        age: 25,
        gender: "Female",
        isOnline: true,
        lastSeen: new Date(),
        rating: 4.8,
        totalRatings: 198,
        tags: ["Sensual", "Intimate", "GFE", "Romantic"],
        connectionFee: 2.99,
        bio: "Sensual and intimate experiences are my specialty. I love creating genuine connections and romantic moments. 🌙",
        preferences: {
          categories: ["GFE", "Romantic"],
          minAge: 23,
          genderPreference: ["Male"]
        },
        stats: {
          totalSessions: 234,
          totalMinutes: 14560,
          totalEarnings: 3245.67,
          favoriteCount: 78
        },
        availability: {
          isAvailable: true,
          timezone: "PST"
        },
        location: {
          country: "US",
          city: "San Francisco"
        }
      }
    ];

    // Apply filters to mock data
    return this.applyClientFilters(mockPerformers, filters);
  }

  // Update performer online status (for performers)
  static async updateOnlineStatus(performerId: string, isOnline: boolean): Promise<void> {
    try {
      const performerRef = doc(db, 'performers', performerId);
      await updateDoc(performerRef, {
        isOnline,
        lastSeen: new Date(),
        'availability.isAvailable': isOnline
      });
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  }

  // Search performers with advanced matching
  static async searchPerformers(searchQuery: string, filters: MatchFilters = {}): Promise<Performer[]> {
    const allFilters = { ...filters, searchQuery };
    return this.getPerformers(allFilters);
  }
}
