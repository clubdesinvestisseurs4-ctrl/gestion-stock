<template>
  <div>
    <h2 class="page-title">Historique des mouvements</h2>

    <div class="card filters">
      <select v-model="typeFilter">
        <option value="">Tous les types</option>
        <option value="entree">↑ Entrées</option>
        <option value="sortie">↓ Sorties</option>
      </select>
      <select v-model="productFilter">
        <option value="">Tous les produits</option>
        <option v-for="p in stockStore.products" :key="p.id" :value="p.id">{{ p.name }}</option>
      </select>
      <button class="btn btn-secondary btn-sm" @click="loadMovements">🔄 Actualiser</button>
    </div>

    <div v-if="stockStore.loading" class="loading">Chargement...</div>

    <div v-else class="card" style="margin-top:.75rem">
      <div v-if="!filtered.length" class="empty-state">
        <span>🔄</span>
        <p>Aucun mouvement trouvé.</p>
      </div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr><th>Date</th><th>Produit</th><th>Type</th><th>Quantité</th><th>Avant</th><th>Après</th><th>Par</th><th>Note</th></tr>
          </thead>
          <tbody>
            <tr v-for="m in filtered" :key="m.id">
              <td style="white-space:nowrap;font-size:.8rem">{{ formatDate(m.createdAt) }}</td>
              <td><strong>{{ m.productName }}</strong></td>
              <td>
                <span class="badge" :class="m.type === 'entree' ? 'badge-success' : 'badge-warning'">
                  {{ m.type === 'entree' ? '↑ Entrée' : '↓ Sortie' }}
                </span>
              </td>
              <td style="font-weight:600">{{ m.quantity }} {{ m.unit }}</td>
              <td style="color:var(--color-gray-400)">{{ m.quantityBefore }}</td>
              <td :style="m.triggeredAlert ? 'color:var(--color-danger);font-weight:600' : ''">
                {{ m.quantityAfter }} {{ m.triggeredAlert ? '⚠️' : '' }}
              </td>
              <td style="font-size:.8rem;color:var(--color-gray-400)">{{ m.createdByName || '—' }}</td>
              <td style="font-size:.8rem;color:var(--color-gray-400);max-width:140px;overflow:hidden;text-overflow:ellipsis">{{ m.note || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useStockStore } from '@/stores/stock';
import { useEstablishmentStore } from '@/stores/establishment';

const stockStore = useStockStore();
const estStore = useEstablishmentStore();

const typeFilter = ref('');
const productFilter = ref('');

const filtered = computed(() => {
  let list = stockStore.movements;
  if (typeFilter.value) list = list.filter(m => m.type === typeFilter.value);
  if (productFilter.value) list = list.filter(m => m.productId === productFilter.value);
  return list;
});

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

async function loadMovements() {
  await stockStore.fetchMovements(estStore.currentId, { limit: 100 });
}

onMounted(loadMovements);
</script>

<style scoped>
.page-title { font-size: 1.2rem; font-weight: 700; margin-bottom: 1rem; }
.filters { display: flex; gap: .75rem; flex-wrap: wrap; }
.filters select { padding: .45rem .7rem; border: 1px solid var(--color-gray-200); border-radius: var(--radius); font-size: .875rem; }
</style>
