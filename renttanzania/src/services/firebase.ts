import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// The browser uses Firebase only to prove a Google account. All data lives in the
// server's Firestore and is reached through the RENTZ API, never directly.
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Opens the Google popup and returns the Firebase ID token for the server to verify
export async function signInWithGoogleForRentz(): Promise<{ idToken: string }> {
  const credential = await signInWithPopup(auth, googleProvider);
  return { idToken: await credential.user.getIdToken() };
}

export async function signOutFromFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch {
    // Ignore sign-out errors if there is no active Firebase session
  }
}
