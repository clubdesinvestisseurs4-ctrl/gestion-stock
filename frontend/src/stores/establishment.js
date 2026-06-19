import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import cookafricaLogo from '@/assets/logo-cookafrica.png';

const ESTABLISHMENTS = [
  { id: 'cookafrica', name: 'CookAfrica', icon: '🍽️', logo: cookafricaLogo, color: '#e67e22' },
  { id: 'ohinene', name: 'Hôtel Ohinéné', icon: '🏨', color: '#1a6b3c' },
];

export const useEstablishmentStore = defineStore('establishment', () => {
  const currentId = ref(localStorage.getItem('currentEstablishment') || 'cookafrica');

  const current = computed(() => ESTABLISHMENTS.find(e => e.id === currentId.value));
  const all = computed(() => ESTABLISHMENTS);

  function switchTo(id) {
    currentId.value = id;
    localStorage.setItem('currentEstablishment', id);
  }

  return { currentId, current, all, switchTo };
});
