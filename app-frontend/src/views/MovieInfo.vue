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
          <li>⭐ Overall rating: <strong>{{ movie.average_rating }}</strong></li>
          <li>👥 Votes: <strong>{{ movie.numVotes.toLocaleString() }}</strong></li>
        </ul>
        <!-- Per-aspect averages -->
        <div class="aspect-averages">
          <h3>Average by aspect</h3>
          <ul>
            <li>🎵 Soundtrack: <strong>{{ movie.average_soundtrack ?? 0 }}</strong></li>
            <li>🎭 Acting: <strong>{{ movie.average_acting ?? 0 }}</strong></li>
            <li>🎬 Cinematography: <strong>{{ movie.average_cinematography ?? 0 }}</strong></li>
            <li>🧩 Plot: <strong>{{ movie.average_plot ?? 0 }}</strong></li>
          </ul>
        </div>
      </div>
    </div>
    <!-- Preview the user's existing rating if available -->
    <h2>Your rating</h2>
    <p v-if="!hasUserRating" style="color:var(--muted)">You haven't rated this movie yet.</p>
    <div class="user-rating-preview" v-if="hasUserRating && ratingPreview">
      <CommentCard :rating="ratingPreview" :profileRouteName="null" />
    </div>
    <div class="actions" style="margin-top:1rem; margin-bottom:3rem;">
      <router-link :to="{ name: 'movie-rate', params: { tconst: tconst } }">
        <button class="primary">{{ hasUserRating ? 'Change rating' : 'Rate' }}</button>
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

    <!-- Public comments from other users (newest first) with pagination -->
    <div v-if="commentsAll && commentsAll.length" class="comments-section" style="margin-top:1.5rem">
      <h2>Other reviews</h2>
      <div class="comments-list">
        <CommentCard v-for="c in displayedComments" :key="c.id" :rating="c" profileRouteName="user-profile" />
      </div>

      <div v-if="totalPages > 1" class="pagination" style="margin-top:1rem; display:flex; gap:.5rem; align-items:center;">
        <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1">‹</button>
        <button v-for="n in totalPages" :key="n" @click="goToPage(n)" :class="{ active: n === currentPage }">{{ n }}</button>
        <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages">›</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onBeforeUnmount } from 'vue';
import AppHeader from '@/components/AppHeader.vue'
import CommentCard from '@/components/CommentCard.vue'
import axios from 'axios';
import { withApiBase } from '@/utils/api';
import { withSseBase } from '@/utils/sse';

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

// expose prop as local binding so template can use `tconst` without accessing `movie`
const tconst = props.tconst;

// 2. Definimos las variables de estado
const movie = ref(null);
const loading = ref(true);
const error = ref(null);
const hasUserRating = ref(false);
const ratingPreview = ref(null);
const comments = ref([]);
// pagination for comments: 5 rows x 2 columns = 10 items per page
const commentsAll = ref([]);
const pageSize = 10;
const currentPage = ref(1);
const totalPages = computed(() => Math.max(1, Math.ceil(commentsAll.value.length / pageSize)));
const displayedComments = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return commentsAll.value.slice(start, start + pageSize);
});

function goToPage(n) {
  if (n < 1 || n > totalPages.value) return;
  currentPage.value = n;
}
const deleteError = ref(null);
const deleteSuccess = ref(null);
const commentDeleteError = ref(null);
const commentDeleteSuccess = ref(null);

// SSE
let sse = null;
let clientId = localStorage.getItem('sse_client_id');

