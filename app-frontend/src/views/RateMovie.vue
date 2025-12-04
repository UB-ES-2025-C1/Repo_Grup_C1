<template>
  <AppHeader />

  <main class="container">
    <h1>Rate: {{ movieTitle || tconst }}</h1>

    <section class="card">
      <div v-if="loading" class="empty">Loading...</div>
      <div v-else>
        <form @submit.prevent="submitRating" class="form-grid">
          <label>
            <p>Overall (0-10)</p>
            <input type="number" v-model.number="form.overall_score" min="0" max="10" required />
          </label>

          <label>
            <p>Soundtrack (0-10)</p>
            <input type="number" v-model.number="form.soundtrack" min="0" max="10" />
          </label>

          <label>
            <p>Acting (0-10)</p>
            <input type="number" v-model.number="form.acting" min="0" max="10" />
          </label>

          <label>
            <p>Cinematography (0-10)</p>
            <input type="number" v-model.number="form.cinematography" min="0" max="10" />
          </label>

          <label>
            <p>Plot (0-10)</p>
            <input type="number" v-model.number="form.plot" min="0" max="10" />
          </label>

          <label>
            <p>Comment</p>
            <textarea v-model="form.comment" rows="10" maxlength="1000"></textarea>
            <div class="char-counter" :class="{ 'over-limit': commentLength > 1000, 'at-limit': commentLength === 1000 }">
              {{ commentLength }} / 1000 characters
              <span v-if="commentLength > 1000" class="warning-text"> ({{ commentLength - 1000 }} over limit)</span>
            </div>
          </label>

          <div class="actions">
            <button type="submit">Submit</button>
            <router-link :to="{ name: 'movie-info', params: { tconst } }"><button type="button" class="ghost">Cancel</button></router-link>
          </div>
        </form>
      </div>

      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="success" class="success">{{ success }}</p>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import AppHeader from '@/components/AppHeader.vue'
import axios from 'axios';
import { useRouter } from 'vue-router';
import { getApiBaseUrl, withApiBase } from '@/utils/api';

const props = defineProps({
  tconst: { type: String, required: true }
});
const tconst = props.tconst;
const router = useRouter();

const loading = ref(true);
const error = ref(null);
const success = ref(null);
const movieTitle = ref(null);

const form = ref({
  overall_score: 10,
  soundtrack: 10,
  acting: 10,
  cinematography: 10,
  plot: 10,
  comment: ''
});

// Computed property for character count
const commentLength = computed(() => form.value.comment.length);

// Helper to get access token from localStorage
function getAccessToken() {
  return localStorage.getItem('access');
}

