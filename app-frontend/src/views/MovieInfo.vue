<template>
  <header class="header">
    <div class="brand" @click="goHome" style="cursor: pointer;">
      <span class="dot"></span> CINEMA UB
    </div>
  </header>    

  <main class="movie-info" v-if="movie">
    <header class="header">
      <h1>{{ movie.primaryTitle }} ({{ movie.startYear }})</h1>
    </header>

    <section class="content">
      <img
        :src="movie.poster_path"
        :alt="movie.primaryTitle"
        class="poster"
        @error="onError"
      />
      <div class="details">
        <p class="description">{{ movie.description }}</p>
        <ul class="stats">
          <li><strong>⭐ Rating:</strong> {{ movie.average_rating }}</li>
          <li><strong>👥 Votes:</strong> {{ movie.numVotes.toLocaleString() }}</li>
        </ul>
      </div>
    </section>
  </main>

  <section v-else class="empty">
    <p>⚠️ Movie not found.</p>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()  // 👈 necesario para navegar
const movie = ref(null)

onMounted(async () => {
  try {
    const res = await fetch('/reduced_database/movies_enriched.json', { cache: 'no-cache' })
    const data = await res.json()
    movie.value = data.find(m => m.tconst === route.params.tconst)
  } catch (e) {
    console.error('Error loading movie info:', e)
  }
})

function onError(e) {
  e.target.src =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600">
        <rect width="100%" height="100%" fill="#111820"/>
        <text x="50%" y="50%" fill="#7c8aa5" font-family="Arial" font-size="20" text-anchor="middle">No image</text>
      </svg>`
    )
}

// 🔹 Función para volver a Home al hacer clic en CINEMA UB
function goHome() {
  router.push('/')
}
</script>

<style scoped>
.movie-info {
  max-width: 900px;
  margin: 2rem auto;
  padding: 1rem;
  color: #eaeaea;
}

.header {
  margin-bottom: 2rem;
}

.brand:hover {
  opacity: 0.8;
}

h1 {
  font-size: 1.8rem;
  margin: 0;
}

.content {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
}

.poster {
  width: 280px;
  border-radius: 0.75rem;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
  object-fit: cover;
}

.details {
  flex: 1;
  min-width: 240px;
}

.description {
  margin-bottom: 1rem;
  line-height: 1.5;
}

.stats {
  list-style: none;
  padding: 0;
}

.empty {
  text-align: center;
  margin-top: 3rem;
}
</style>
