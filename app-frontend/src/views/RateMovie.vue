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
            <textarea v-model="form.comment" rows="10"></textarea>
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
import { ref, onMounted } from 'vue';
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
  overall_score: 5,
  soundtrack: 5,
  acting: 5,
  cinematography: 5,
  plot: 5,
  comment: ''
});

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
      // Not authenticated - redirect to login
      router.push({ name: 'login' });
      return;
    }

    const resp = await axios.get(withApiBase(`/movies/ratings/${tconst}/`), {
      headers: { Authorization: `Bearer ${token}` }
    });

    // Prefill form with existing rating
    const data = resp.data;
    form.value.overall_score = data.overall_score || form.value.overall_score;
    form.value.soundtrack = data.soundtrack || 0;
    form.value.acting = data.acting || 0;
    form.value.cinematography = data.cinematography || 0;
    form.value.plot = data.plot || 0;
    form.value.comment = data.comment || '';

  } catch (err) {
    if (err.response && err.response.status === 404) {
      // user has not rated yet - leave defaults
    } else if (err.response && err.response.status === 401) {
      router.push({ name: 'login' });
      return;
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
    router.push({ name: 'login' });
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
    // Try to create or update via POST to ratings/ which in backend updates existing
    const resp = await axios.post(withApiBase(`/movies/ratings/`), payload, {
      headers: { Authorization: `Bearer ${token}` }
    });

    success.value = 'Rating saved successfully.';
    // After saving, navigate back to movie detail
    router.push({ name: 'movie-info', params: { tconst } });
  } catch (err) {
    console.error(err);
    error.value = err.response?.data || 'Error saving rating.';
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
