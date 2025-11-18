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
        <img :src="getImageUrl(movie.poster_path)" :alt="`Poster of ${movie.primaryTitle}`" />
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
                  <button>{{ hasUserRating ? 'Change rating' : 'Rate' }}</button>
                </router-link>
                <!-- Delete button shown when the user already has a rating -->
                <button v-if="hasUserRating" class="ghost" @click="deleteRating" style="margin-left:.5rem">Delete rating</button>
                <!-- Delete comment button shown when the user has a comment on their rating -->
                <button v-if="hasUserRating && ratingPreview && ratingPreview.comment" class="ghost" @click="deleteComment" style="margin-left:.5rem">Delete comment</button>
        </div>
              <p v-if="deleteSuccess" class="success" style="margin-top:.5rem">{{ deleteSuccess }}</p>
              <p v-if="deleteError" class="error" style="margin-top:.5rem">{{ deleteError }}</p>
              <p v-if="commentDeleteSuccess" class="success" style="margin-top:.5rem">{{ commentDeleteSuccess }}</p>
              <p v-if="commentDeleteError" class="error" style="margin-top:.5rem">{{ commentDeleteError }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import AppHeader from '@/components/AppHeader.vue'
import axios from 'axios';
import { withApiBase } from '@/utils/api';

// Funció helper per construir la URL de la imatge
const getImageUrl = (posterPath) => {
  return withApiBase(posterPath);
};

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
const deleteError = ref(null);
const deleteSuccess = ref(null);
const commentDeleteError = ref(null);
const commentDeleteSuccess = ref(null);

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

async function deleteRating() {
  deleteError.value = null;
  deleteSuccess.value = null;

  // confirmation dialog
  const confirmed = window.confirm('Are you sure you want to delete your rating? This action cannot be undone.');
  if (!confirmed) return;

  const token = localStorage.getItem('access');
  if (!token) {
    deleteError.value = 'Not authenticated.';
    return;
  }

  try {
    await axios.delete(withApiBase(`/movies/ratings/${props.tconst}/`), {
      headers: { Authorization: `Bearer ${token}` }
    });

    deleteSuccess.value = '';
    hasUserRating.value = false;
    ratingPreview.value = null;

    // Refresh movie data to update numVotes / average_rating
    try {
      const resp = await axios.get(withApiBase(`/movies/${props.tconst}/`));
      movie.value = resp.data;
    } catch (fetchErr) {
      console.warn('Could not refresh movie after delete', fetchErr);
    }
  } catch (err) {
    console.error(err);
    if (err.response && err.response.data) {
      deleteError.value = err.response.data.detail || JSON.stringify(err.response.data);
    } else {
      deleteError.value = 'Error deleting rating.';
    }
  }
}

async function deleteComment() {
  commentDeleteError.value = null;
  commentDeleteSuccess.value = null;

  const confirmed = window.confirm('Are you sure you want to delete your comment from your rating?');
  if (!confirmed) return;

  const token = localStorage.getItem('access');
  if (!token) {
    commentDeleteError.value = 'Not authenticated.';
    return;
  }

  // Build payload using existing rating preview values, but with empty comment
  const payload = {
    movie: props.tconst,
    overall_score: ratingPreview.value?.overall_score ?? 0,
    soundtrack: ratingPreview.value?.soundtrack ?? 0,
    acting: ratingPreview.value?.acting ?? 0,
    cinematography: ratingPreview.value?.cinematography ?? 0,
    plot: ratingPreview.value?.plot ?? 0,
    comment: ''
  };

  try {
    await axios.post(withApiBase(`/movies/ratings/`), payload, {
      headers: { Authorization: `Bearer ${token}` }
    });

    commentDeleteSuccess.value = '';
    // update local preview
    if (ratingPreview.value) ratingPreview.value.comment = '';

    // Optionally refresh movie aggregates
    try {
      const resp = await axios.get(withApiBase(`/movies/${props.tconst}/`));
      movie.value = resp.data;
    } catch (refreshErr) {
      // non-fatal
      console.warn('Could not refresh movie after comment delete', refreshErr);
    }
  } catch (err) {
    console.error(err);
    if (err.response && err.response.data) {
      commentDeleteError.value = err.response.data.detail || JSON.stringify(err.response.data);
    } else {
      commentDeleteError.value = 'Error removing comment.';
    }
  }
}
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