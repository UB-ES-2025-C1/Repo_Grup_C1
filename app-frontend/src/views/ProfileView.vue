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
        <img class="avatar" :src="avatarUrl || defaultAvatar" alt="Avatar">

        <div class="info">
          <h1>{{ username }}</h1>
          <p class="bio">{{ bio || "This user does not have a biography." }}</p>
          <p class="average-rating">Rating average: <strong>{{ averageRating }}</strong></p>
        </div>
      </div>

      <!-- EDICIÓN DEL PERFIL -->
      <div v-if="isOwnProfile" style="margin-top:1rem; margin-bottom:2rem;">
        <button @click="editing = !editing" id="edit-profile-btn">
          Edit profile
        </button>
      </div>
      <div v-if="editing" class="edit-form" style="margin-bottom:2rem;">
        <h3>Edit profile</h3>

        <div class="form">
          <div class="field">
            <label>Bio</label>
            <textarea v-model="newBio" rows="4" id="bio-text-area"></textarea>
            <button @click="newBio = ''" id="remove-bio-btn">Remove Profile Bio</button>
          </div>

          <div class="field">
            <label>Photo</label>
            <input type="file" ref="newAvatar" style="display:none" @change="handleChangedAvatar">
            <button @click="openAvatarPicker" :class="{ disabled: removeAvatar }" id="photo-selector-btn">
              {{ removeAvatar ? "Removing Profile Photo" : 
                                newAvatarFile ? newAvatarFile.name : "Choose Photo" }}
            </button>
            <button v-if="newAvatarFile" @click="clearSelectedPhoto" id="clear-photo-selection-btn">Clear Selection</button>
            <button @click="removePhoto">
              {{ removeAvatar ? "Cancel Remove Profile Photo" : "Remove Profile Photo" }}
            </button>
          </div>
        </div>
        
        <div class="actions">
          <button @click="saveChanges" class="primary" id="save-btn">Save</button>
          <button @click="cancelChanges" class="secondary" id="cancel-btn">Cancel</button>
        </div>

        <div v-if="updating" class="empty">Updating profile...</div>
        <div v-else-if="errorUpdating" style="color:red">{{ errorUpdating }}</div>
      </div>

      <!-- ÚLTIMAS PELÍCULAS VALORADAS -->
      <div class="latest-ratings">
        <h2>Latest ratings</h2>

        <div v-if="ratedMovies.length === 0">
          <p style="color:var(--muted)"> This user has not yet rated a movie. </p>
        </div>

        <div class="grid">
          <div v-for="rating in displayedRatings" :key="rating.id">
            <RatingCard :rating="rating" />
          </div>
        </div>

        <!-- Pagination controls -->
        <div v-if="totalPages > 1" class="pagination" style="margin-top:1rem; display:flex; gap:.5rem; align-items:center;">
          <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1">‹</button>
          <button v-for="n in totalPages" :key="n" @click="goToPage(n)" :class="{ active: n === currentPage }">{{ n }}</button>
          <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages">›</button>
        </div>
      </div>

    </div>
  </main>

</template>

<script setup>
import AppHeader from '@/components/AppHeader.vue';
import RatingCard from '@/components/RatingCard.vue';
import defaultAvatar from '@/assets/default-avatar.webp';
import { ref, onMounted, computed } from 'vue';
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
// client-side pagination
const ratedMoviesAll = ref([]);
const pageSize = 6;
const currentPage = ref(1);
const totalPages = computed(() => Math.max(1, Math.ceil(ratedMoviesAll.value.length / pageSize)));
const displayedRatings = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return ratedMoviesAll.value.slice(start, start + pageSize);
});

function goToPage(n) {
  if (n < 1 || n > totalPages.value) return;
  currentPage.value = n;
}

const isOwnProfile = computed(() => props.username === 'me');
const editing = ref(false);
const newBio = ref('');
const newAvatar = ref(null);
const newAvatarFile = ref(null);
const removeAvatar = ref(false);

const loading = ref(true);
const error = ref(null);
const updating = ref(false);
const errorUpdating = ref(null);

