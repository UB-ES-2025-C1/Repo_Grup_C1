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
      <div v-if="filtered.length === 0" class="empty">No results.</div>
      <div class="grid" v-else>
        <MovieCard v-for="m in filtered" :key="m.tconst" :movie="m" />
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import MovieCard from '@/components/MovieCard.vue'

const loading = ref(true)
const error = ref('')
const movies = ref([])
const q = ref('')

const filtered = computed(() => {
  const term = q.value.trim().toLowerCase()
  if (!term) return movies.value
  return movies.value.filter(m => {
    return (m.primaryTitle || '').toLowerCase().includes(term)
        || String(m.startYear || '').includes(term)
  })
})

function onSearch(){ /* placeholder (debounce si quieres) */ }

onMounted(async () => {
  try {
    // Ruta directa al JSON (ajústala según la carpeta real)
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
