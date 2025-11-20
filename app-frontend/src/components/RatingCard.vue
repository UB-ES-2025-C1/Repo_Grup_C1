<template>
  <!-- El router-link permite hacer clic en toda la tarjeta -->
  <router-link :to="{ name: 'movie-info', params: { tconst: rating.movie_info.tconst } }" class="card">

    <div class="poster">
      <!-- Mostrar el poster si la ruta existe -->
      <img
        v-if="rating.movie_info.poster_path"
        :src="getImageUrl(rating.movie_info.poster_path)"
        :alt="`Poster of ${rating.movie_info.primary_title}`"
        loading="lazy"
      />

      <!-- Placeholder si no hay poster -->
      <div v-else class="poster-placeholder">
        <span>No image</span>
      </div>
    </div>

    <div class="meta">
      <h3>{{ rating.movie_info.primary_title }} ({{ rating.movie_info.start_year }})</h3>
      <p>Rating: {{ rating.overall_score }}</p>
      <p v-if="rating.comment" class="comment">"{{ rating.comment }}"</p>
    </div>
  </router-link>
</template>

<script setup>
import { withApiBase } from '@/utils/api';

const props = defineProps({
  rating: {
    type: Object,
    required: true,
  },
});

// Helper para construir la URL del poster
const getImageUrl = (posterPath) => {
  return withApiBase(posterPath);
};
</script>

<style scoped>
.card {
  display: flex;
  width: 400px;
}

.poster {
  flex-shrink: 0;
  width: 200px;
}

.poster img {
  width: 100%;
  height: auto;
  border-radius: 4px;
}

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