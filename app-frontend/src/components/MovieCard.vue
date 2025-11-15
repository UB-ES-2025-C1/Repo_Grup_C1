<template>
  <!-- El router-link permite hacer clic en toda la tarjeta -->
  <router-link :to="{ name: 'movie-info', params: { tconst: movie.tconst } }" class="card">
    
    <!-- Usamos v-if para mostrar un póster solo si la ruta existe -->
    <img
      v-if="movie.poster_path"
      :src="getImageUrl(movie.poster_path)" 
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
import { withApiBase } from '@/utils/api';

// El componente recibe el objeto 'movie'
const props = defineProps({
  movie: {
    type: Object,
    required: true,
  },
});

// Funció helper per construir la URL de la imatge
const getImageUrl = (posterPath) => {
  return withApiBase(posterPath);
};
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