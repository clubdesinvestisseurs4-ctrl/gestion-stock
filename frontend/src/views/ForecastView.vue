<template>
  <div>
    <div class="page-header">
      <h2 class="page-title">Prévisions de réapprovisionnement</h2>
      <button class="btn btn-secondary btn-sm" @click="refresh" :disabled="loading">🔄 Recalculer</button>
    </div>

    <div class="card params-card">
      <div class="form-group">
        <label>Fenêtre d'analyse (jours)</label>
        <input type="number" min="7" max="180" v-model.number="params.windowDays" @change="refresh" />
      </div>
      <div class="form-group">
        <label>Délai de réapprovisionnement (jours)</label>
        <input type="number" min="0" max="60" v-model.number="params.leadTimeDays" @change="refresh" />
      </div>
      <div class="form-group">
        <label>Stock de sécurité (jours)</label>
        <input type="number" min="0" max="60" v-model.number="params.safetyDays" @change="refresh" />
      </div>
    </div>

    <div v-if="loading" class="loading">Calcul des prévisions...</div>

    <template v-else>
      <div v-if="forecast?.topMovers?.length" class="charts-row">
        <div class="card chart-card chart-card-wide">
          <h3 class="chart-title">🔥 Ce qui sort le plus — Pareto ({{ forecast.windowDays }} j)</h3>
          <div class="chart-wrap">
            <Bar
              :data="paretoChartData"
              :options="paretoChartOptions"
              :plugins="[paretoAnnotationsPlugin]"
              :key="`pareto-${themeStore.dark}`"
            />
          </div>
        </div>
        <div class="card chart-card">
          <h3 class="chart-title">Répartition par urgence</h3>
          <div class="chart-wrap donut-wrap">
            <Doughnut :data="urgencyChartData" :options="donutOptions" :key="`donut-${themeStore.dark}`" />
          </div>
        </div>
      </div>

      <div v-if="!forecast?.items?.length" class="card" style="margin-top:1.25rem">
        <div class="empty-state">
          <span>📈</span>
          <p>Pas encore assez de données pour établir des prévisions.</p>
        </div>
      </div>

      <div v-else class="card" style="margin-top:1.25rem">
        <div class="table-wrap">
          <table class="card-table">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Urgence</th>
                <th>Stock</th>
                <th>Conso/jour</th>
                <th>Tendance</th>
                <th>Rupture estimée</th>
                <th>À commander</th>
                <th>ABC</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="i in forecast.items" :key="i.productId">
                <td>
                  <strong>{{ i.productName }}</strong>
                  <div class="muted">{{ i.category }}</div>
                </td>
                <td data-label="Urgence">
                  <span class="badge" :class="urgencyBadgeClass(i.urgency)">{{ urgencyLabel(i.urgency) }}</span>
                </td>
                <td data-label="Stock">{{ i.currentQuantity }} {{ i.unit }}</td>
                <td data-label="Conso/jour">{{ i.dailyRate ? `${i.dailyRate} ${i.unit}` : '—' }}</td>
                <td data-label="Tendance">
                  <span v-if="i.trendPct === null">—</span>
                  <span v-else :class="i.trendPct > 0 ? 'trend-up' : i.trendPct < 0 ? 'trend-down' : ''">
                    {{ i.trendPct > 0 ? '↑' : i.trendPct < 0 ? '↓' : '→' }} {{ Math.abs(i.trendPct) }}%
                  </span>
                </td>
                <td data-label="Rupture estimée">{{ stockoutLabel(i) }}</td>
                <td data-label="À commander">
                  <strong v-if="i.suggestedReorderQty > 0" style="color:var(--color-primary)">{{ i.suggestedReorderQty }} {{ i.unit }}</strong>
                  <span v-else>—</span>
                </td>
                <td data-label="ABC">
                  <span v-if="i.abcClass" class="badge" :class="abcBadgeClass(i.abcClass)">{{ i.abcClass }}</span>
                  <span v-else>—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { Bar, Doughnut } from 'vue-chartjs';
import {
  Chart as ChartJS,
  Title, Tooltip, Legend,
  BarElement, LineElement, PointElement, ArcElement,
  CategoryScale, LinearScale,
  BarController, LineController, DoughnutController,
} from 'chart.js';
import { useStockStore } from '@/stores/stock';
import { useEstablishmentStore } from '@/stores/establishment';
import { useThemeStore } from '@/stores/theme';

ChartJS.register(
  Title, Tooltip, Legend,
  BarElement, LineElement, PointElement, ArcElement,
  CategoryScale, LinearScale,
  BarController, LineController, DoughnutController
);

const stockStore = useStockStore();
const estStore = useEstablishmentStore();
const themeStore = useThemeStore();

const loading = ref(false);
const forecast = ref(null);
const params = reactive({ windowDays: 30, leadTimeDays: 3, safetyDays: 2 });

const ABC_COLORS = { A: '#e74c3c', B: '#f39c12', C: '#3b82f6' };
const URGENCY_COLORS = { critical: '#e74c3c', warning: '#f39c12', ok: '#27ae60', inactive: '#3b82f6' };

function chartTextColor() { return themeStore.dark ? '#e2e8f0' : '#374151'; }
function chartGridColor() { return themeStore.dark ? '#33415555' : '#e5e7eb'; }

