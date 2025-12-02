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

const form = ref({
  title: '',
  description: ''
});

// Helper to get access token from localStorage
function getAccessToken() {
  return localStorage.getItem('access');
}


</script>

<style scoped>

</style>
