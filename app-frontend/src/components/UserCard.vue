<template>
  <router-link :to="{ name: 'user-profile', params: { username: user.username } }" class="card">
    <img
      v-if="user.photo"
      :src="getImageUrl(user.photo)"
      :alt="`Photo of ${user.username}`"
      loading="lazy"
    />
    <div v-else class="poster-placeholder">
      <span>{{ user.username[0] }}</span>
    </div>

    <div class="meta">
      <h3>{{ user.username }}</h3>
    </div>
  </router-link>
</template>

<script setup>
import { withApiBase } from '@/utils/api'

const props = defineProps({
  user: {
    type: Object,
    required: true,
  },
})

const getImageUrl = (photoPath) => {
  return withApiBase(photoPath)
}
</script>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  text-align: center;
  border-radius: 8px;
  overflow: hidden;
  background-color: #1f2937;
  color: #eaeaea;
  cursor: pointer;
}

.poster-placeholder {
  aspect-ratio: 2/3;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #374151; /* gris oscuro */
  color: #9ca3af;
  font-size: 1.2rem;
}

.meta {
  padding: 0.5rem;
}
</style>
