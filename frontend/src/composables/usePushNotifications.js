import { ref } from 'vue';
import { getToken, onMessage } from 'firebase/messaging';
import { getMessagingInstance, firebaseConfig } from '@/config/firebase';
import api from '@/config/api';

const PUSH_SW_SCOPE = '/firebase-cloud-messaging-push-scope';

// Notification reçue alors que l'onglet est au premier plan (l'OS n'affiche pas
// de notification système dans ce cas) — affichée comme bannière in-app.
export const foregroundNotification = ref(null);

let foregroundListenerAttached = false;

async function registerPushServiceWorker() {
  const params = new URLSearchParams(firebaseConfig);
  return navigator.serviceWorker.register(`/firebase-messaging-sw.js?${params.toString()}`, {
    scope: PUSH_SW_SCOPE,
  });
}

export function usePushNotifications() {
  const permission = ref(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');

  async function requestAndRegister() {
    if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) return false;

    const messaging = await getMessagingInstance();
    if (!messaging) return false;

    const result = await Notification.requestPermission();
    permission.value = result;
    if (result !== 'granted') return false;

    const registration = await registerPushServiceWorker();
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    if (!token) return false;

    await api.post('/me/fcm-token', { token });

    if (!foregroundListenerAttached) {
      foregroundListenerAttached = true;
      onMessage(messaging, (payload) => { foregroundNotification.value = payload; });
    }

    return true;
  }

  // Rafraîchit silencieusement le token si la permission a déjà été accordée
  // précédemment — aucun prompt, juste une re-synchro avec le backend.
  async function silentlyRefreshIfGranted() {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    await requestAndRegister();
  }

  return { permission, requestAndRegister, silentlyRefreshIfGranted };
}
