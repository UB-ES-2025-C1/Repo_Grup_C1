<template>
  <div class="card" @click="goToForum">
    <div class="meta">
      <h3>{{ forum.title }}</h3>
      <p>{{ forum.description }}</p>
    </div>

    <button class="empty" @click.stop="changeJoinStatus">{{ joinStatus }}</button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import axios from 'axios'
import { withApiBase } from '@/utils/api'
import { useRouter } from 'vue-router'

// --- PROPS ---
const props = defineProps({
  forum: {
    type: Object,
    required: true,
  },
});

const router = useRouter();

// --- ESTADO ---
const loading = ref(false);
const joined = ref(props.forum.joined);
const joinStatus = computed(() => {
  console.log(props.forum);
  if (joined.value && loading.value) return 'Leaving...';
  else if (joined.value) return 'Leave';
  else if (!joined.value && loading.value) return 'Joining...';
  else return 'Join';
});

// --- IR AL FORUM ---
function goToForum() {
  router.push({ name: 'forum-chat', params: { id: props.forum.id } })
}

// --- UNIR-SE O DEJAR UN FORUM ---
async function changeJoinStatus() {
  loading.value = true;
  try {
    const forumsRes = await axios.post(withApiBase(`/movies/forums/${props.forum.id}`));
    joined.value = forumsRes.data.joined;
  } catch (err) {
    console.error('Error', props.forum.joined ? 'leaving' : 'joining', 'forum', props.forum.id, ':', err);
  } finally {
    loading.value = false;
  }
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


.empty {
  padding: 0.4rem 0.8rem;
  border: none;
  border-radius: 6px;
  background-color: #3b82f6;
  color: white;
  cursor: pointer;
  margin-top: auto;
  align-self: flex-end;
}

.empty:hover {
  background-color: #2563eb;
}
</style>
