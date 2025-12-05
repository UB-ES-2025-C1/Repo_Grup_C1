<template>
  <div class="card-wrapper">
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
        <p class="rating"><span class="label">Rating:</span> <span class="value">{{ rating.overall_score }}</span></p>
        <p v-if="rating.comment" class="comment">"{{ rating.comment }}"</p>
        
        <!-- Ver respuestas button inside card -->
        <router-link 
          :to="{ name: 'comment-replies', params: { tconst: rating.movie_info.tconst, comment: 'comment', comment_id: rating.id } }"
          class="replies-link"
          @click.stop
        >
          <span class="blue-link">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chat-icon">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            {{ rating.reply_count || 0 }}
          </span>
        </router-link>
      </div>
    </router-link>
  </div>
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
.card-wrapper {
  display: flex;
  flex-direction: column;
  width: 400px;
}

.card {
  display: flex;
  width: 100%;
  position: relative;
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

.meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 1rem;
  position: relative;
}

/* Estilo para que el comentario aparezca en cursiva */
.comment {
  font-style: italic;
  margin-bottom: auto;
}

/* Make the label muted and the numeric rating bold like in CommentCard */
.meta .rating { color: var(--muted); margin: 0.5rem 0; }
.meta .rating .value { color: var(--text); font-weight: 700; }

.replies-link {
  text-decoration: none;
  font-size: 0.95rem;
  align-self: flex-end;
  margin-top: auto;
  padding-top: 0.5rem;
}

.blue-link {
  color: #3b82f6;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.blue-link:hover {
  color: #1d4ed8;
  text-decoration: underline;
}

.chat-icon {
  display: inline-block;
  vertical-align: middle;
}
</style>