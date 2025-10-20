<template>
  <!-- El router-link permite hacer clic en toda la tarjeta -->
  <router-link :to="{ name: 'movie-info', params: { tconst: movie.tconst } }" class="card">
    
    <!-- Usamos v-if para mostrar un póster solo si la ruta existe -->
    <img
      v-if="movie.poster_path"
      :src="API_BASE_URL + movie.poster_path" 
      :alt="`Poster of ${movie.primaryTitle}`"
      loading="lazy"
    />
    <!-- Mostramos un espacio reservado si no hay póster -->
    <div v-else class="poster-placeholder">
      <span>No image</span>
    </div>

    <div class="meta">
      <h3>{{ movie.primaryTitle }} ({{ movie.startYear }})</h3>
      <small>Rating: {{ movie.average_rating }}</small>
    </div>
  </router-link>
</template>

<script setup>
// La URL base de tu backend
const API_BASE_URL = 'http://127.0.0.1:8000';

// El componente recibe el objeto 'movie'
defineProps({
  movie: {
    type: Object,
    required: true,
  },
});
</script>

<style scoped>
/* Un estilo simple para el póster de reserva */
.poster-placeholder {
  aspect-ratio: 2/3;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #1f2937; /* Un gris oscuro */
  color: var(--muted);
  font-size: 0.9rem;
}
</style>