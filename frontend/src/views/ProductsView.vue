<template>
  <div>
    <div class="page-header">
      <h2 class="page-title">Produits</h2>
      <button class="btn btn-primary" @click="openCreate">+ Ajouter</button>
    </div>

    <!-- Filtres -->
    <div class="card filters">
      <input v-model="search" type="text" placeholder="Rechercher un produit..." />
      <select v-model="categoryFilter">
        <option value="">Toutes les catégories</option>
        <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
      </select>
      <select v-model="stockFilter">
        <option value="">Tous les stocks</option>
        <option value="low">Stock bas uniquement</option>
        <option value="ok">Stock OK</option>
      </select>
    </div>

    <div v-if="stockStore.loading" class="loading">Chargement...</div>

    <div v-else class="card" style="margin-top:.75rem">
      <div v-if="!filteredProducts.length" class="empty-state">
        <span>🗃️</span>
        <p>{{ search ? 'Aucun produit trouvé.' : 'Aucun produit enregistré.' }}</p>
      </div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Produit</th><th>Catégorie</th><th>Stock</th><th>Seuil min</th><th>Unité</th><th>Statut</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in filteredProducts" :key="p.id">
              <td><strong>{{ p.name }}</strong></td>
              <td>{{ p.category }}</td>
              <td :style="p.isLowStock ? 'color:var(--color-danger);font-weight:600' : ''">{{ p.quantity }}</td>
              <td>{{ p.minThreshold }}</td>
              <td>{{ p.unit }}</td>
              <td>
                <span class="badge" :class="p.isLowStock ? 'badge-danger' : 'badge-success'">
                  {{ p.isLowStock ? '⚠️ Stock bas' : '✓ OK' }}
                </span>
              </td>
              <td>
                <div class="action-btns">
                  <button class="btn btn-secondary btn-sm" @click="openMovement(p, 'entree')">↑</button>
                  <button class="btn btn-secondary btn-sm" @click="openMovement(p, 'sortie')">↓</button>
                  <button class="btn btn-secondary btn-sm" @click="openEdit(p)">✏️</button>
                  <button v-if="authStore.isAdmin" class="btn btn-danger btn-sm" @click="confirmDelete(p)">🗑</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Créer/Modifier produit -->
    <div v-if="showProductModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <h3>{{ editingProduct ? 'Modifier le produit' : 'Nouveau produit' }}</h3>
        <form @submit.prevent="saveProduct">
          <div class="form-group">
            <label>Nom *</label>
            <input v-model="form.name" required placeholder="Ex: Farine de blé" />
          </div>
          <div class="form-group">
            <label>Catégorie</label>
            <input v-model="form.category" placeholder="Ex: Épicerie, Boissons..." />
          </div>
          <div class="row-2">
            <div class="form-group">
              <label>Unité *</label>
              <select v-model="form.unit" required>
                <option value="">-- Choisir --</option>
                <option v-for="u in UNITS" :key="u" :value="u">{{ u }}</option>
              </select>
            </div>
            <div class="form-group" v-if="!editingProduct">
              <label>Quantité initiale *</label>
              <input v-model.number="form.quantity" type="number" min="0" step="0.01" required />
            </div>
          </div>
          <div class="form-group">
            <label>Seuil d'alerte minimum *</label>
            <input v-model.number="form.minThreshold" type="number" min="0" step="0.01" required />
          </div>
          <div v-if="formError" class="alert-banner danger" style="margin-bottom:.75rem">{{ formError }}</div>
          <div style="display:flex;gap:.5rem;justify-content:flex-end">
            <button type="button" class="btn btn-secondary" @click="closeModal">Annuler</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Mouvement -->
    <div v-if="showMovementModal" class="modal-overlay" @click.self="showMovementModal = false">
      <div class="modal">
        <h3>{{ movementType === 'entree' ? '↑ Entrée de stock' : '↓ Sortie de stock' }}</h3>
        <p style="margin-bottom:.5rem;color:var(--text-muted)">
          Produit : <strong>{{ movementProduct?.name }}</strong>
        </p>
        <div class="stock-disponible" :class="{ 'low': movementProduct?.isLowStock }">
          Stock disponible : <strong>{{ movementProduct?.quantity }} {{ movementProduct?.unit }}</strong>
          <span v-if="movementProduct?.isLowStock" class="badge badge-danger" style="margin-left:.5rem">Stock bas</span>
        </div>
        <form @submit.prevent="saveMovement" style="margin-top:.75rem">
          <div class="form-group">
            <label>Quantité *</label>
            <input v-model.number="movementQty" type="number" min="0.01" step="0.01" required autofocus />
          </div>
          <!-- Alerte insuffisance : affichée instantanément, avant soumission -->
          <div v-if="movementType === 'sortie' && movementQty > 0 && movementQty > (movementProduct?.quantity ?? 0)"
               class="alert-banner danger" style="margin-bottom:.75rem">
            ⛔ Quantité insuffisante — disponible : <strong>{{ movementProduct?.quantity }} {{ movementProduct?.unit }}</strong>
          </div>
          <div v-else-if="movementType === 'sortie' && movementQty > 0 && movementProduct?.quantity - movementQty <= movementProduct?.minThreshold"
               class="alert-banner warning" style="margin-bottom:.75rem">
            ⚠️ Cette sortie passera le stock sous le seuil d'alerte ({{ movementProduct?.minThreshold }} {{ movementProduct?.unit }}).
          </div>
          <div class="form-group">
            <label>Note (optionnel)</label>
            <input v-model="movementNote" placeholder="Ex: Livraison du 17/06, usage cuisine..." />
          </div>
          <div v-if="movementError" class="alert-banner danger" style="margin-bottom:.75rem">{{ movementError }}</div>
          <div v-if="movementResult" class="alert-banner" :class="movementResult.alert ? 'warning' : 'success'" style="margin-bottom:.75rem">
            {{ movementResult.alert ? movementResult.alert.message : '✓ Stock mis à jour.' }}
          </div>
          <div style="display:flex;gap:.5rem;justify-content:flex-end">
            <button type="button" class="btn btn-secondary" @click="showMovementModal = false">Fermer</button>
            <button
              v-if="!movementResult"
              type="submit"
              class="btn"
              :class="movementType === 'entree' ? 'btn-primary' : 'btn-danger'"
              :disabled="saving || (movementType === 'sortie' && movementQty > (movementProduct?.quantity ?? 0))"
            >
              {{ saving ? '...' : (movementType === 'entree' ? '↑ Ajouter' : '↓ Retrancher') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Confirm delete -->
    <div v-if="deletingProduct" class="modal-overlay" @click.self="deletingProduct = null">
      <div class="modal">
        <h3>Supprimer le produit</h3>
        <p style="margin:.75rem 0">Voulez-vous supprimer <strong>{{ deletingProduct.name }}</strong> ? Cette action est irréversible.</p>
        <div style="display:flex;gap:.5rem;justify-content:flex-end">
          <button class="btn btn-secondary" @click="deletingProduct = null">Annuler</button>
          <button class="btn btn-danger" @click="doDelete" :disabled="saving">{{ saving ? '...' : 'Supprimer' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useStockStore } from '@/stores/stock';
import { useEstablishmentStore } from '@/stores/establishment';
import { useAuthStore } from '@/stores/auth';

const UNITS = ['kg', 'g', 'L', 'cl', 'ml', 'pièce', 'carton', 'lot', 'bouteille', 'sachet'];

const stockStore = useStockStore();
const estStore = useEstablishmentStore();
const authStore = useAuthStore();

const search = ref('');
const categoryFilter = ref('');
const stockFilter = ref('');

const showProductModal = ref(false);
const showMovementModal = ref(false);
const editingProduct = ref(null);
const deletingProduct = ref(null);
const saving = ref(false);
const formError = ref('');

const form = ref({ name: '', category: '', unit: '', quantity: 0, minThreshold: 0 });

const movementProduct = ref(null);
const movementType = ref('entree');
const movementQty = ref(1);
const movementNote = ref('');
const movementError = ref('');
const movementResult = ref(null);

const categories = computed(() => [...new Set(stockStore.products.map(p => p.category).filter(Boolean))].sort());

const filteredProducts = computed(() => {
  let list = stockStore.products;
  if (search.value) list = list.filter(p => p.name.toLowerCase().includes(search.value.toLowerCase()));
  if (categoryFilter.value) list = list.filter(p => p.category === categoryFilter.value);
  if (stockFilter.value === 'low') list = list.filter(p => p.isLowStock);
  if (stockFilter.value === 'ok') list = list.filter(p => !p.isLowStock);
  return list;
});

function openCreate() {
  editingProduct.value = null;
  form.value = { name: '', category: '', unit: '', quantity: 0, minThreshold: 0 };
  formError.value = '';
  showProductModal.value = true;
}

function openEdit(product) {
  editingProduct.value = product;
  form.value = { name: product.name, category: product.category, unit: product.unit, minThreshold: product.minThreshold };
  formError.value = '';
  showProductModal.value = true;
}

function closeModal() {
  showProductModal.value = false;
  editingProduct.value = null;
}

async function saveProduct() {
  formError.value = '';
  saving.value = true;
  try {
    if (editingProduct.value) {
      await stockStore.updateProduct(estStore.currentId, editingProduct.value.id, form.value);
    } else {
      await stockStore.createProduct(estStore.currentId, form.value);
    }
    closeModal();
  } catch (e) {
    formError.value = e.message;
  } finally {
    saving.value = false;
  }
}

function openMovement(product, type) {
  movementProduct.value = product;
  movementType.value = type;
  movementQty.value = 1;
  movementNote.value = '';
  movementError.value = '';
  movementResult.value = null;
  showMovementModal.value = true;
}

async function saveMovement() {
  movementError.value = '';
  saving.value = true;
  try {
    const result = await stockStore.createMovement(estStore.currentId, {
      productId: movementProduct.value.id,
      type: movementType.value,
      quantity: movementQty.value,
      note: movementNote.value,
    });
    movementResult.value = result;
    movementProduct.value = stockStore.products.find(p => p.id === movementProduct.value.id);
  } catch (e) {
    movementError.value = e.message;
  } finally {
    saving.value = false;
  }
}

function confirmDelete(product) {
  deletingProduct.value = product;
}

async function doDelete() {
  saving.value = true;
  try {
    await stockStore.deleteProduct(estStore.currentId, deletingProduct.value.id);
    deletingProduct.value = null;
  } catch (e) {
    alert(e.message);
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  if (!stockStore.products.length) {
    await stockStore.fetchProducts(estStore.currentId);
  }
});
</script>

<style scoped>
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
.page-title { font-size: 1.2rem; font-weight: 700; }
.filters { display: flex; gap: .75rem; flex-wrap: wrap; margin-bottom: .75rem; }
.filters input, .filters select { flex: 1; min-width: 160px; padding: .45rem .7rem; border: 1px solid var(--color-gray-200); border-radius: var(--radius); font-size: .875rem; }
.action-btns { display: flex; gap: .3rem; }
.row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
.alert-banner.success { background: #d1fae5; border-left: 4px solid var(--color-success); }
.stock-disponible {
  font-size: .875rem;
  padding: .4rem .75rem;
  background: var(--color-gray-100);
  border-radius: var(--radius);
  color: var(--text-muted);
  display: flex; align-items: center; flex-wrap: wrap; gap: .3rem;
}
.stock-disponible.low { background: #fee2e2; color: #991b1b; }
</style>
