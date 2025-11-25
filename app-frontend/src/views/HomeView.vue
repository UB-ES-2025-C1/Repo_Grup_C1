<template>
  <AppHeader />

  <div class="container">
    <!-- 🔍 Barra de búsqueda -->
    <div class="search-bar">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search movies or users..."
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

    <!-- Catálogo de películas y usuarios -->
    <template v-else>
      <!-- 🔹 Si hay texto en la búsqueda -->
      <template v-if="searchQuery.trim()">
        <!-- Movies -->
        <div v-if="filteredMovies.length">
          <h2>Movies</h2>
          <div class="grid">
            <MovieCard
              v-for="movie in paginatedMovies"
              :key="movie.tconst"
              :movie="movie"
            />
          </div>
        </div>

        <!-- Users -->
        <div v-if="filteredUsers.length" style="margin-top: 2rem;">
          <h2>Users</h2>
          <div class="grid">
            <UserCard
              v-for="user in filteredUsers"
              :key="user.username"
              :user="user"
            />
          </div>
        </div>

        <div v-if="!filteredMovies.length && !filteredUsers.length" class="empty">
          No results found.
        </div>
      </template>

      <!-- 🔹 Si no hay texto, mostramos solo películas como antes -->
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
    </template>
  </div>
</template>

<script setup>
import AppHeader from '@/components/AppHeader.vue'
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { withApiBase } from '@/utils/api'
import MovieCard from '@/components/MovieCard.vue'
import UserCard from '@/components/UserCard.vue'
import MovieFilter from '@/components/MovieFilter.vue'

// --- ESTADO ---
const allMovies = ref([])
const allUsers = ref([])
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
  loading.value = true
  try {
    const moviesRes = await axios.get(withApiBase('/movies/'))
    allMovies.value = Array.isArray(moviesRes.data) ? moviesRes.data : []
  } catch (err) {
    console.error('Error loading movies:', err)
    error.value = 'Failed to load movies. Please try again later.'
    allMovies.value = []
  }

  try {
    const usersRes = await axios.get(withApiBase('/api/users/'))
    allUsers.value = Array.isArray(usersRes.data) ? usersRes.data : []
  } catch (err) {
    console.error('Error loading users:', err)
    allUsers.value = []
  } finally {
    loading.value = false
  }
})

// --- GENERAR LISTAS DINÁMICAS ---
const availableGenres = computed(() => {
  if (!Array.isArray(allMovies.value)) {
    return []
  }
  const genres = new Set()
  allMovies.value.forEach(movie => {
    if (movie.genres && Array.isArray(movie.genres)) {
      movie.genres.forEach(g => genres.add(g.trim()))
    }
  })
  return Array.from(genres).sort()
})

const availableYears = computed(() => {
  if (!Array.isArray(allMovies.value)) {
    return []
  }
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
  if (!Array.isArray(allMovies.value)) {
    return []
  }
  let result = allMovies.value

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(m => m.primaryTitle?.toLowerCase().includes(q))
  }

  if (selectedFilters.value.genre) {
    result = result.filter(m => m.genres?.includes(selectedFilters.value.genre))
  }
  if (selectedFilters.value.year) {
    result = result.filter(m => m.startYear == selectedFilters.value.year)
  }
  if (selectedFilters.value.director) {
    result = result.filter(m =>
      m.director?.toLowerCase().includes(selectedFilters.value.director?.toLowerCase() || '')
    )
  }
  if (selectedFilters.value.actor) {
    result = result.filter(m =>
      m.actors?.some(a =>
        a?.toLowerCase().includes(selectedFilters.value.actor?.toLowerCase() || '')
      )
    )
  }

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

// --- FILTRADO USUARIOS ---
const filteredUsers = computed(() => {
  if (!searchQuery.value.trim()) return []
  if (!Array.isArray(allUsers.value)) {
    return []
  }
  const q = searchQuery.value.toLowerCase()

  return allUsers.value
    .filter(u => u.username?.toLowerCase().includes(q))
    .sort((a, b) => (a.username || '').localeCompare(b.username || ''))
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
