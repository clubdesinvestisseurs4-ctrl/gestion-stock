<template>
  <div v-if="visible" class="wakeup-banner">
    <div class="wakeup-content">
      <span class="wakeup-spinner">⏳</span>
      <div>
        <strong>Serveur en démarrage...</strong>
        <span>Le serveur se réveille, veuillez patienter {{ elapsed }}s</span>
      </div>
      <button class="retry-btn" @click="$emit('retry')">Réessayer</button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue';

const props = defineProps({ visible: Boolean });
defineEmits(['retry']);

const elapsed = ref(0);
let timer = null;

watch(() => props.visible, (v) => {
  if (v) {
    elapsed.value = 0;
    timer = setInterval(() => elapsed.value++, 1000);
  } else {
    clearInterval(timer);
  }
});

onUnmounted(() => clearInterval(timer));
</script>

<style scoped>
.wakeup-banner {
  position: fixed;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  width: calc(100% - 2rem);
  max-width: 480px;
}
.wakeup-content {
  background: #1f2937;
  color: #fff;
  border-radius: 10px;
  padding: .75rem 1rem;
  display: flex;
  align-items: center;
  gap: .75rem;
  box-shadow: 0 4px 20px rgba(0,0,0,.3);
}
.wakeup-spinner { font-size: 1.3rem; animation: pulse 1.5s infinite; }
.wakeup-content div { flex: 1; display: flex; flex-direction: column; gap: .1rem; }
.wakeup-content strong { font-size: .9rem; }
.wakeup-content span { font-size: .78rem; color: #9ca3af; }
.retry-btn {
  background: #374151; border: none; color: #fff;
  padding: .35rem .75rem; border-radius: 6px; cursor: pointer; font-size: .8rem;
  white-space: nowrap;
}
.retry-btn:hover { background: #4b5563; }
@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.4 } }
</style>
