<template>
  <header class="header">
    <a href="/" class="brand">
      <span class="dot"></span> CINEMA UB
    </a>
    <div class="actions">
      <router-link to="/login"><button class="ghost">Log in</button></router-link>
    </div>
    <div class="actions">
      <router-link to="/register"><button>Sign up</button></router-link>
    </div>
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

    <!-- 🎬 Filtros -->
    <section class="filters-section">
      <MovieFilter
        :genres="availableGenres"
        :years="availableYears"
        @applyFilters="applyFilters"
      />
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
import { withApiBase } from '@/utils/api'
import MovieCard from '@/components/MovieCard.vue'
import MovieFilter from '@/components/MovieFilter.vue'

// --- ESTADO ---
const allMovies = ref([])
const loading = ref(true)
const error = ref(null)
const page = ref(1)
const pageSize = ref(10)
const searchQuery = ref('')
const selectedFilters = ref({
  sortBy: 'rating',
  order: 'desc'
})

// --- CARGAR DATOS ---
onMounted(async () => {
  try {
    const response = await axios.get(withApiBase('/movies/'))
    allMovies.value = response.data
  } catch (err) {
    console.error(err)
    error.value = 'Failed to load movies. Please try again later.'
  } finally {
    loading.value = false
  }
})

// --- GENERAR LISTAS DINÁMICAS ---
const availableGenres = computed(() => {
  const genres = new Set()
  allMovies.value.forEach(movie => {
    if (movie.genres && Array.isArray(movie.genres)) {
      movie.genres.forEach(g => genres.add(g.trim()))
    }
  })
  return Array.from(genres).sort()
})

const availableYears = computed(() => {
  const years = allMovies.value
    .map(m => parseInt(m.startYear))
    .filter(y => !isNaN(y))
  if (years.length === 0) return []
  const min = Math.min(...years)
  const max = Math.max(...years)
  return Array.from({ length: max - min + 1 }, (_, i) => max - i)
})

// --- FILTRADO ---
const filteredMovies = computed(() => {
  let result = allMovies.value

  // 🔹 Búsqueda
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(m => m.primaryTitle.toLowerCase().includes(q))
  }

  // 🔹 Filtros
  if (selectedFilters.value.genre) {
    result = result.filter(m => m.genres?.includes(selectedFilters.value.genre))
  }
  if (selectedFilters.value.year) {
    result = result.filter(m => m.startYear == selectedFilters.value.year)
  }
  if (selectedFilters.value.director) {
    result = result.filter(m =>
      m.director?.toLowerCase().includes(selectedFilters.value.director.toLowerCase())
    )
  }
  if (selectedFilters.value.actor) {
    result = result.filter(m =>
      m.actors?.some(a =>
        a.toLowerCase().includes(selectedFilters.value.actor.toLowerCase())
      )
    )
  }

  // 🔹 Ordenar
  if (selectedFilters.value.sortBy === 'rating') {
    result = [...result].sort((a, b) => {
      const valA = a.average_rating || 0
      const valB = b.average_rating || 0
      return selectedFilters.value.order === 'asc' ? valA - valB : valB - valA
    })
  } else if (selectedFilters.value.sortBy === 'title') {
    result = [...result].sort((a, b) => {
      const tA = a.primaryTitle?.toLowerCase() || ''
      const tB = b.primaryTitle?.toLowerCase() || ''
      return selectedFilters.value.order === 'asc'
        ? tA.localeCompare(tB)
        : tB.localeCompare(tA)
    })
  } else if (selectedFilters.value.sortBy === 'popularity') {
    result = [...result].sort((a, b) => {
      const valA = a.numVotes || 0
      const valB = b.numVotes || 0
      return selectedFilters.value.order === 'asc' ? valA - valB : valB - valA
    })
  }

  return result
})

// --- APLICAR FILTROS ---
function applyFilters(filters) {
  selectedFilters.value = filters
  page.value = 1
}

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
