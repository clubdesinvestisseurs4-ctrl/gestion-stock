<template>
  <div class="app-layout">
    <!-- Sidebar -->
    <aside class="sidebar" :class="{ open: sidebarOpen }">
      <div class="sidebar-header">
        <div class="logo">📦 Stocks</div>
        <button class="close-btn" @click="sidebarOpen = false">✕</button>
      </div>

      <!-- Sélecteur d'établissement -->
      <div class="establishment-switcher">
        <button
          v-for="est in estStore.all"
          :key="est.id"
          class="est-btn"
          :class="{ active: estStore.currentId === est.id }"
          :style="estStore.currentId === est.id ? { borderColor: est.color } : {}"
          @click="switchEstablishment(est.id)"
        >
          <span>{{ est.icon }}</span>
          <span class="est-name">{{ est.name }}</span>
        </button>
      </div>

      <nav class="nav">
        <router-link to="/dashboard" @click="sidebarOpen = false">
          <span>📊</span> Tableau de bord
        </router-link>
        <router-link to="/products" @click="sidebarOpen = false">
          <span>🗃️</span> Produits
        </router-link>
        <router-link to="/movements" @click="sidebarOpen = false">
          <span>🔄</span> Mouvements
        </router-link>
        <router-link to="/alerts" @click="sidebarOpen = false" class="nav-alerts">
          <span>⚠️</span> Alertes
          <span v-if="alertCount > 0" class="nav-badge">{{ alertCount }}</span>
        </router-link>
        <router-link v-if="authStore.isAdmin" to="/users" @click="sidebarOpen = false">
          <span>👥</span> Utilisateurs
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <div class="user-info">
          <div class="user-email">{{ authStore.user?.email }}</div>
          <span class="badge" :class="authStore.isAdmin ? 'badge-info' : 'badge-success'">
            {{ authStore.isAdmin ? 'Admin' : 'Opérateur' }}
          </span>
        </div>
        <button class="btn btn-secondary btn-sm logout-btn" @click="logout">Déconnexion</button>
      </div>
    </aside>

    <!-- Overlay mobile -->
    <div v-if="sidebarOpen" class="overlay" @click="sidebarOpen = false" />

    <!-- Contenu principal -->
    <div class="main-wrapper">
      <header class="topbar">
        <button class="menu-btn" @click="sidebarOpen = true">☰</button>
        <div class="topbar-title">
          <span>{{ estStore.current?.icon }}</span>
          {{ estStore.current?.name }}
        </div>
        <div v-if="stockStore.lowStockProducts.length" class="topbar-alert" @click="$router.push('/alerts')">
          ⚠️ {{ stockStore.lowStockProducts.length }} alerte(s)
        </div>
      </header>
      <main class="main-content">
        <div v-if="initError" class="alert-banner danger" style="margin-bottom:1rem">
          ⚠️ {{ initError }}
          <button class="btn btn-secondary btn-sm" style="margin-left:auto" @click="() => { initError=''; location.reload(); }">
            Recharger
          </button>
        </div>
        <router-view v-else />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useEstablishmentStore } from '@/stores/establishment';
import { useStockStore } from '@/stores/stock';
import api from '@/config/api';

const authStore = useAuthStore();
const estStore = useEstablishmentStore();
const stockStore = useStockStore();
const router = useRouter();
const sidebarOpen = ref(false);
const initError = ref('');

const alertCount = computed(() => stockStore.lowStockProducts.length);

async function switchEstablishment(id) {
  estStore.switchTo(id);
  stockStore.reset();
  await stockStore.fetchProducts(id);
  sidebarOpen.value = false;
}

async function logout() {
  await authStore.logout();
  router.push('/login');
}

