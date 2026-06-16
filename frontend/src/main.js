import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth';
import './assets/style.css';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

// Initialiser l'auth avant de monter l'app
const authStore = useAuthStore();
authStore.init().then(() => {
  app.mount('#app');
});
