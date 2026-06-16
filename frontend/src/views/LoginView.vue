<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-logo">📦</div>
      <h1>Gestion des Stocks</h1>
      <p class="subtitle">CookAfrica · Hôtel Ohinéné</p>

      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label>Email</label>
          <input v-model="email" type="email" placeholder="exemple@email.com" required autocomplete="email" />
        </div>
        <div class="form-group">
          <label>Mot de passe</label>
          <input v-model="password" type="password" placeholder="••••••••" required autocomplete="current-password" />
        </div>

        <div v-if="error" class="alert-banner danger" style="margin-bottom:1rem">
          ⚠️ {{ error }}
        </div>

        <button class="btn btn-primary" style="width:100%;justify-content:center" :disabled="loading">
          {{ loading ? 'Connexion...' : 'Se connecter' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const router = useRouter();

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

async function handleLogin() {
  error.value = '';
  loading.value = true;
  try {
    await authStore.login(email.value, password.value);
    router.push('/dashboard');
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('invalid-credential') || msg.includes('wrong-password') || msg.includes('user-not-found')) {
      error.value = 'Email ou mot de passe incorrect.';
    } else {
      error.value = 'Erreur de connexion. Vérifiez votre connexion internet.';
    }
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a6b3c 0%, #145530 100%);
  padding: 1rem;
}
.login-card {
  background: #fff;
  border-radius: 12px;
  padding: 2.5rem 2rem;
  width: 100%;
  max-width: 380px;
  box-shadow: 0 20px 40px rgba(0,0,0,.2);
  text-align: center;
}
.login-logo { font-size: 3rem; margin-bottom: .5rem; }
h1 { font-size: 1.4rem; color: var(--color-gray-800); margin-bottom: .25rem; }
.subtitle { color: var(--color-gray-400); font-size: .875rem; margin-bottom: 1.75rem; }
.form-group { text-align: left; }
</style>
