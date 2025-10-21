<template>
  <!-- Usamos el header que ya tienes definido -->
  <header class="header">
    <router-link to="/" class="brand">
      <span class="dot"></span> CINEMA UB
    </router-link>
  </header>

  <div class="container">
    <!-- Estado de carga -->
    <div v-if="loading" class="empty">Loading movie...</div>

    <!-- Estado de error -->
    <div v-else-if="error" class="empty">
      ⚠️ Movie not found.
    </div>
    
    <!-- Contenido cuando la película ha cargado -->
    <div v-else-if="movie" class="movie-details">
      <div class="poster">
        <img :src="API_BASE_URL + movie.poster_path" :alt="`Poster of ${movie.primaryTitle}`" />
      </div>
      <div class="info">
        <h1>{{ movie.primaryTitle }} ({{ movie.startYear }})</h1>
        <p class="description">{{ movie.description }}</p>
        <ul class="stats">
          <li>⭐ Rating: <strong>{{ movie.average_rating }}</strong></li>
          <li>👥 Votes: <strong>{{ movie.numVotes.toLocaleString() }}</strong></li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000';

// 1. Recibimos 'tconst' como una prop gracias a `props: true` en el router
const props = defineProps({
  tconst: {
    type: String,
    required: true,
  },
});

// 2. Definimos las variables de estado
const movie = ref(null);
const loading = ref(true);
const error = ref(null);

// 3. Cuando el componente se monta, llamamos a la API
onMounted(async () => {
  try {
    // Usamos el 'tconst' de las props para construir la URL de la API
    const response = await axios.get(`http://127.0.0.1:8000/movies/${props.tconst}/`);
    movie.value = response.data;
  } catch (err) {
    console.error(err);
    error.value = 'Could not fetch movie details.';
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
/* Estilos específicos para esta vista */
.movie-details {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  padding: 2rem 0;
}

@media (min-width: 768px) {
  .movie-details {
    grid-template-columns: 300px 1fr;
  }
}

.poster img {
  width: 100%;
  border-radius: 12px;
}

.info h1 {
  margin-top: 0;
}

.description {
  color: var(--muted);
  line-height: 1.6;
}

.stats {
  list-style: none;
  padding: 0;
  display: flex;
  gap: 1.5rem;
  font-size: 1.1rem;
}
</style>