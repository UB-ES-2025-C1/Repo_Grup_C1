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
      <div v-if="isOwnProfile" style="margin-top:1rem">
        <button @click="editing = !editing">
          Edit profile
        </button>
      </div>
      <div v-if="editing" class="edit-form">
        <h3>Edit profile</h3>

        <div class="form">
          <div class="field">
            <label>Bio</label>
            <textarea v-model="newBio" rows="4"></textarea>
            <button @click="newBio = ''">Remove Profile Bio</button>
          </div>

          <div class="field">
            <label>Photo</label>
            <input type="file" ref="newAvatar" style="display:none" @change="handleChangedAvatar">
            <button @click="openAvatarPicker" :class="{ disabled: removeAvatar }">
              {{ removeAvatar ? "Removing Profile Photo" : 
                                newAvatarFile ? newAvatarFile.name : "Choose Photo" }}
            </button>
            <button v-if="newAvatarFile" @click="clearSelectedPhoto">Clear Selection</button>
            <button @click="removePhoto">
              {{ removeAvatar ? "Cancel Remove Profile Photo" : "Remove Profile Photo" }}
            </button>
          </div>
        </div>
        
        <div class="actions">
          <button @click="saveChanges" class="primary">Save</button>
          <button @click="cancelChanges" class="secondary">Cancel</button>
        </div>

        <div v-if="updating" class="empty">Updating profile...</div>
        <div v-else-if="errorUpdating" style="color:red">{{ errorUpdating }}</div>
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
    avatarUrl.value = data.photo;
    bio.value = data.bio;
    averageRating.value = data.average_rating;
    newBio.value = bio.value || '';

    const response2 = await axios.get(withApiBase(`/movies/profiles/${username.value}/ratings/`), {
      user: username.value
    });

    loading.value = false;
    const data2 = response2.data;
    ratedMovies.value = data2 || [];
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
    avatarUrl.value = data.photo;
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
</style>