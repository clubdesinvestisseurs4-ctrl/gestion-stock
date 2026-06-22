<template>
  <div>
    <h2 class="page-title">Mouvements de stock</h2>

    <!-- Filtres date + type + produit -->
    <div class="card filters-bar">
      <div class="filter-group">
        <label>Période</label>
        <div class="period-btns">
          <button
            v-for="p in PERIODS"
            :key="p.key"
            class="btn btn-sm"
            :class="activePeriod === p.key ? 'btn-primary' : 'btn-secondary'"
            @click="selectPeriod(p.key)"
          >{{ p.label }}</button>
        </div>
      </div>

      <div class="filter-group" v-if="activePeriod === 'custom'">
        <label>Du</label>
        <input type="date" v-model="customStart" @change="loadMovements" />
        <label>Au</label>
        <input type="date" v-model="customEnd" @change="loadMovements" />
      </div>

      <div class="filter-group">
        <label>Type</label>
        <select v-model="typeFilter">
          <option value="">Tous</option>
          <option value="entree">↑ Entrées</option>
          <option value="sortie">↓ Sorties</option>
        </select>
      </div>

      <div class="filter-group">
        <label>Produit</label>
        <select v-model="productFilter">
          <option value="">Tous</option>
          <option v-for="p in stockStore.products" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </div>

      <button class="btn btn-secondary btn-sm" @click="loadMovements">🔄</button>
    </div>

    <!-- Bilan de la période -->
    <div class="card bilan-card" v-if="filtered.length">
      <div class="bilan-header">
        <h3 class="bilan-title">Bilan — {{ periodLabel }}</h3>
        <div class="bilan-totaux">
          <span class="badge-entree">↑ Entrées : <strong>{{ totalEntrees }}</strong> mvt</span>
          <span class="badge-sortie">↓ Sorties : <strong>{{ totalSorties }}</strong> mvt</span>
        </div>
      </div>

      <div class="table-wrap" v-if="bilanRows.length">
        <table class="card-table">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Unité</th>
              <th class="num">Qté entrée</th>
              <th class="num">Qté sortie</th>
              <th class="num">Solde net</th>
              <th class="num">Stock final</th>
            </tr>
          </thead>
          <TransitionGroup tag="tbody" name="list">
            <tr v-for="row in bilanRows" :key="row.productId">
              <td><strong>{{ row.productName }}</strong></td>
              <td data-label="Unité">{{ row.unit }}</td>
              <td data-label="↑ Entrée" class="num text-success">{{ row.qtyIn > 0 ? '+' + row.qtyIn : '—' }}</td>
              <td data-label="↓ Sortie" class="num text-danger">{{ row.qtyOut > 0 ? '-' + row.qtyOut : '—' }}</td>
              <td data-label="Solde net" class="num" :class="row.net >= 0 ? 'text-success' : 'text-danger'">
                {{ row.net >= 0 ? '+' : '' }}{{ row.net }}
              </td>
              <td data-label="Stock final" class="num" :class="row.stockFinal !== null && row.stockFinal <= 0 ? 'text-danger' : ''">
                {{ row.stockFinal !== null ? row.stockFinal : '—' }}
              </td>
            </tr>
          </TransitionGroup>
        </table>
      </div>
    </div>

    <!-- Liste détaillée -->
    <div v-if="stockStore.loading" class="loading">Chargement...</div>

    <div v-else class="card" style="margin-top:.75rem">
      <div class="list-header">
        <span class="count-label">{{ filtered.length }} mouvement(s)</span>
      </div>
      <div v-if="!filtered.length" class="empty-state">
        <span>🔄</span>
        <p>Aucun mouvement pour cette période.</p>
      </div>
      <div v-else class="table-wrap">
        <table class="card-table">
          <thead>
            <tr>
              <th>Date / Heure</th>
              <th>Produit</th>
              <th>Type</th>
              <th>Quantité</th>
              <th>Avant</th>
              <th>Après</th>
              <th>Par</th>
              <th>Note</th>
            </tr>
          </thead>
          <TransitionGroup tag="tbody" name="list">
            <tr v-for="m in filtered" :key="m.id">
              <td style="white-space:nowrap;font-size:.8rem">{{ formatDate(m.createdAt) }}</td>
              <td data-label="Produit"><strong>{{ m.productName }}</strong></td>
              <td data-label="Type">
                <span class="badge" :class="m.type === 'entree' ? 'badge-success' : 'badge-warning'">
                  {{ m.type === 'entree' ? '↑ Entrée' : '↓ Sortie' }}
                </span>
              </td>
              <td data-label="Quantité" style="font-weight:600">{{ m.quantity }} {{ m.unit }}</td>
              <td data-label="Avant" style="color:var(--text-soft)">{{ m.quantityBefore }}</td>
              <td data-label="Après" :style="m.triggeredAlert ? 'color:var(--color-danger);font-weight:600' : ''">
                {{ m.quantityAfter }} {{ m.triggeredAlert ? '⚠️' : '' }}
              </td>
              <td data-label="Par" style="font-size:.8rem;color:var(--text-soft)">{{ m.createdByName || '—' }}</td>
              <td data-label="Note" style="font-size:.8rem;color:var(--text-soft);max-width:140px;overflow:hidden;text-overflow:ellipsis">
                {{ m.note || '—' }}
              </td>
            </tr>
          </TransitionGroup>
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
const activePeriod = ref('today');
const customStart = ref(todayStr());
const customEnd = ref(todayStr());

