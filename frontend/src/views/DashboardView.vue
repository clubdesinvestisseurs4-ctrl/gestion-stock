<template>
  <div>
    <h2 class="page-title">Tableau de bord — {{ estStore.current?.name }}</h2>

    <!-- Bannière réveil serveur -->
    <ServerWakeup :visible="serverSleeping" @retry="loadData" />

    <!-- Erreur serveur -->
    <div v-if="serverError && !stockStore.loading" class="alert-banner danger" style="margin-bottom:1rem">
      ⚠️ {{ serverError }}
      <button class="btn btn-secondary btn-sm" style="margin-left:auto" @click="loadData">Réessayer</button>
    </div>

    <div v-if="stockStore.loading" class="loading">Chargement des données...</div>

    <template v-else-if="!serverError">
      <!-- Alertes de stock bas -->
      <div v-if="stockStore.lowStockProducts.length" class="alert-banner warning" style="margin-bottom:1.25rem">
        ⚠️ <strong>{{ stockStore.lowStockProducts.length }} produit(s)</strong> en dessous du seuil minimum.
        <router-link to="/alerts" style="margin-left:auto;color:inherit;font-weight:600">Voir →</router-link>
      </div>

      <!-- KPIs -->
      <div class="kpi-grid">
        <div class="card kpi-card">
          <div class="kpi-icon" style="background:#dbeafe">🗃️</div>
          <div>
            <div class="kpi-value">{{ dashboard?.totalProducts ?? stockStore.products.length }}</div>
            <div class="kpi-label">Total produits</div>
          </div>
        </div>
        <div class="card kpi-card">
          <div class="kpi-icon" style="background:#fee2e2">⚠️</div>
          <div>
            <div class="kpi-value" style="color:var(--color-danger)">{{ stockStore.lowStockProducts.length }}</div>
            <div class="kpi-label">Stock bas</div>
          </div>
        </div>
        <div class="card kpi-card">
          <div class="kpi-icon" style="background:#d1fae5">📂</div>
          <div>
            <div class="kpi-value">{{ dashboard?.categories?.length ?? '—' }}</div>
            <div class="kpi-label">Catégories</div>
          </div>
        </div>
      </div>

      <!-- Produits en alerte -->
      <div v-if="stockStore.lowStockProducts.length" class="card" style="margin-top:1.25rem">
        <h3 style="margin-bottom:.75rem;font-size:.95rem">Produits à réapprovisionner</h3>
        <div class="table-wrap">
          <table class="card-table">
            <thead>
              <tr><th>Produit</th><th>Catégorie</th><th>Stock actuel</th><th>Seuil min</th><th>Déficit</th></tr>
            </thead>
            <TransitionGroup tag="tbody" name="list">
              <tr v-for="p in stockStore.lowStockProducts" :key="p.id">
                <td><strong>{{ p.name }}</strong></td>
                <td data-label="Catégorie">{{ p.category }}</td>
                <td data-label="Stock actuel"><span class="badge badge-danger">{{ p.quantity }} {{ p.unit }}</span></td>
                <td data-label="Seuil min">{{ p.minThreshold }} {{ p.unit }}</td>
                <td data-label="Déficit" style="color:var(--color-danger);font-weight:600">-{{ p.minThreshold - p.quantity }} {{ p.unit }}</td>
              </tr>
            </TransitionGroup>
          </table>
        </div>
      </div>

      <!-- Mouvements récents -->
      <div v-if="dashboard?.recentMovements?.length" class="card" style="margin-top:1.25rem">
        <h3 style="margin-bottom:.75rem;font-size:.95rem">Derniers mouvements</h3>
        <div class="table-wrap">
          <table class="card-table">
            <thead>
              <tr><th>Produit</th><th>Type</th><th>Qté</th><th>Par</th><th>Date</th></tr>
            </thead>
            <TransitionGroup tag="tbody" name="list">
              <tr v-for="m in dashboard.recentMovements" :key="m.id">
                <td><strong>{{ m.productName }}</strong></td>
                <td data-label="Type">
                  <span class="badge" :class="m.type === 'entree' ? 'badge-success' : 'badge-warning'">
                    {{ m.type === 'entree' ? '↑ Entrée' : '↓ Sortie' }}
                  </span>
                </td>
                <td data-label="Quantité">{{ m.quantity }} {{ m.unit }}</td>
                <td data-label="Par" style="font-size:.8rem;color:var(--color-gray-400)">{{ m.createdByName || '—' }}</td>
                <td data-label="Date" style="font-size:.8rem;color:var(--color-gray-400)">{{ formatDate(m.createdAt) }}</td>
              </tr>
            </TransitionGroup>
          </table>
        </div>
      </div>

      <!-- État vide -->
      <div v-if="!stockStore.products.length" class="card" style="margin-top:1.25rem">
        <div class="empty-state">
          <span>📦</span>
          <p>Aucun produit enregistré. <router-link to="/products">Ajouter un produit →</router-link></p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useStockStore } from '@/stores/stock';
import { useEstablishmentStore } from '@/stores/establishment';
import ServerWakeup from '@/components/ServerWakeup.vue';

const stockStore = useStockStore();
const estStore = useEstablishmentStore();

const serverError = ref('');
const serverSleeping = ref(false);

const dashboard = computed(() => stockStore.dashboard);

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

async function loadData() {
  serverError.value = '';
  serverSleeping.value = false;
  try {
    await Promise.all([
      stockStore.fetchDashboard(estStore.currentId),
      stockStore.fetchProducts(estStore.currentId),
    ]);
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('inaccessible') || msg.includes('timeout')) {
      serverSleeping.value = true;
      // Réessai automatique après 15s
      setTimeout(loadData, 15000);
    } else {
      serverError.value = msg;
    }
  }
}

onMounted(loadData);
</script>

<style scoped>
.page-title { font-size: 1.2rem; font-weight: 700; margin-bottom: 1rem; color: var(--color-gray-800); }
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: .75rem; }
.kpi-card { display: flex; align-items: center; gap: .75rem; }
.kpi-icon { width: 44px; height: 44px; border-radius: var(--radius); display: flex; align-items: center; justify-content: center; font-size: 1.3rem; flex-shrink: 0; }
.kpi-value { font-size: 1.5rem; font-weight: 700; line-height: 1; }
.kpi-label { font-size: .78rem; color: var(--color-gray-400); margin-top: .15rem; }
</style>
