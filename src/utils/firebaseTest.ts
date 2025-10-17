// Firebase Connection Test Utility
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { signInAnonymously, fetchSignInMethodsForEmail } from 'firebase/auth';

export interface ConnectionTestResult {
  test: string;
  success: boolean;
  error?: string;
  duration?: number;
}

export class FirebaseConnectionTester {
  private results: ConnectionTestResult[] = [];

  async runAllTests(): Promise<ConnectionTestResult[]> {
    this.results = [];
    
    console.log("🔥 Starting Firebase connection tests...");
    
    await this.testAuthConnection();
    await this.testFirestoreRead();
    await this.testFirestoreWrite();
    await this.testFirestoreCollection();
    
    console.log("✅ Firebase connection tests completed");
    return this.results;
  }

  private async testAuthConnection(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log("Testing Firebase Auth connection...");
      
      // If already signed in, consider auth reachable
      if (auth.currentUser) {
        const duration = Date.now() - startTime;
        this.results.push({ test: "Firebase Auth Connection", success: true, duration });
        console.log(`✅ Auth test passed (existing session) (${duration}ms)`);
        return;
      }

      // Try anonymous sign-in if enabled
      try {
        await signInAnonymously(auth);
        const duration = Date.now() - startTime;
        this.results.push({ test: "Firebase Auth Connection", success: true, duration });
        console.log(`✅ Auth test passed (anonymous) (${duration}ms)`);
        // Do not sign out; keep session for subsequent tests
        return;
      } catch (anonError: any) {
        // If anonymous is disabled, fall back to a lightweight Auth endpoint call
        if (anonError?.code === 'auth/operation-not-allowed' || anonError?.code === 'auth/admin-restricted-operation') {
          try {
            await fetchSignInMethodsForEmail(auth, 'probe@example.com');
            const duration = Date.now() - startTime;
            this.results.push({ test: "Firebase Auth Connection", success: true, duration });
            console.log(`✅ Auth reachable (anonymous disabled) (${duration}ms)`);
            return;
          } catch (probeErr: any) {
            throw probeErr;
          }
        }
        throw anonError;
      }
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      this.results.push({
        test: "Firebase Auth Connection",
        success: false,
        error: error.message,
        duration
      });
      
      console.error(`❌ Auth test failed (${duration}ms):`, error);
    }
  }

  private async testFirestoreRead(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log("Testing Firestore read operation...");
      
      // Try to read a non-existent document (should not throw error)
      const testDocRef = doc(db, "test", "connection-test");
      const docSnap = await getDoc(testDocRef);
      const duration = Date.now() - startTime;
      
      this.results.push({
        test: "Firestore Read Operation",
        success: true,
        duration
      });
      
      console.log(`✅ Firestore read test passed (${duration}ms) - Document exists: ${docSnap.exists()}`);
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      this.results.push({
        test: "Firestore Read Operation",
        success: false,
        error: error.message,
        duration
      });
      
      console.error(`❌ Firestore read test failed (${duration}ms):`, error);
    }
  }

  private async testFirestoreWrite(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log("Testing Firestore write operation...");
      
      // Try to write a test document
      const testDocRef = doc(db, "test", "connection-test");
      await setDoc(testDocRef, {
        timestamp: new Date(),
        test: "connection-test",
        userAgent: navigator.userAgent
      });
      const duration = Date.now() - startTime;
      
      this.results.push({
        test: "Firestore Write Operation",
        success: true,
        duration
      });
      
      console.log(`✅ Firestore write test passed (${duration}ms)`);
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      this.results.push({
        test: "Firestore Write Operation",
        success: false,
        error: error.message,
        duration
      });
      
      console.error(`❌ Firestore write test failed (${duration}ms):`, error);
    }
  }

  private async testFirestoreCollection(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log("Testing Firestore collection query...");
      
      // Try to query a collection (should work even if empty)
      const testCollectionRef = collection(db, "test");
      const querySnapshot = await getDocs(testCollectionRef);
      const duration = Date.now() - startTime;
      
      this.results.push({
        test: "Firestore Collection Query",
        success: true,
        duration
      });
      
      console.log(`✅ Firestore collection test passed (${duration}ms) - Found ${querySnapshot.size} documents`);
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      this.results.push({
        test: "Firestore Collection Query",
        success: false,
        error: error.message,
        duration
      });
      
      console.error(`❌ Firestore collection test failed (${duration}ms):`, error);
    }
  }

  printResults(): void {
    console.log("\n🔥 Firebase Connection Test Results:");
    console.log("=====================================");
    
    this.results.forEach((result, index) => {
      const status = result.success ? "✅ PASS" : "❌ FAIL";
      const duration = result.duration ? `(${result.duration}ms)` : "";
      
      console.log(`${index + 1}. ${result.test}: ${status} ${duration}`);
      
      if (!result.success && result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    const passedTests = this.results.filter(r => r.success).length;
    const totalTests = this.results.length;
    
    console.log(`\nSummary: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log("🎉 All Firebase connection tests passed!");
    } else {
      console.log("⚠️  Some Firebase connection tests failed. Check the errors above.");
    }
  }
}

// Convenience function to run tests
export async function testFirebaseConnection(): Promise<ConnectionTestResult[]> {
  const tester = new FirebaseConnectionTester();
  const results = await tester.runAllTests();
  tester.printResults();
  return results;
}

// Function to test connection and provide recommendations
export async function diagnoseFirebaseIssues(): Promise<void> {
  console.log("🔍 Diagnosing Firebase connection issues...");
  
  // Check network connectivity
  if (!navigator.onLine) {
    console.error("❌ No internet connection detected");
    return;
  }
  
  // Check if we're in a secure context (HTTPS or localhost)
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    console.warn("⚠️  Firebase requires HTTPS in production. Current protocol:", location.protocol);
  }
  
  // Run connection tests
  const results = await testFirebaseConnection();
  
  // Provide recommendations based on results
  const failedTests = results.filter(r => !r.success);
  
  if (failedTests.length > 0) {
    console.log("\n💡 Recommendations:");
    
    failedTests.forEach(test => {
      if (test.error?.includes('permission-denied')) {
        console.log("- Check your Firestore security rules");
        console.log("- Ensure your Firebase project has the correct configuration");
      }
      
      if (test.error?.includes('unavailable') || test.error?.includes('network')) {
        console.log("- Check your internet connection");
        console.log("- Try refreshing the page");
        console.log("- Check if Firebase services are down: https://status.firebase.google.com/");
      }
      
      if (test.error?.includes('invalid-api-key')) {
        console.log("- Verify your Firebase API key is correct");
        console.log("- Check your Firebase project configuration");
      }
    });
  }
}
