<template>
  <AppHeader>
    <template #actions>
      <div class="actions"><router-link to="/"><button class="ghost">← Home</button></router-link></div>
    </template>
  </AppHeader>
  <main class="container">
    <!-- Loading -->
    <div v-if="loading" class="empty">Loading profile...</div>

    <!-- Error -->
    <div v-else-if="error" style="color:red">{{ error }}</div>

    <!-- PERFIL DEL USUARIO -->
    <div v-else>

      <!-- CABECERA DEL PERFIL -->
      <div class="profile-details">
        <img class="avatar" :src="avatarUrl" alt="Avatar">

        <div class="info">
          <h1>{{ username }}</h1>
          <p class="bio">{{ bio }}</p>
          <p class="average-rating">Rating average: <strong>{{ averageRating }}</strong></p>
        </div>
      </div>

      <hr>

      <!-- ÚLTIMAS PELÍCULAS VALORADAS -->
      <div class="latest-ratings">
        <h2>Latest ratings</h2>

        <div v-if="ratedMovies.length === 0">
          This user has not yet rated a movie.
        </div>

        <div class="grid">
          <div v-for="rating in ratedMovies" :key="rating.id">
            <RatingCard :rating="rating" />
          </div>
        </div>
      </div>

    </div>
  </main>

</template>

<script setup>
import AppHeader from '@/components/AppHeader.vue'
import RatingCard from '@/components/RatingCard.vue';
import defaultAvatar from '@/assets/default-avatar.webp'
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { withApiBase } from '@/utils/api';

const props = defineProps({
  username: {
    type: String,
    required: true
  }
})

// --- ESTADO ---
const username = ref(null);
const avatarUrl = ref(null);
const bio = ref(null);
const averageRating = ref(null);
const ratedMovies = ref([]);
const loading = ref(true);
const error = ref(null);

onMounted(async () => {
  try {
    const response = await axios.get(withApiBase(`/movies/profiles/${props.username}/`));
    
    const data = response.data;
    username.value = data.username;
    avatarUrl.value = data.photo || defaultAvatar;
    bio.value = data.bio;
    averageRating.value = data.average_rating;

    const response2 = await axios.get(withApiBase(`/movies/profiles/${username.value}/ratings/`), {
      user: username.value
    });

    loading.value = false;
    const data2 = response2.data;
    ratedMovies.value = data2 || [];
    console.log(ratedMovies.value);
  } catch (err) {
    loading.value = false;
    if (err.response?.data?.detail) {
      // Mostrar los errores del backend
      error.value = err.response.data.detail[0];
    } else {
      error.value = 'Error loading profile.';
    }
  }
});

// --- MÉTODOS (Acciones del usuario) ---


</script>

<style scoped>
/* Estilos específicos para esta vista */
.profile-details {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  padding: 2rem 0;
}

@media (min-width: 768px) {
  .profile-details {
    grid-template-columns: 300px 1fr;
  }
}

.avatar {
  width: 300px;
  height: 300px;
  overflow: hidden;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 12px;
}

.info h1 {
  margin-top: 0;
}

.bio {
  color: var(--muted);
  line-height: 1.6;
}

.average-rating {
  list-style: none;
  padding: 0;
  display: flex;
  gap: 1.5rem;
  font-size: 1.1rem;
}
</style>