onMounted(async () => {
  // Charger les données utilisateur si pas encore fait (une seule fois, pas dans le router)
  if (!authStore.userData) {
    try {
      const me = await api.get('/me');
      authStore.setUserData(me);
    } catch (e) {
      const status = e.status || 0;
      if (status === 403) {
        // Utilisateur non enregistré dans Firestore → page d'initialisation
        router.replace('/init');
        return;
      }
      if (status === 404) {
        // Route /me inexistante = backend pas encore déployé
        initError.value = 'Backend en cours de déploiement. Rechargez dans 1 minute.';
      }
      // Erreur réseau (status 0) → continuer, le dashboard gérera le réveil
    }
  }

  if (!initError.value) {
    await stockStore.fetchProducts(estStore.currentId);
  }
});

watch(() => estStore.currentId, (id) => {
  stockStore.fetchProducts(id);
});
</script>

<style scoped>
.app-layout { display: flex; min-height: 100vh; }

.sidebar {
  width: 240px;
  background: #fff;
  border-right: 1px solid var(--color-gray-200);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  z-index: 50;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--color-gray-100);
}
.logo { font-size: 1.1rem; font-weight: 700; color: var(--color-primary); }
.close-btn { display: none; background: none; border: none; cursor: pointer; font-size: 1.1rem; }

.establishment-switcher { padding: .75rem; display: flex; flex-direction: column; gap: .4rem; border-bottom: 1px solid var(--color-gray-100); }
.est-btn {
  display: flex; align-items: center; gap: .5rem;
  padding: .45rem .6rem; border: 2px solid transparent;
  border-radius: var(--radius); background: var(--color-gray-50);
  cursor: pointer; font-size: .85rem; transition: all .15s;
}
.est-btn.active { background: #fff; font-weight: 600; }
.est-btn:hover { background: var(--color-gray-100); }
.est-name { font-size: .85rem; }

.nav { padding: .75rem; display: flex; flex-direction: column; gap: .2rem; flex: 1; }
.nav a {
  display: flex; align-items: center; gap: .6rem;
  padding: .6rem .75rem; border-radius: var(--radius);
  text-decoration: none; color: var(--color-gray-600);
  font-size: .9rem; transition: background .15s;
  position: relative;
}
.nav a:hover { background: var(--color-gray-100); }
.nav a.router-link-active { background: #e6f4ed; color: var(--color-primary); font-weight: 600; }
.nav-badge {
  margin-left: auto;
  background: var(--color-danger);
  color: #fff;
  font-size: .7rem;
  font-weight: 700;
  border-radius: 99px;
  padding: .1rem .45rem;
}

.sidebar-footer {
  padding: .75rem;
  border-top: 1px solid var(--color-gray-100);
  display: flex;
  flex-direction: column;
  gap: .5rem;
}
.user-info { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
.user-email { font-size: .78rem; color: var(--color-gray-600); word-break: break-all; }
.logout-btn { width: 100%; justify-content: center; }

.main-wrapper { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.topbar {
  display: flex; align-items: center; gap: 1rem;
  padding: .75rem 1.25rem;
  background: #fff;
  border-bottom: 1px solid var(--color-gray-200);
  position: sticky; top: 0; z-index: 10;
}
.menu-btn { display: none; background: none; border: none; cursor: pointer; font-size: 1.3rem; }
.topbar-title { font-weight: 600; font-size: 1rem; display: flex; align-items: center; gap: .4rem; }
.topbar-alert {
  margin-left: auto;
  background: #fef3c7;
  color: #92400e;
  padding: .25rem .7rem;
  border-radius: 99px;
  font-size: .8rem;
  font-weight: 600;
  cursor: pointer;
}
.main-content { padding: 1.25rem; flex: 1; }

.overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 40; }

@media (max-width: 768px) {
  .sidebar {
    position: fixed; top: 0; left: 0; height: 100vh;
    transform: translateX(-100%); transition: transform .25s;
  }
  .sidebar.open { transform: translateX(0); }
  .close-btn { display: block; }
  .menu-btn { display: block; }
  .overlay { display: block; }
  .main-content { padding: 1rem; }
}
</style>
