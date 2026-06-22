import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getMessaging, isSupported } from 'firebase/messaging';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;

// Certains contextes (navigateurs sans support FCM, iOS hors écran d'accueil) ne
// supportent pas la messagerie web : on ne doit jamais planter dans ce cas.
let messagingPromise;
export function getMessagingInstance() {
  if (!messagingPromise) {
    messagingPromise = isSupported().then(supported => (supported ? getMessaging(app) : null));
  }
  return messagingPromise;
}
