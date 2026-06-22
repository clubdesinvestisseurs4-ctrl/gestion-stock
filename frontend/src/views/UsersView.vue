<template>
  <div>
    <div class="page-header">
      <h2 class="page-title">Gestion des utilisateurs</h2>
      <button class="btn btn-primary" @click="showCreateModal = true">+ Ajouter</button>
    </div>

    <div v-if="loading" class="loading">Chargement...</div>

    <div v-else class="card">
      <div v-if="!users.length" class="empty-state">
        <span>👥</span>
        <p>Aucun utilisateur.</p>
      </div>
      <div v-else class="table-wrap">
        <table class="card-table">
          <thead>
            <tr><th>Email</th><th>Nom</th><th>Rôle</th><th>Établissement</th><th>Créé le</th><th>Actions</th></tr>
          </thead>
          <TransitionGroup tag="tbody" name="list">
            <tr v-for="u in users" :key="u.uid">
              <td><strong>{{ u.email }}</strong></td>
              <td data-label="Nom">{{ u.displayName || '—' }}</td>
              <td data-label="Rôle">
                <span class="badge" :class="u.role === 'admin' ? 'badge-info' : 'badge-success'">
                  {{ u.role === 'admin' ? 'Admin' : 'Opérateur' }}
                </span>
              </td>
              <td data-label="Établissement">{{ getEstablishmentName(u.establishmentId) }}</td>
              <td data-label="Créé le" style="font-size:.8rem;color:var(--color-gray-400)">{{ formatDate(u.createdAt) }}</td>
              <td data-label="Actions">
                <button
                  v-if="u.uid !== authStore.user?.uid"
                  class="btn btn-danger btn-sm"
                  @click="confirmDelete(u)"
                >🗑 Supprimer</button>
              </td>
            </tr>
          </TransitionGroup>
        </table>
      </div>
    </div>

    <!-- Modal créer utilisateur -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal">
        <h3>Nouvel utilisateur</h3>
        <form @submit.prevent="createUser">
          <div class="form-group">
            <label>Email *</label>
            <input v-model="form.email" type="email" required placeholder="utilisateur@email.com" />
          </div>
          <div class="form-group">
            <label>Nom d'affichage</label>
            <input v-model="form.displayName" placeholder="Prénom Nom" />
          </div>
          <div class="form-group">
            <label>Mot de passe *</label>
            <input v-model="form.password" type="password" required minlength="6" />
          </div>
          <div class="form-group">
            <label>Rôle *</label>
            <select v-model="form.role" required>
              <option value="operator">Opérateur</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div v-if="form.role === 'operator'" class="form-group">
            <label>Établissement *</label>
            <select v-model="form.establishmentId" required>
              <option value="cookafrica">CookAfrica</option>
              <option value="ohinene">Hôtel Ohinéné</option>
            </select>
          </div>
          <div v-if="formError" class="alert-banner danger" style="margin-bottom:.75rem">{{ formError }}</div>
          <div style="display:flex;gap:.5rem;justify-content:flex-end">
            <button type="button" class="btn btn-secondary" @click="showCreateModal = false">Annuler</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? '...' : 'Créer' }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Confirm delete -->
    <div v-if="deletingUser" class="modal-overlay" @click.self="deletingUser = null">
      <div class="modal">
        <h3>Supprimer l'utilisateur</h3>
        <p style="margin:.75rem 0">Supprimer <strong>{{ deletingUser.email }}</strong> ?</p>
        <div style="display:flex;gap:.5rem;justify-content:flex-end">
          <button class="btn btn-secondary" @click="deletingUser = null">Annuler</button>
          <button class="btn btn-danger" @click="doDelete" :disabled="saving">{{ saving ? '...' : 'Supprimer' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import api from '@/config/api';

const authStore = useAuthStore();

const users = ref([]);
const loading = ref(false);
const showCreateModal = ref(false);
const deletingUser = ref(null);
const saving = ref(false);
const formError = ref('');

const form = ref({ email: '', displayName: '', password: '', role: 'operator', establishmentId: 'cookafrica' });

const ESTABLISHMENTS = { cookafrica: 'CookAfrica', ohinene: 'Hôtel Ohinéné' };
function getEstablishmentName(id) { return id ? (ESTABLISHMENTS[id] || id) : 'Tous'; }

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR');
}

async function loadUsers() {
  loading.value = true;
  try { users.value = await api.get('/users'); }
  catch (e) { console.error(e); }
  finally { loading.value = false; }
}

async function createUser() {
  formError.value = '';
  saving.value = true;
  try {
    const newUser = await api.post('/users', form.value);
    users.value.push(newUser);
    showCreateModal.value = false;
    form.value = { email: '', displayName: '', password: '', role: 'operator', establishmentId: 'cookafrica' };
  } catch (e) {
    formError.value = e.message;
  } finally {
    saving.value = false;
  }
}

function confirmDelete(user) { deletingUser.value = user; }

async function doDelete() {
  saving.value = true;
  try {
    await api.delete(`/users/${deletingUser.value.uid}`);
    users.value = users.value.filter(u => u.uid !== deletingUser.value.uid);
    deletingUser.value = null;
  } catch (e) { alert(e.message); }
  finally { saving.value = false; }
}

onMounted(loadUsers);
</script>

<style scoped>
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
.page-title { font-size: 1.2rem; font-weight: 700; }
</style>
