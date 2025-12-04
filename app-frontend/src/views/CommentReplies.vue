<template>
  <AppHeader />

  <div class="container">
    <!-- Loading state -->
    <div v-if="loading" class="empty">Loading replies...</div>

    <!-- Error state -->
    <div v-else-if="error" class="empty">
      ⚠️ {{ error }}
    </div>

    <!-- Content loaded -->
    <div v-else>
      <h1>Replies to comment</h1>
      <p v-if="!replies || replies.length === 0" style="color:var(--muted)">No replies yet.</p>
      
      <div v-else class="replies-list">
        <!-- Parent comment displayed for context -->
        <div class="parent-comment-section" v-if="parentComment">
          <h2>Original comment</h2>
          <CommentCard :rating="parentComment" :profileRouteName="null" />
        </div>

        <!-- Replies -->
        <h2>Replies</h2>
        <div class="replies">
          <CommentCard v-for="reply in replies" :key="reply.id" :rating="reply" profileRouteName="user-profile" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import AppHeader from '@/components/AppHeader.vue';
import CommentCard from '@/components/CommentCard.vue';
import axios from 'axios';
import { useRoute } from 'vue-router';
import { withApiBase } from '@/utils/api';

const route = useRoute();
const comment_id = route.params.comment_id;
const tconst = route.params.tconst;

const loading = ref(true);
const error = ref(null);
const parentComment = ref(null);
const replies = ref([]);

onMounted(async () => {
  try {
    // Fetch replies for this comment
    const repliesResp = await axios.get(withApiBase(`/movies/comments/${comment_id}/replies/`));
    replies.value = repliesResp.data || [];

    // Optionally fetch parent comment for context (if the endpoint provides it)
    // For now, we'll rely on what's passed or shown in the replies data
    
  } catch (err) {
    console.error('Error loading replies:', err);
    error.value = 'Could not load replies.';
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.replies-list {
  display: grid;
  gap: 2rem;
}

.parent-comment-section {
  background: var(--card);
  padding: 1.5rem;
  border-radius: 12px;
  border-left: 4px solid var(--primary);
}

.parent-comment-section h2 {
  margin-top: 0;
  font-size: 1rem;
  color: var(--muted);
  margin-bottom: 1rem;
}

.replies {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 900px) {
  .replies {
    grid-template-columns: repeat(2, minmax(300px, 1fr));
  }
}
</style>
