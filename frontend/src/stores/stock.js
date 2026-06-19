import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/config/api';

export const useStockStore = defineStore('stock', () => {
  const products = ref([]);
  const movements = ref([]);
  const alerts = ref([]);
  const dashboard = ref(null);
  const forecast = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const lowStockProducts = computed(() => products.value.filter(p => p.isLowStock));

  async function fetchProducts(establishmentId) {
    loading.value = true;
    error.value = null;
    try {
      products.value = await api.get(`/establishments/${establishmentId}/products`);
    } catch (e) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  }

  async function createProduct(establishmentId, data) {
    const product = await api.post(`/establishments/${establishmentId}/products`, data);
    products.value.push(product);
    return product;
  }

  async function updateProduct(establishmentId, productId, data) {
    const updated = await api.put(`/establishments/${establishmentId}/products/${productId}`, data);
    const idx = products.value.findIndex(p => p.id === productId);
    if (idx !== -1) products.value[idx] = updated;
    return updated;
  }

  async function deleteProduct(establishmentId, productId) {
    await api.delete(`/establishments/${establishmentId}/products/${productId}`);
    products.value = products.value.filter(p => p.id !== productId);
  }

  async function createMovement(establishmentId, data) {
    const result = await api.post(`/establishments/${establishmentId}/movements`, data);
    // Mettre à jour le stock local
    const idx = products.value.findIndex(p => p.id === data.productId);
    if (idx !== -1) {
      products.value[idx].quantity = result.stock.newQuantity;
      products.value[idx].isLowStock = result.stock.isLowStock;
    }
    if (result.stock.isLowStock) {
      const existing = alerts.value.find(a => a.id === data.productId);
      if (!existing) {
        const p = products.value[idx];
        alerts.value.push({ id: data.productId, name: p?.name, quantity: result.stock.newQuantity, unit: result.stock.unit });
      }
    }
    movements.value.unshift(result.movement);
    return result;
  }

  async function fetchMovements(establishmentId, params = {}) {
    loading.value = true;
    try {
      const query = new URLSearchParams(params).toString();
      movements.value = await api.get(`/establishments/${establishmentId}/movements?${query}`);
    } catch (e) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  }

  async function fetchAlerts(establishmentId) {
    const data = await api.get(`/establishments/${establishmentId}/alerts`);
    alerts.value = data.alerts;
    return data;
  }

  async function fetchDashboard(establishmentId) {
    loading.value = true;
    try {
      dashboard.value = await api.get(`/establishments/${establishmentId}/dashboard`);
    } finally {
      loading.value = false;
    }
  }

  async function fetchForecast(establishmentId, params = {}) {
    const query = new URLSearchParams(params).toString();
    forecast.value = await api.get(`/establishments/${establishmentId}/forecast?${query}`);
    return forecast.value;
  }

  function reset() {
    products.value = [];
    movements.value = [];
    alerts.value = [];
    dashboard.value = null;
    forecast.value = null;
  }

  return {
    products, movements, alerts, dashboard, forecast, loading, error,
    lowStockProducts,
    fetchProducts, createProduct, updateProduct, deleteProduct,
    createMovement, fetchMovements, fetchAlerts, fetchDashboard, fetchForecast, reset,
  };
});
