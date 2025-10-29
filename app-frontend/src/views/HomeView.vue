<template>
  <header class="header">
    <a href="/" class="brand">
      <span class="dot"></span> CINEMA UB
    </a>
    <div class="actions">
      <router-link to="/login"><button class="ghost">Log in</button></router-link>
    </div>
  </header>


  <div class="container">
    <div v-if="loading" class="empty">Loading movies…</div>
    <div v-else-if="error" class="empty">⚠️ {{ error }}</div>

    <!-- Solo mostramos el contenido si hay películas -->
    <template v-else-if="allMovies.length > 0">
      <!-- La rejilla ahora itera sobre 'paginatedMovies', que es la lista cortada -->
      <div class="grid">
        <MovieCard v-for="movie in paginatedMovies" :key="movie.tconst" :movie="movie" />
      </div>

      <!-- Controles de Paginación -->
      <div class="pagination-controls">
        <button @click="prevPage" :disabled="page === 1" class="ghost">Prev</button>
        <span>
          Page {{ page }} / {{ totalPages }} &middot; Showing {{ fromIndex }}–{{ toIndex }} of {{ allMovies.length }}
        </span>
        <button @click="nextPage" :disabled="page === totalPages">Next</button>
      </div>
    </template>
    
    <div v-else class="empty">No results.</div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'; // 👈 Importa 'computed'
import axios from 'axios';
import MovieCard from '@/components/MovieCard.vue';

// --- ESTADO ---
const allMovies = ref([]); // Almacenará TODAS las películas
const loading = ref(true);
const error = ref(null);
const page = ref(1); // Página actual
const pageSize = ref(10); // Películas por página

// --- LÓGICA DE DATOS ---
onMounted(async () => {
  try {
    const response = await axios.get('http://127.0.0.1:8000/movies/');
    allMovies.value = response.data; // Guardamos la lista completa
  } catch (err) {
    console.error(err);
    error.value = 'Failed to load movies. Please try again later.';
  } finally {
    loading.value = false;
  }
});

// --- PROPIEDADES COMPUTADAS (Se recalculan automáticamente) ---
// Calcula el número total de páginas
const totalPages = computed(() => {
  return Math.ceil(allMovies.value.length / pageSize.value);
});

// Corta el array y devuelve solo las películas para la página actual
const paginatedMovies = computed(() => {
  const startIndex = (page.value - 1) * pageSize.value;
  const endIndex = startIndex + pageSize.value;
  return allMovies.value.slice(startIndex, endIndex);
});

// Para el texto "Showing X-Y of Z"
const fromIndex = computed(() => (page.value - 1) * pageSize.value + 1);
const toIndex = computed(() => Math.min(page.value * pageSize.value, allMovies.value.length));


// --- MÉTODOS (Acciones del usuario) ---
const nextPage = () => {
  if (page.value < totalPages.value) {
    page.value++;
  }
};

const prevPage = () => {
  if (page.value > 1) {
    page.value--;
  }
};
</script>

<style scoped>
/* Estilos para los controles de paginación */
.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
  color: var(--muted);
}
</style>