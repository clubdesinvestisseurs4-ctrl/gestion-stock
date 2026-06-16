<template>
  <div>
    <div class="page-header">
      <h2 class="page-title">Alertes de stock</h2>
      <button class="btn btn-secondary btn-sm" @click="refresh">🔄 Actualiser</button>
    </div>

    <div v-if="loading" class="loading">Chargement...</div>

    <template v-else>
      <div v-if="!alerts.length" class="card">
        <div class="empty-state">
          <span>✅</span>
          <p>Tous les stocks sont au-dessus du seuil minimum.</p>
        </div>
      </div>

      <template v-else>
        <div class="alert-banner danger" style="margin-bottom:1rem">
          ⚠️ <strong>{{ alerts.length }} produit(s)</strong> nécessitent un réapprovisionnement immédiat.
        </div>

        <div class="alert-cards">
          <div v-for="a in alerts" :key="a.id" class="card alert-card">
            <div class="alert-card-header">
              <div>
                <div class="alert-name">{{ a.name }}</div>
                <div class="alert-category">{{ a.category }}</div>
              </div>
              <span class="badge badge-danger">Stock bas</span>
            </div>
            <div class="alert-stats">
              <div class="stat">
                <div class="stat-label">Stock actuel</div>
                <div class="stat-value danger">{{ a.quantity }} {{ a.unit }}</div>
              </div>
              <div class="stat-arrow">→</div>
              <div class="stat">
                <div class="stat-label">Seuil minimum</div>
                <div class="stat-value">{{ a.minThreshold }} {{ a.unit }}</div>
              </div>
              <div class="stat-arrow">→</div>
              <div class="stat">
                <div class="stat-label">Déficit</div>
                <div class="stat-value danger">-{{ a.deficit }} {{ a.unit }}</div>
              </div>
            </div>
            <div class="alert-meta">Dernière mise à jour : {{ formatDate(a.updatedAt) }}</div>
            <router-link to="/products" class="btn btn-primary btn-sm" style="margin-top:.75rem">
              ↑ Réapprovisionner
            </router-link>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useStockStore } from '@/stores/stock';
import { useEstablishmentStore } from '@/stores/establishment';

const stockStore = useStockStore();
const estStore = useEstablishmentStore();

const loading = ref(false);
const alerts = ref([]);

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

async function refresh() {
  loading.value = true;
  try {
    const data = await stockStore.fetchAlerts(estStore.currentId);
    alerts.value = data.alerts;
  } finally {
    loading.value = false;
  }
}

onMounted(refresh);
</script>

<style scoped>
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
.page-title { font-size: 1.2rem; font-weight: 700; }
.alert-cards { display: grid; gap: .75rem; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
.alert-card { border-left: 4px solid var(--color-danger); }
.alert-card-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: .75rem; }
.alert-name { font-weight: 700; font-size: 1rem; }
.alert-category { font-size: .8rem; color: var(--color-gray-400); margin-top: .15rem; }
.alert-stats { display: flex; align-items: center; gap: .75rem; flex-wrap: wrap; margin-bottom: .5rem; }
.stat { text-align: center; }
.stat-label { font-size: .72rem; color: var(--color-gray-400); margin-bottom: .15rem; }
.stat-value { font-size: 1rem; font-weight: 700; }
.stat-value.danger { color: var(--color-danger); }
.stat-arrow { color: var(--color-gray-400); font-size: 1.1rem; }
.alert-meta { font-size: .75rem; color: var(--color-gray-400); }
</style>
