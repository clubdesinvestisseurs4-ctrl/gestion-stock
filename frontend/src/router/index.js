import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import api from '@/config/api';

const routes = [
  { path: '/login', name: 'Login', component: () => import('@/views/LoginView.vue'), meta: { public: true } },
  { path: '/init', name: 'Init', component: () => import('@/views/InitView.vue'), meta: { requiresAuth: true } },
  {
    path: '/',
    component: () => import('@/layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard', name: 'Dashboard', component: () => import('@/views/DashboardView.vue') },
      { path: 'products', name: 'Products', component: () => import('@/views/ProductsView.vue') },
      { path: 'movements', name: 'Movements', component: () => import('@/views/MovementsView.vue') },
      { path: 'alerts', name: 'Alerts', component: () => import('@/views/AlertsView.vue') },
      { path: 'users', name: 'Users', component: () => import('@/views/UsersView.vue'), meta: { adminOnly: true } },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();
  if (authStore.loading) await authStore.init();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) return '/login';
  if (to.meta.public && authStore.isAuthenticated) return '/';
  if (to.meta.adminOnly && !authStore.isAdmin) return '/dashboard';

  // Après login, vérifier que l'utilisateur existe dans Firestore
  if (authStore.isAuthenticated && !authStore.userData && to.name !== 'Init') {
    try {
      const me = await api.get('/me');
      authStore.setUserData(me);
    } catch (e) {
      // L'intercepteur api.js gère la redirection vers /init si needsInit=true
      if (to.name !== 'Init') return '/init';
    }
  }
});

export default router;
