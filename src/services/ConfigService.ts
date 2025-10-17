// ConfigService: centralized app configuration loaded from Firestore
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export interface AppConfig {
  signupBonus: number;
  defaultConnectionFee: number;
  interests: string[];
  categories: string[];
}

const DEFAULT_CONFIG: AppConfig = {
  signupBonus: 50,
  defaultConnectionFee: 2.99,
  interests: ["Female", "Male", "Non-binary", "Everyone"],
  categories: [
    "Interactive", "Roleplay", "JOI", "Dominant", "Submissive",
    "Fetish", "BDSM", "GFE", "Romantic", "Playful",
    "Sensual", "Energetic", "Intimate", "Experienced", "New",
    "Fit", "Muscle"
  ],
};

export class ConfigService {
  static async getConfig(): Promise<AppConfig> {
    try {
      const ref = doc(db, 'config', 'app');
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        return {
          signupBonus: typeof data.signupBonus === 'number' ? data.signupBonus : DEFAULT_CONFIG.signupBonus,
          defaultConnectionFee: typeof data.defaultConnectionFee === 'number' ? data.defaultConnectionFee : DEFAULT_CONFIG.defaultConnectionFee,
          interests: Array.isArray(data.interests) ? data.interests : DEFAULT_CONFIG.interests,
          categories: Array.isArray(data.categories) ? data.categories : DEFAULT_CONFIG.categories,
        };
      }
    } catch (e) {
      console.warn('ConfigService: using defaults due to error:', e);
    }
    return DEFAULT_CONFIG;
  }
}