const PERIODS = [
  { key: 'today',     label: "Aujourd'hui" },
  { key: 'yesterday', label: 'Hier' },
  { key: 'week',      label: '7 derniers jours' },
  { key: 'month',     label: 'Ce mois' },
  { key: 'all',       label: 'Tout' },
  { key: 'custom',    label: 'Personnalisé' },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function dayRange(dateStr) {
  const start = new Date(dateStr);
  start.setHours(0, 0, 0, 0);
  const end = new Date(dateStr);
  end.setHours(23, 59, 59, 999);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

function periodToRange(key) {
  const today = new Date();
  if (key === 'today') {
    return dayRange(todayStr());
  }
  if (key === 'yesterday') {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return dayRange(d.toISOString().slice(0, 10));
  }
  if (key === 'week') {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }
  if (key === 'month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }
  if (key === 'custom') {
    return {
      startDate: new Date(customStart.value + 'T00:00:00').toISOString(),
      endDate:   new Date(customEnd.value   + 'T23:59:59').toISOString(),
    };
  }
  return {}; // 'all'
}

const periodLabel = computed(() => {
  const p = PERIODS.find(p => p.key === activePeriod.value);
  if (activePeriod.value === 'custom') {
    return `Du ${customStart.value} au ${customEnd.value}`;
  }
  return p?.label || '';
});

async function selectPeriod(key) {
  activePeriod.value = key;
  if (key !== 'custom') await loadMovements();
}

async function loadMovements() {
  const params = { limit: 200, ...periodToRange(activePeriod.value) };
  await stockStore.fetchMovements(estStore.currentId, params);
}

// Filtres client-side (type + produit)
const filtered = computed(() => {
  let list = stockStore.movements;
  if (typeFilter.value)    list = list.filter(m => m.type === typeFilter.value);
  if (productFilter.value) list = list.filter(m => m.productId === productFilter.value);
  return list;
});

// Totaux globaux
const totalEntrees = computed(() => filtered.value.filter(m => m.type === 'entree').length);
const totalSorties = computed(() => filtered.value.filter(m => m.type === 'sortie').length);

// Bilan par produit
const bilanRows = computed(() => {
  const map = {};
  for (const m of filtered.value) {
    if (!map[m.productId]) {
      map[m.productId] = { productId: m.productId, productName: m.productName, unit: m.unit, qtyIn: 0, qtyOut: 0, stockFinal: null };
    }
    if (m.type === 'entree') map[m.productId].qtyIn  += m.quantity;
    else                     map[m.productId].qtyOut += m.quantity;
    // Le mouvement le plus récent en tête (movements triés desc) → premier rencontré = stock final
    if (map[m.productId].stockFinal === null) {
      map[m.productId].stockFinal = m.quantityAfter;
    }
  }
  return Object.values(map)
    .map(r => ({ ...r, net: +(r.qtyIn - r.qtyOut).toFixed(3) }))
    .sort((a, b) => a.productName.localeCompare(b.productName));
});

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

onMounted(loadMovements);
</script>

<style scoped>
.page-title { font-size: 1.2rem; font-weight: 700; margin-bottom: 1rem; }

.filters-bar {
  display: flex; flex-wrap: wrap; align-items: flex-end; gap: .75rem; margin-bottom: .75rem;
}
.filter-group { display: flex; flex-direction: column; gap: .25rem; }
.filter-group label { font-size: .75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: .04em; }
.filter-group select,
.filter-group input[type="date"] {
  padding: .4rem .6rem; border: 1px solid var(--border-color); border-radius: var(--radius);
  font-size: .85rem; background: var(--bg-input); color: var(--text-main);
}
.period-btns { display: flex; gap: .3rem; flex-wrap: wrap; }

/* Bilan */
.bilan-card { margin-top: .75rem; }
.bilan-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: .5rem; margin-bottom: 1rem; }
.bilan-title { font-size: 1rem; font-weight: 700; }
.bilan-totaux { display: flex; gap: .75rem; flex-wrap: wrap; }
.badge-entree { background: #d1fae5; color: #065f46; padding: .2rem .7rem; border-radius: 99px; font-size: .82rem; }
.badge-sortie { background: #fef3c7; color: #92400e; padding: .2rem .7rem; border-radius: 99px; font-size: .82rem; }
[data-theme="dark"] .badge-entree { background: #052e1630; color: #6ee7b7; }
[data-theme="dark"] .badge-sortie { background: #451a0330; color: #fcd34d; }

.num { text-align: right; }
.text-success { color: var(--color-success); font-weight: 600; }
.text-danger  { color: var(--color-danger);  font-weight: 600; }

.list-header { display: flex; justify-content: flex-end; margin-bottom: .5rem; }
.count-label { font-size: .8rem; color: var(--text-soft); }
</style>
