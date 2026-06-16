import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/config/firebase';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  const userData = ref(null); // rôle, établissement depuis Firestore
  const loading = ref(true);

  const isAuthenticated = computed(() => !!user.value);
  const isAdmin = computed(() => userData.value?.role === 'admin');
  const currentEstablishmentId = computed(() => userData.value?.establishmentId);

  async function login(email, password) {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    user.value = credential.user;
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
      onAuthStateChanged(auth, async (firebaseUser) => {
        user.value = firebaseUser;
        loading.value = false;
        resolve(firebaseUser);
      });
    });
  }

  return { user, userData, loading, isAuthenticated, isAdmin, currentEstablishmentId, login, logout, setUserData, init };
});
