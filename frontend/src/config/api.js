import axios from 'axios';
import { auth } from './firebase';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 45000, // 45s pour laisser Render se réveiller (plan gratuit ~30s)
});

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken(false);
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const status = err.response?.status;
    const data = err.response?.data;

    // Erreur réseau (Render endormi, timeout, pas de connexion)
    if (!err.response) {
      return Promise.reject(new Error('Serveur inaccessible. Veuillez patienter et réessayer.'));
    }

    const message = data?.error || 'Erreur de connexion au serveur';

    // 403 : utilisateur non initialisé → rediriger vers /init
    if (status === 403 && data?.needsInit === true) {
      window.location.href = '/init';
      return Promise.reject(new Error(message));
    }

    // 403 sans needsInit : utilisateur non autorisé → login
    if (status === 403) {
      return Promise.reject(new Error(message));
    }

    return Promise.reject(new Error(message));
  }
);

export default api;