onMounted(async () => {
  try {
    const response = await axios.get(withApiBase(`/movies/profiles/${props.username}/`));
    
    const data = response.data;
    username.value = data.username;
    avatarUrl.value = resolvePhotoSrc(data.photo);
    bio.value = data.bio;
    averageRating.value = data.average_rating;
    newBio.value = bio.value || '';

    const response2 = await axios.get(withApiBase(`/movies/profiles/${username.value}/ratings/`), {
      user: username.value
    });

    loading.value = false;
    const data2 = response2.data || [];
    // sort by date descending (newest first). fallback to id desc
    data2.sort((a, b) => {
      const da = a?.date ? new Date(a.date).getTime() : 0;
      const db = b?.date ? new Date(b.date).getTime() : 0;
      if (da === db) return (b.id || 0) - (a.id || 0);
      return db - da;
    });
    ratedMoviesAll.value = data2;
    ratedMovies.value = data2; // keep for backward compat if any other code uses it
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

// Compute avatar src robustly: prefer rating.user.photo when provided by API.
function resolvePhotoSrc(photo) {
  if (!photo) return defaultAvatar;
  // If it's already absolute, use as-is
  if (/^https?:\/\//i.test(photo)) return photo;
  // If it starts with '/', assume it's a path served by the API (use withApiBase to make full URL)
  if (photo.startsWith('/')) return withApiBase(photo);
  // otherwise return as-is
  return photo;
}

// --- MÉTODOS (Acciones del usuario) ---
function openAvatarPicker() {
  newAvatar.value.click();
}

function handleChangedAvatar(event) {
  newAvatarFile.value = event.target.files[0];
}

function clearSelectedPhoto() {
  newAvatar.value.value = null;
  newAvatarFile.value = null;
}

function removePhoto() {
  newAvatar.value.value = null;
  newAvatarFile.value = null;
  removeAvatar.value = !removeAvatar.value;
}

const saveChanges = async () => {
  try {
    updating.value = true;

    const formData = new FormData();
    formData.append('bio', newBio.value);
    if (newAvatarFile.value) {
      formData.append('photo', newAvatarFile.value);
    }
    if (removeAvatar.value) formData.append('remove_photo', 'true');

    const response = await axios.patch(
      withApiBase('/movies/profiles/me/'), 
      formData, 
      { headers: { "Content-Type": "multipart/form-data" } }
    );

    // Refrescar la vista
    const data = response.data;
    console.log(data);
    bio.value = data.bio;
    avatarUrl.value = resolvePhotoSrc(data.photo_url);
    newBio.value = bio.value || '';
    newAvatar.value.value = null;
    newAvatarFile.value = null;

    updating.value = false;
    editing.value = false;

  } catch (err) {
    if (err.response?.data?.detail) {
      errorUpdating.value = err.response.data.detail[0];
    } else {
      errorUpdating.value = "Error saving profile.";
    }
  }
};

function cancelChanges() {
  newBio.value = bio.value || '';
  newAvatar.value.value = null;
  newAvatarFile.value = null;
  removeAvatar.value = false;
  editing.value = false;
}
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
  border-radius: 50%;
  display: inline-block;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  border-radius: 0; /* parent already rounded */
}

.info {
  margin-left: 2rem;
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

.edit-form {
  display: flex;
  flex-direction: column;
  border: 1px solid #ccc;
  padding: 1rem;
  border-radius: 12px;
  margin: 1rem;
}

.edit-form .form {
  display: flex;
  flex-direction: column;
}

.edit-form .field {
  display: flex;
  flex-direction: column;
  margin: 1rem;
  gap: 1em;
}

.edit-form .actions {
  display: flex;
  gap: 1rem;
}

button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Pagination styles */
.pagination button {
  padding: 0.35rem 0.6rem;
  border-radius: 6px;
  border: 1px solid rgba(0,0,0,0.06);
  background: var(--card);
  cursor: pointer;
}
.pagination button.active {
  background: var(--primary);
  color: white;
  font-weight: 700;
}
.pagination button:disabled { opacity: 0.4; cursor: default }

.latest-ratings {
  margin-top: 2rem;
  margin-bottom: 4rem;
}
/* Grid layout for latest ratings: 1 column on small, 3 columns on wider screens
   (with pageSize=6 this yields 2 rows of 3 items) */
.latest-ratings .grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 720px) {
  .latest-ratings .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>