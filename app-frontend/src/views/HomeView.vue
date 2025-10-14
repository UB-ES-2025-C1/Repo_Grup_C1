<template>
  <header class="header">
    <div class="brand">
      <span class="dot"></span> CINEMA UB
    </div>
  </header>

  <main class="container">
    <div class="searchBar">
      <input
        v-model="q"
        type="search"
        placeholder="Search by title or year…"
        @input="onSearch"
      />
    </div>

    <section v-if="loading" class="empty">Loading movies…</section>
    <section v-else-if="error" class="empty">⚠️ {{ error }}</section>

    <section v-else>
      <div v-if="sortedMovies.length === 0" class="empty">No results.</div>

      <template v-else>
        <div class="grid">
          <MovieCard v-for="m in paginated" :key="m.tconst" :movie="m" />
        </div>

        <!-- footer de paginación -->
        <div class="pagination">
          <button class="ghost" :disabled="page === 1" @click="prevPage">Prev</button>
          <span class="pageInfo">
            Page {{ page }} / {{ totalPages }}
            <small>· Showing {{ fromIndex }}–{{ toIndex }} of {{ sortedMovies.length }}</small>
          </span>
          <button :disabled="page === totalPages" @click="nextPage">Next</button>
        </div>
      </template>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import MovieCard from '@/components/MovieCard.vue'

const loading = ref(true)
const error = ref('')
const movies = ref([])

const q = ref('')
const page = ref(1)
const pageSize = 10

// Normaliza y obtiene el rating numérico (acepta average_rating o averageRating)
function getNumericRating(m) {
  const raw = m.average_rating ?? m.averageRating ?? null
  const n = parseFloat(raw)
  return Number.isFinite(n) ? n : 0
}

// 1) Filtrado por búsqueda
const filtered = computed(() => {
  const term = q.value.trim().toLowerCase()
  if (!term) return movies.value
  return movies.value.filter(m =>
    (m.primaryTitle || '').toLowerCase().includes(term) ||
    String(m.startYear || '').includes(term)
  )
})

// 2) Orden por rating (desc). Si empate, desempata por numVotes desc y título asc.
const sortedMovies = computed(() => {
  const arr = [...filtered.value]
  return arr.sort((a, b) => {
    const ra = getNumericRating(a)
    const rb = getNumericRating(b)
    if (rb !== ra) return rb - ra
    const va = parseInt(a.numVotes ?? a.numvotes ?? 0, 10) || 0
    const vb = parseInt(b.numVotes ?? b.numvotes ?? 0, 10) || 0
    if (vb !== va) return vb - va
    return String(a.primaryTitle || '').localeCompare(String(b.primaryTitle || ''))
  })
})

// 3) Paginación
const totalPages = computed(() => Math.max(1, Math.ceil(sortedMovies.value.length / pageSize)))
const paginated = computed(() => {
  const start = (page.value - 1) * pageSize
  return sortedMovies.value.slice(start, start + pageSize)
})
const fromIndex = computed(() => (sortedMovies.value.length ? (page.value - 1) * pageSize + 1 : 0))
const toIndex = computed(() => Math.min(page.value * pageSize, sortedMovies.value.length))

function nextPage() { if (page.value < totalPages.value) page.value++ }
function prevPage() { if (page.value > 1) page.value-- }

// Reinicia a página 1 al cambiar la búsqueda
watch(q, () => { page.value = 1 })

function onSearch(){ /* debounce opcional */ }

onMounted(async () => {
  try {
    // Ajusta la ruta a tu JSON (ya lo tenías así)
    const res = await fetch('/reduced_database/movies_enriched.json', { cache: 'no-cache' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    movies.value = await res.json()
  } catch (e) {
    console.error('Dataset load error:', e)
    error.value = e.message || 'Unknown error'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
/* paginación básica */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: .75rem;
  margin: 1.5rem 0 2rem;
}

.pagination .pageInfo {
  color: var(--muted);
}

button[disabled] {
  opacity: .5;
  cursor: not-allowed;
}
</style>
