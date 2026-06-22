import { ref } from 'vue';
import { getToken, onMessage } from 'firebase/messaging';
import { getMessagingInstance, firebaseConfig } from '@/config/firebase';
import api from '@/config/api';

const PUSH_SW_SCOPE = '/firebase-cloud-messaging-push-scope';

// Notification reçue alors que l'onglet est au premier plan (l'OS n'affiche pas
// de notification système dans ce cas) — affichée comme bannière in-app.
export const foregroundNotification = ref(null);

let foregroundListenerAttached = false;

// register() résout dès que l'enregistrement existe, pas quand le worker est
// "active" — PushManager.subscribe() (appelé par getToken) exige un worker actif,
// sinon il échoue avec "no active Service Worker".
function waitUntilActive(registration) {
  if (registration.active) return Promise.resolve(registration);
  const worker = registration.installing || registration.waiting;
  if (!worker) return Promise.resolve(registration);
  return new Promise((resolve) => {
    worker.addEventListener('statechange', () => {
      if (worker.state === 'activated') resolve(registration);
    });
  });
}

async function registerPushServiceWorker() {
  const params = new URLSearchParams(firebaseConfig);
  const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${params.toString()}`, {
    scope: PUSH_SW_SCOPE,
  });
  return waitUntilActive(registration);
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
