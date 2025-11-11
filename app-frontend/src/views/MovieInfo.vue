<template>
  <AppHeader />

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
        <!-- Preview the user's existing rating if available -->
        <div v-if="hasUserRating && ratingPreview" class="user-rating-preview">
          <h3>Your rating</h3>
          <div class="preview-row">
            <p class="overall">Overall: {{ ratingPreview.overall_score }}</p>
            <div class="mini-stats">
              <span>Soundtrack: {{ ratingPreview.soundtrack }}</span>
              <span>Acting: {{ ratingPreview.acting }}</span>
              <span>Cinematography: {{ ratingPreview.cinematography }}</span>
              <span>Plot: {{ ratingPreview.plot }}</span>
            </div>
          </div>
          <p v-if="ratingPreview.comment" class="comment">"{{ ratingPreview.comment }}"</p>
        </div>
        <div class="actions" style="margin-top:1rem">
          <router-link :to="{ name: 'movie-rate', params: { tconst: movie.tconst } }">
            <button>{{ hasUserRating ? 'Change Rating' : 'Rate' }}</button>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import AppHeader from '@/components/AppHeader.vue'
import axios from 'axios';
import { getApiBaseUrl, withApiBase } from '@/utils/api';

const API_BASE_URL = getApiBaseUrl();

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
const hasUserRating = ref(false);
const ratingPreview = ref(null);

// 3. Cuando el componente se monta, llamamos a la API
onMounted(async () => {
  try {
    // Usamos el 'tconst' de las props para construir la URL de la API
    const response = await axios.get(withApiBase(`/movies/${props.tconst}/`));
    movie.value = response.data;
    // Check if authenticated user already has a rating for this movie
    try {
      const token = localStorage.getItem('access');
      if (token) {
        const ratingResp = await axios.get(withApiBase(`/movies/ratings/${props.tconst}/`), {
          headers: { Authorization: `Bearer ${token}` }
        });
        // store preview data
        ratingPreview.value = ratingResp.data;
        hasUserRating.value = true;
      } else {
        hasUserRating.value = false;
      }
      } catch (ratingErr) {
      if (ratingErr.response && ratingErr.response.status === 404) {
        hasUserRating.value = false;
      } else {
        // other errors (401 etc.) -> treat as not rated, do not redirect
        hasUserRating.value = false;
      }
    }
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

.user-rating-preview {
  margin-top: 3rem;
  padding: .75rem;
  background: var(--card);
  border-radius: 8px;
}
.user-rating-preview h3 { margin: 0 0 1rem; }
.preview-row { display:flex; flex-direction: column; gap: .5rem; align-items: flex-start; }
.overall { margin:0; font-weight:600; }
.mini-stats { display:flex; gap: .7rem; flex-wrap:wrap; color: var(--muted); }
.mini-stats span { background: transparent; padding: .15rem 0rem; border-radius: 6px; font-size: .95rem }
.user-rating-preview .comment { margin-top:1rem; color: var(--text); font-style: italic }
</style>