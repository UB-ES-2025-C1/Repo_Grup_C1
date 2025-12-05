<template>
  <div class="card" @click="goToForum">
    <div class="meta">
      <h3>{{ forum.title }}</h3>
      <p>{{ forum.description }}</p>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

// --- PROPS ---
const props = defineProps({
  forum: {
    type: Object,
    required: true,
  },
});

const router = useRouter();

// --- IR AL FORUM ---
function goToForum() {
  router.push({ name: 'forum-chat', params: { id: props.forum.id } })
}
</script>

<style scoped>
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  cursor: pointer;
}

.meta {
  width: 100%;
  flex: 0 1 auto;
}
</style>