const paretoChartData = computed(() => {
  const movers = forecast.value?.topMovers || [];
  return {
    labels: movers.map(m => m.productName),
    datasets: [
      {
        type: 'bar',
        label: 'Quantité sortie',
        data: movers.map(m => m.totalOut),
        backgroundColor: movers.map(m => ABC_COLORS[m.abcClass] || '#94a3b8'),
        borderRadius: 4,
        yAxisID: 'y',
      },
      {
        type: 'line',
        label: 'Cumul %',
        data: movers.map(m => m.cumulativePct),
        borderColor: '#1a6b3c',
        backgroundColor: '#1a6b3c',
        tension: .3,
        pointRadius: 3,
        yAxisID: 'y1',
      },
    ],
  };
});

const paretoChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  layout: { padding: { top: 28 } },
  plugins: { legend: { labels: { color: chartTextColor() } } },
  scales: {
    x: { ticks: { color: chartTextColor() }, grid: { color: chartGridColor() } },
    y: { position: 'left', ticks: { color: chartTextColor() }, grid: { color: chartGridColor() } },
    y1: {
      position: 'right', min: 0, max: 100,
      ticks: { color: chartTextColor(), callback: (v) => `${v}%` },
      grid: { drawOnChartArea: false },
    },
  },
}));

// Dessine le seuil 80% (frontière classe A) et le % cumulé au-dessus de chaque point
const paretoAnnotationsPlugin = {
  id: 'paretoAnnotations',
  afterDatasetsDraw(chart) {
    const { ctx, chartArea, scales, data } = chart;
    const { x, y1 } = scales;
    if (!x || !y1) return;

    const thresholdColor = themeStore.dark ? '#fbbf24' : '#b45309';
    ctx.save();

    const thresholdY = y1.getPixelForValue(80);
    ctx.strokeStyle = thresholdColor;
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(chartArea.left, thresholdY);
    ctx.lineTo(chartArea.right, thresholdY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = thresholdColor;
    ctx.font = '600 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Seuil 80 % — classe A', chartArea.left + 4, thresholdY - 6);

    const lineDataset = data.datasets.find((d) => d.type === 'line');
    if (lineDataset) {
      ctx.fillStyle = '#1a6b3c';
      ctx.textAlign = 'center';
      lineDataset.data.forEach((val, idx) => {
        if (val == null) return;
        const px = x.getPixelForValue(idx);
        const py = y1.getPixelForValue(val);
        ctx.fillText(`${val}%`, px, py - 10);
      });
    }

    ctx.restore();
  },
};

const urgencyChartData = computed(() => {
  const counts = { critical: 0, warning: 0, ok: 0, inactive: 0 };
  (forecast.value?.items || []).forEach(i => { counts[i.urgency]++; });
  return {
    labels: ['Critique', 'À surveiller', 'OK', 'Inactif'],
    datasets: [{
      data: [counts.critical, counts.warning, counts.ok, counts.inactive],
      backgroundColor: [URGENCY_COLORS.critical, URGENCY_COLORS.warning, URGENCY_COLORS.ok, URGENCY_COLORS.inactive],
      borderWidth: 0,
    }],
  };
});

const donutOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom', labels: { color: chartTextColor() } } },
}));

const URGENCY_LABELS = { critical: 'Critique', warning: 'À surveiller', ok: 'OK', inactive: 'Inactif' };
const URGENCY_BADGES = { critical: 'badge-danger', warning: 'badge-warning', ok: 'badge-success', inactive: 'badge-info' };
const ABC_BADGES = { A: 'badge-danger', B: 'badge-warning', C: 'badge-info' };

function urgencyLabel(u) { return URGENCY_LABELS[u] || u; }
function urgencyBadgeClass(u) { return URGENCY_BADGES[u] || ''; }
function abcBadgeClass(c) { return ABC_BADGES[c] || ''; }

function stockoutLabel(i) {
  if (i.daysUntilStockout == null) return '—';
  const date = new Date(Date.now() + i.daysUntilStockout * 86400000);
  return `${i.daysUntilStockout} j (${date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })})`;
}

async function refresh() {
  loading.value = true;
  try {
    forecast.value = await stockStore.fetchForecast(estStore.currentId, params);
  } finally {
    loading.value = false;
  }
}

onMounted(refresh);
</script>

<style scoped>
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
.page-title { font-size: 1.2rem; font-weight: 700; }
.params-card { display: flex; gap: 1.5rem; flex-wrap: wrap; }
.params-card .form-group { margin-bottom: 0; min-width: 160px; }
.muted { font-size: .75rem; color: var(--color-gray-400); }
.trend-up { color: var(--color-danger); font-weight: 600; }
.trend-down { color: var(--color-success); font-weight: 600; }

.charts-row { display: flex; gap: 1.25rem; flex-wrap: wrap; margin-top: 1.25rem; }
.chart-card { flex: 1 1 280px; }
.chart-card-wide { flex: 2 1 420px; }
.chart-title { margin-bottom: .75rem; font-size: .95rem; }
.chart-wrap { position: relative; height: 280px; }
.donut-wrap { height: 240px; }
</style>
