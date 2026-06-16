<template>
  <div>
    <h2 class="page-title">Tableau de bord — {{ estStore.current?.name }}</h2>

    <div v-if="stockStore.loading" class="loading">Chargement...</div>

    <template v-else>
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
          <table>
            <thead>
              <tr><th>Produit</th><th>Catégorie</th><th>Stock actuel</th><th>Seuil min</th><th>Déficit</th></tr>
            </thead>
            <tbody>
              <tr v-for="p in stockStore.lowStockProducts" :key="p.id">
                <td><strong>{{ p.name }}</strong></td>
                <td>{{ p.category }}</td>
                <td><span class="badge badge-danger">{{ p.quantity }} {{ p.unit }}</span></td>
                <td>{{ p.minThreshold }} {{ p.unit }}</td>
                <td style="color:var(--color-danger);font-weight:600">-{{ p.minThreshold - p.quantity }} {{ p.unit }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Mouvements récents -->
      <div v-if="dashboard?.recentMovements?.length" class="card" style="margin-top:1.25rem">
        <h3 style="margin-bottom:.75rem;font-size:.95rem">Derniers mouvements</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Produit</th><th>Type</th><th>Qté</th><th>Par</th><th>Date</th></tr>
            </thead>
            <tbody>
              <tr v-for="m in dashboard.recentMovements" :key="m.id">
                <td>{{ m.productName }}</td>
                <td>
                  <span class="badge" :class="m.type === 'entree' ? 'badge-success' : 'badge-warning'">
                    {{ m.type === 'entree' ? '↑ Entrée' : '↓ Sortie' }}
                  </span>
                </td>
                <td>{{ m.quantity }} {{ m.unit }}</td>
                <td style="font-size:.8rem;color:var(--color-gray-400)">{{ m.createdByName || '—' }}</td>
                <td style="font-size:.8rem;color:var(--color-gray-400)">{{ formatDate(m.createdAt) }}</td>
              </tr>
            </tbody>
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
import { onMounted } from 'vue';
import { useStockStore } from '@/stores/stock';
import { useEstablishmentStore } from '@/stores/establishment';

const stockStore = useStockStore();
const estStore = useEstablishmentStore();

const dashboard = stockStore.dashboard;

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

onMounted(async () => {
  await stockStore.fetchDashboard(estStore.currentId);
});
</script>

<style scoped>
.page-title { font-size: 1.2rem; font-weight: 700; margin-bottom: 1rem; color: var(--color-gray-800); }
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: .75rem; }
.kpi-card { display: flex; align-items: center; gap: .75rem; }
.kpi-icon { width: 44px; height: 44px; border-radius: var(--radius); display: flex; align-items: center; justify-content: center; font-size: 1.3rem; flex-shrink: 0; }
.kpi-value { font-size: 1.5rem; font-weight: 700; line-height: 1; }
.kpi-label { font-size: .78rem; color: var(--color-gray-400); margin-top: .15rem; }
</style>
