// Quick authentication test utility
import { auth } from '@/lib/firebase';

export const testAuth = () => {
  console.log('🔍 Auth Test Results:');
  console.log('- Current user:', auth.currentUser);
  console.log('- User ID:', auth.currentUser?.uid);
  console.log('- User email:', auth.currentUser?.email);
  console.log('- Is authenticated:', !!auth.currentUser);
  console.log('- Auth token available:', !!auth.currentUser?.getIdToken);
  
  if (auth.currentUser) {
    auth.currentUser.getIdToken().then(token => {
      console.log('- Auth token length:', token.length);
      console.log('- Token starts with:', token.substring(0, 20) + '...');
    }).catch(err => {
      console.error('- Error getting token:', err);
    });
  }
};