// 3. Cuando el componente se monta, llamamos a la API
onMounted(async () => {
  try {
    // Usamos el 'tconst' de las props para construir la URL de la API
    const response = await axios.get(withApiBase(`/movies/${props.tconst}/`));
    movie.value = response.data;
    // Check if authenticated user already has a rating for this movie
    let userComment = null;
    try {
      const token = localStorage.getItem('access');
      if (token) {
        // Get user's rating
        const ratingResp = await axios.get(withApiBase(`/movies/ratings/${props.tconst}/`), {
          headers: { Authorization: `Bearer ${token}` }
        });
        ratingPreview.value = ratingResp.data;
        hasUserRating.value = true;

        // Get user's comment for this movie
        try {
          const commentResp = await axios.get(withApiBase(`/movies/comments/${props.tconst}/`), {
            headers: { Authorization: `Bearer ${token}` }
          });
          userComment = commentResp.data;
          // Add comment text to rating preview
          if (userComment && userComment.text) {
            ratingPreview.value.comment = userComment.text;
          }
        } catch (commentErr) {
          // User doesn't have a comment yet, that's fine
          if (commentErr.response?.status !== 404) {
            console.warn('Error fetching user comment:', commentErr);
          }
        }
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
    // Fetch all root comments and all ratings for this movie
    try {
      // Get all root comments (parent=null)
      const commentsResp = await axios.get(withApiBase(`/movies/${props.tconst}/comments/`));
      const allComments = commentsResp.data || [];

      // Get all ratings
      const ratingsResp = await axios.get(withApiBase(`/movies/${props.tconst}/ratings/`));
      const allRatings = ratingsResp.data || [];

      // Create a map of ratings by username for quick lookup
      const ratingsByUsername = {};
      allRatings.forEach(rating => {
        if (rating.user?.username) {
          ratingsByUsername[rating.user.username] = rating;
        }
      });

      // Combine comments with their associated ratings
      let combinedData = allComments
        .map(comment => {
          const rating = ratingsByUsername[comment.username];
          if (!rating) return null; // Skip comments without rating
          
          // Merge comment text into rating object
          return {
            ...rating,
            comment: comment.text, // Use comment text from Comment model
            comment_id: comment.id, // Preserve comment ID for likes/replies
            like_count: comment.like_count,
            reply_count: comment.reply_count,
            is_liked: comment.is_liked
          };
        })
        .filter(item => item !== null); // Remove nulls (comments without ratings)

      // Exclude the authenticated user's rating (we show it separately)
      if (hasUserRating.value && ratingPreview.value?.user?.username) {
        combinedData = combinedData.filter(r => 
          r.user?.username !== ratingPreview.value.user.username
        );
      }

      // Sort newest-first by date
      combinedData.sort((a, b) => {
        const da = a?.date ? new Date(a.date).getTime() : 0;
        const db = b?.date ? new Date(b.date).getTime() : 0;
        if (da === db) return (b.id || 0) - (a.id || 0);
        return db - da;
      });

      comments.value = combinedData;
      commentsAll.value = combinedData;

      // Try to subscribe to SSE, but don't fail if it's not available
      try {
        subscribeToMovie();
      } catch (sseErr) {
        console.warn('SSE not available, app will work without real-time updates:', sseErr);
      }
    } catch (cErr) {
      // non-fatal: just keep comments empty
      console.warn('Could not fetch comments or ratings for movie', cErr);
      comments.value = [];
    }
  } catch (err) {
    console.error(err);
    error.value = 'Could not fetch movie details.';
  } finally {
    loading.value = false;
  }
});

onBeforeUnmount(() => {
  unsubscribeFromMovie();
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
    // Delete the rating
    await axios.delete(withApiBase(`/movies/ratings/${props.tconst}/`), {
      headers: { Authorization: `Bearer ${token}` }
    });

    // Also delete the associated comment
    try {
      await axios.delete(withApiBase(`/movies/comments/${props.tconst}/`), {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (commentErr) {
      // Comment deletion failed, but rating was deleted - still show success
      console.warn('Comment deletion failed (but rating was deleted):', commentErr);
    }

    deleteSuccess.value = 'Rating and comment deleted successfully.';
    hasUserRating.value = false;
    ratingPreview.value = null;
    commentsAll.value = []; // Clear comments after delete

    // Refresh movie data to update numVotes / average_rating
    try {
      const resp = await axios.get(withApiBase(`/movies/${props.tconst}/`));
      movie.value = resp.data;
    } catch (fetchErr) {
      console.warn('Could not refresh movie after delete', fetchErr);
    }
  } catch (err) {
    console.error('Delete rating error:', err);
    if (err.response && err.response.data) {
      deleteError.value = typeof err.response.data === 'string' 
        ? err.response.data 
        : err.response.data.detail || JSON.stringify(err.response.data);
    } else if (err.message) {
      deleteError.value = err.message;
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

  // Only update the comment to empty string, don't touch the rating
  const commentPayload = {
    text: '' // Empty string to clear comment
  };

  try {
    await axios.patch(withApiBase(`/movies/comments/${props.tconst}/`), commentPayload, {
      headers: { Authorization: `Bearer ${token}` }
    });

    commentDeleteSuccess.value = 'Comment deleted successfully.';
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

function subscribeToMovie() {
  try {
    sse = new EventSource(withSseBase('/sse/stream'));

    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log(data);

        if (data.type === 'client_id') {
          clientId = data.client_id;
          localStorage.setItem('sse_client_id', clientId);

          axios.post(`${withSseBase('/sse/subscribe')}/movie:${tconst}`, { client_id: clientId })
            .catch(console.warn);
          return;
        }

        if (data.type === 'new_rating' && data.rating?.movie_info?.tconst === tconst) {
          movie.value = data.new_movie;
          const index = commentsAll.value.findIndex(r => r.id === data.rating.id);
          if (index === -1 && data.rating?.comment) commentsAll.value.unshift(data.rating);  //  New rating with comment
          if (index !== -1 && !data.rating?.comment) commentsAll.value.splice(index, 1);  // Comment removed from existing rating
          if (index !== -1 && data.rating?.comment) {  // Rating or comment modified but not removed
            commentsAll.value.splice(index, 1);
            commentsAll.value.unshift(data.rating);
          }
        }

        if (data.type === 'deleted_rating' && data.rating?.movie_info?.tconst === tconst) {
          movie.value = data.new_movie;
          const index = commentsAll.value.findIndex(r => r.id === data.rating.id);
          if (index !== -1) commentsAll.value.splice(index, 1);
        }
      } catch (err) {
        console.error('SSE message parse error', err);
      }
    };

    sse.onerror = (err) => {
      console.error('SSE error', err);
      // Close the connection on error to avoid repeated reconnection attempts
      if (sse) {
        sse.close();
        sse = null;
      }
    };
  } catch (err) {
    console.warn('Could not establish SSE connection:', err);
    // SSE is non-critical; app continues to work without it
  }
}

function unsubscribeFromMovie() {
  if (!sse || !clientId) return;
  axios.post(`${withSseBase('/sse/unsubscribe')}/movie:${tconst}`, { client_id: clientId }).catch(console.warn);
  sse.close();
  sse = null;
}


</script>

<style scoped>
/* Estilos específicos para esta vista */
.movie-details {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  padding: 1rem 0 0.5rem;
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


.preview-row { display:flex; flex-direction: column; gap: .5rem; align-items: flex-start; }
.overall { margin:0; font-weight:600; }
.mini-stats { display:flex; gap: .7rem; flex-wrap:wrap; color: var(--muted); }
.mini-stats span { background: transparent; padding: .15rem 0rem; border-radius: 6px; font-size: .95rem }

/* Per-aspect averages styles */
.aspect-averages { margin-top: 1.5rem }
.aspect-averages h3 { margin: 0 0 .5rem; font-size: 1rem; color: var(--muted) }
.aspect-averages ul { list-style: none; padding: 0; margin: 0; display: block }
.aspect-averages li { display: block; background: transparent; padding: .25rem 0; color: var(--muted); width: 100% }


/* Comments list: grid layout (1 column on small screens, 2 columns on wider screens) */
.comments-section {
  margin-bottom: 3rem;
}
.comments-section .comments-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 900px) {
  .comments-section .comments-list {
    grid-template-columns: repeat(2, minmax(300px, 1fr));
  }
}
/* Pagination button styles (match ProfileView) */
.comments-section .pagination button {
  padding: 0.35rem 0.6rem;
  border-radius: 6px;
  border: 1px solid rgba(0,0,0,0.06);
  background: var(--card);
  cursor: pointer;
}
.comments-section .pagination button.active {
  background: var(--primary);
  color: white;
  font-weight: 700;
}
.comments-section .pagination button:disabled { opacity: 0.4; cursor: default }

.user-rating-preview { width: 100%; box-sizing: border-box }
@media (min-width: 900px) {
  .user-rating-preview { width: calc(50% - 0.5rem); }
}
.user-rating-preview .user-rating-card { max-width: none; width: 100%; }
</style>