// Load existing rating (if any) and also fetch movie title for display
onMounted(async () => {
  loading.value = true;
  error.value = null;
  success.value = null;

  try {
    // Fetch movie basic info
    const movieResp = await axios.get(withApiBase(`/movies/${tconst}/`));
    movieTitle.value = movieResp.data.primaryTitle || movieResp.data.title;

    // Try to fetch user's rating for this movie
    const token = getAccessToken();
    if (!token) {
      // Not authenticated - redirect to login and replace history so back returns to movie page
      console.log('No access token found');
      router.replace({ name: 'login' });
      return;
    }

    const resp = await axios.get(withApiBase(`/movies/ratings/${tconst}/`), {
      headers: { Authorization: `Bearer ${token}` }
    });

    // Prefill form with existing rating
    const data = resp.data;
    form.value.overall_score = data.overall_score ?? form.value.overall_score;
    form.value.soundtrack = data.soundtrack ?? 0;
    form.value.acting = data.acting ?? 0;
    form.value.cinematography = data.cinematography ?? 0;
    form.value.plot = data.plot ?? 0;
    form.value.comment = data.comment ?? '';

    // Also try to fetch user's comment
    try {
      const commentResp = await axios.get(withApiBase(`/movies/comments/${tconst}/`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (commentResp.data && commentResp.data.text) {
        form.value.comment = commentResp.data.text;
      }
    } catch (commentErr) {
      // No existing comment yet, that's fine - leave form.value.comment as is
      if (commentErr.response?.status !== 404) {
        console.warn('Error fetching existing comment:', commentErr);
      }
    }

  } catch (err) {
    if (err.response && err.response.status === 404) {
      // user has not rated yet - leave defaults
    } else {
      console.error(err);
      error.value = 'Error loading data.';
    }
  } finally {
    loading.value = false;
  }
});

async function submitRating() {
  error.value = null;
  success.value = null;

  const token = getAccessToken();
  if (!token) {
    router.replace({ name: 'login' });
    return;
  }

  // Build payload (movie tconst is required by the backend POST endpoint)
  const payload = {
    movie: tconst,
    overall_score: form.value.overall_score,
    soundtrack: form.value.soundtrack,
    acting: form.value.acting,
    cinematography: form.value.cinematography,
    plot: form.value.plot,
    comment: form.value.comment
  };

  try {
    // Create or update rating
    const ratingResp = await axios.post(withApiBase(`/movies/ratings/`), payload, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // Also create or update comment (always, even if empty)
    const commentPayload = {
      text: form.value.comment || '' // Empty string if no comment
    };

    try {
      // Try PATCH first (update existing comment)
      try {
        await axios.patch(withApiBase(`/movies/comments/${tconst}/`), commentPayload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (patchErr) {
        // If 404, comment doesn't exist yet - create it with POST
        if (patchErr.response?.status === 404) {
          await axios.post(withApiBase(`/movies/comments/${tconst}/`), commentPayload, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } else {
          // Other error - re-throw
          throw patchErr;
        }
      }
    } catch (commentErr) {
      // Comment creation/update failed, but rating succeeded - still show success
      console.warn('Comment creation/update failed:', commentErr);
    }

    success.value = 'Rating and comment saved successfully.';
    // After saving, navigate back to movie detail
    router.push({ name: 'movie-info', params: { tconst } });
  } catch (err) {
    console.error(err);
    error.value = err.response?.data || 'Error saving rating.';
  }
}

async function deleteComment() {
  error.value = null;
  success.value = null;

  if (!form.value.comment) return;

  const confirmed = window.confirm('Are you sure you want to delete your comment?');
  if (!confirmed) return;

  const token = getAccessToken();
  if (!token) {
    router.replace({ name: 'login' });
    return;
  }

  // build payload similar to submitRating but with empty comment
  const payload = {
    movie: tconst,
    overall_score: form.value.overall_score,
    soundtrack: form.value.soundtrack,
    acting: form.value.acting,
    cinematography: form.value.cinematography,
    plot: form.value.plot,
    comment: ''
  };

  try {
    await axios.post(withApiBase(`/movies/ratings/`), payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    // clear the local form comment and show success
    form.value.comment = '';
    success.value = 'Comment deleted.';
  } catch (err) {
    console.error(err);
    error.value = err.response?.data || 'Error deleting comment.';
  }
}
</script>

<style scoped>
/* Match the global dark theme used across the app */
.card {
  padding: 1.5rem;
  border-radius: 12px;
  background: var(--card);
  color: var(--text);
  box-shadow: 0 8px 20px rgba(0,0,0,0.25);
}
.form-grid { display: grid; gap: .75rem; }
label { display: block; color: var(--text); }

/* Make paragraph labels inside the form have balanced vertical spacing */
.form-grid p { margin: .5rem 0; }

/* Inputs and textarea styled like global .input */
input[type="number"], textarea, select {
  width: 100%;
  padding: .7rem 1rem;
  border-radius: 10px;
  border: 1px solid #334155;
  background: #0f1720;
  color: var(--text);
  font-size: 1rem;
  font-family: inherit;
}
textarea { min-height: 120px; resize: vertical; }

.char-counter {
  font-size: 0.875rem;
  color: var(--muted);
  margin-top: 0.25rem;
  text-align: left;
}

.char-counter.at-limit {
  color: #fbbf24;
  font-weight: 600;
}

.char-counter.over-limit {
  color: #f43f5e;
  font-weight: 600;
}

.warning-text {
  font-weight: 700;
}

.actions { display:flex; gap:.5rem; margin-top: .5rem }
.ghost { background:transparent; border:1px solid #334155; color: var(--text) }
.error { color: #f43f5e }
.success { color: #10b981 }

/* Ensure buttons match global style */
.actions button { padding: .6rem 1rem; border-radius: 10px; border: 0; cursor: pointer }
.actions button.ghost { padding: .5rem 1rem }

/* Override global .card hover transform for this page so the form doesn't lift */
.card:hover {
  transform: none !important;
  box-shadow: 0 8px 20px rgba(0,0,0,0.25) !important;
}


</style>
