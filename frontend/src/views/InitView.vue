<template>
  <div class="init-page">
    <div class="init-card">
      <div class="init-logo">🚀</div>
      <h1>Premier démarrage</h1>
      <p class="subtitle">
        Votre compte <strong>{{ authStore.user?.email }}</strong> va être configuré
        comme administrateur de l'application.
      </p>

      <div v-if="error" class="alert-banner danger" style="margin-bottom:1rem">
        ⚠️ {{ error }}
      </div>

      <div v-if="success" class="alert-banner" style="background:#d1fae5;border-left:4px solid #10b981;margin-bottom:1rem">
        ✅ Système initialisé ! Redirection en cours...
      </div>

      <button
        v-if="!success"
        class="btn btn-primary"
        style="width:100%;justify-content:center;padding:.75rem"
        :disabled="loading"
        @click="initialize"
      >
        {{ loading ? 'Initialisation...' : '✅ Initialiser le système' }}
      </button>

      <button class="btn btn-secondary" style="width:100%;justify-content:center;margin-top:.5rem" @click="logout">
        Se déconnecter
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import api from '@/config/api';

const authStore = useAuthStore();
const router = useRouter();
const loading = ref(false);
const error = ref('');
const success = ref(false);

async function initialize() {
  error.value = '';
  loading.value = true;
  try {
    await api.post('/init');
    success.value = true;
    setTimeout(() => router.push('/dashboard'), 1500);
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function logout() {
  await authStore.logout();
  router.push('/login');
}
</script>

<style scoped>
.init-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a6b3c 0%, #145530 100%);
  padding: 1rem;
}
.init-card {
  background: #fff;
  border-radius: 12px;
  padding: 2.5rem 2rem;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 20px 40px rgba(0,0,0,.2);
  text-align: center;
}
.init-logo { font-size: 3rem; margin-bottom: .5rem; }
h1 { font-size: 1.4rem; color: var(--color-gray-800); margin-bottom: .75rem; }
.subtitle { color: var(--color-gray-600); font-size: .9rem; margin-bottom: 1.75rem; line-height: 1.5; }
</style>
