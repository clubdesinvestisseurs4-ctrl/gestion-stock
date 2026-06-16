import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/config/firebase';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  const userData = ref(null);
  const loading = ref(true);

  const isAuthenticated = computed(() => !!user.value);
  // isAdmin est vrai si le rôle est admin OU si userData n'est pas encore chargé (évite les flashs de redirect)
  const isAdmin = computed(() => userData.value?.role === 'admin');
  const currentEstablishmentId = computed(() => userData.value?.establishmentId);

  async function login(email, password) {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    user.value = credential.user;
    userData.value = null; // Forcer rechargement depuis /me
  }

  async function logout() {
    await signOut(auth);
    user.value = null;
    userData.value = null;
  }

  function setUserData(data) {
    userData.value = data;
  }

  function init() {
    return new Promise((resolve) => {
      onAuthStateChanged(auth, (firebaseUser) => {
        user.value = firebaseUser;
        if (!firebaseUser) userData.value = null;
        loading.value = false;
        resolve(firebaseUser);
      });
    });
  }

  return { user, userData, loading, isAuthenticated, isAdmin, currentEstablishmentId, login, logout, setUserData, init };
});
