import axios from 'axios';
import { auth } from './firebase';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 20000,
});

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    // Forcer le refresh du token à chaque requête pour éviter les tokens expirés
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
    const message = data?.error || 'Erreur de connexion au serveur';

    // Utilisateur non initialisé → rediriger vers /init
    if (status === 403 && (data?.needsInit !== undefined || message === 'Utilisateur introuvable' || message === 'Utilisateur non enregistré')) {
      if (data?.needsInit) {
        window.location.href = '/init';
      } else {
        window.location.href = '/login';
      }
    }

    return Promise.reject(new Error(message));
  }
);

export default api;
