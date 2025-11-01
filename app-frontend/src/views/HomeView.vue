<template>
  <header class="header">
    <a href="/" class="brand">
      <span class="dot"></span> CINEMA UB
    </a>
  </header>

  <div class="container">
    <!-- 🔍 Barra de búsqueda -->
    <div class="search-bar">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search movies..."
        class="search-input"
      />
    </div>

    <!-- 🎬 Filtros (solo interfaz visual) -->
    <section class="filters-section">
      <MovieFilter />
    </section>

    <!-- Mensajes de carga o error -->
    <div v-if="loading" class="empty">Loading movies…</div>
    <div v-else-if="error" class="empty">⚠️ {{ error }}</div>

    <!-- Catálogo de películas -->
    <template v-else-if="filteredMovies.length > 0">
      <div class="grid">
        <MovieCard
          v-for="movie in paginatedMovies"
          :key="movie.tconst"
          :movie="movie"
        />
      </div>

      <!-- Controles de paginación -->
      <div class="pagination-controls">
        <button @click="prevPage" :disabled="page === 1" class="ghost">Prev</button>
        <span>
          Page {{ page }} / {{ totalPages }} &middot;
          Showing {{ fromIndex }}–{{ toIndex }} of {{ filteredMovies.length }}
        </span>
        <button @click="nextPage" :disabled="page === totalPages">Next</button>
      </div>
    </template>

    <div v-else class="empty">No results found.</div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import MovieCard from '@/components/MovieCard.vue'
import MovieFilter from '@/components/MovieFilter.vue'

// --- ESTADO ---
const allMovies = ref([])
const loading = ref(true)
const error = ref(null)
const page = ref(1)
const pageSize = ref(10)
const searchQuery = ref('')

// --- LÓGICA DE DATOS ---
onMounted(async () => {
  try {
    const response = await axios.get('http://127.0.0.1:8000/movies/')
    allMovies.value = response.data
  } catch (err) {
    console.error(err)
    error.value = 'Failed to load movies. Please try again later.'
  } finally {
    loading.value = false
  }
})

// --- FILTRADO POR BÚSQUEDA ---
const filteredMovies = computed(() => {
  if (!searchQuery.value.trim()) return allMovies.value
  const q = searchQuery.value.toLowerCase()
  return allMovies.value.filter(m =>
    m.primaryTitle.toLowerCase().includes(q)
  )
})

// --- PAGINACIÓN ---
const totalPages = computed(() =>
  Math.ceil(filteredMovies.value.length / pageSize.value)
)

const paginatedMovies = computed(() => {
  const startIndex = (page.value - 1) * pageSize.value
  const endIndex = startIndex + pageSize.value
  return filteredMovies.value.slice(startIndex, endIndex)
})

const fromIndex = computed(() => (page.value - 1) * pageSize.value + 1)
const toIndex = computed(() =>
  Math.min(page.value * pageSize.value, filteredMovies.value.length)
)

const nextPage = () => {
  if (page.value < totalPages.value) page.value++
}
const prevPage = () => {
  if (page.value > 1) page.value--
}
</script>

<style scoped>
.container {
  width: 100%;
  margin: 0 auto;
  padding: 1rem;
}

/* 🔹 Barra de búsqueda */
.search-bar {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.search-input {
  width: 100%;
  max-width: 600px;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  border: 1px solid #333;
  background-color: #1f2937;
  color: #eaeaea;
  font-size: 1rem;
}

.search-input::placeholder {
  color: #9ca3af;
}

.search-input:focus {
  outline: 2px solid #3b82f6;
}

/* 🔹 Filtros */
.filters-section {
  max-width: 900px;
  margin: 0 auto 2rem auto;
}

/* 🔹 Paginación */
.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
  color: var(--muted);
}

.empty {
  text-align: center;
  margin-top: 3rem;
}
</style>
