<template>
  <AppHeader />

  <!-- Back button -->
  <div class="back-button-container">
    <button @click="goBack" class="back-btn">
      ← Back
    </button>
  </div>

  <div class="container">
    <!-- Loading state -->
    <div v-if="loading" class="empty">Loading replies...</div>

    <!-- Error state -->
    <div v-else-if="error" class="empty">
      ⚠️ {{ error }}
    </div>

    <!-- Content loaded -->
    <div v-else>
      <!-- Parent comment displayed at the top -->
      <div class="parent-comment-section" v-if="parentComment">
        <h2>Original Comment</h2>
        <CommentCard :rating="parentComment" :profileRouteName="'user-profile'" />
        
        <!-- Reply form button -->
        <button v-if="!showReplyForm" @click="handleReplyClick" class="reply-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 14 4 9 9 4"></polyline>
            <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
          </svg>
          Reply to this comment
        </button>

        <!-- Reply form -->
        <div v-if="showReplyForm" class="reply-form">
          <h3>Write your reply</h3>
          <textarea 
            v-model="replyText" 
            placeholder="Write your reply here..." 
            rows="4"
            maxlength="1000"
          ></textarea>
          <div class="char-counter" :class="{ 'at-limit': replyText.length === 1000, 'over-limit': replyText.length > 1000 }">
            {{ replyText.length }} / 1000 characters
            <span v-if="replyText.length > 1000" class="warning">({{ replyText.length - 1000 }} over limit)</span>
          </div>
          <div class="form-actions">
            <button @click="submitReply" class="submit-btn" :disabled="!replyText.trim() || submitting">
              {{ submitting ? 'Posting...' : 'Post Reply' }}
            </button>
            <button @click="cancelReply" class="cancel-btn" :disabled="submitting">Cancel</button>
          </div>
        </div>
      </div>

      <!-- Replies section -->
      <div class="replies-section">
        <h2>Replies ({{ replies.length }})</h2>
        <p v-if="!replies || replies.length === 0" class="no-replies">No replies yet. Be the first to reply!</p>

        <div v-else class="replies">
          <CommentCard v-for="reply in displayedReplies" :key="reply.id" :rating="reply" profileRouteName="user-profile" @deleted="handleReplyDeleted" @reply="submitReplyFromCard"/>
        </div>

        <!-- Botón para cargar más respuestas -->
        <div v-if="replies.length > displayedRepliesCount" class="load-more-container">
          <button @click="loadMoreReplies" class="load-more-btn">
            Load more replies
          </button>
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
import { useRoute, useRouter } from 'vue-router';
import { withApiBase } from '@/utils/api';

const route = useRoute();
const router = useRouter();
const comment_id = route.params.comment_id;
const tconst = route.params.tconst;

const loading = ref(true);
const error = ref(null);
const parentComment = ref(null);
const replies = ref([]);
const showReplyForm = ref(false);
const replyText = ref('');
const submitting = ref(false);

async function loadParentComment() {
  try {
    // Fetch the comment directly by ID
    const commentsResp = await axios.get(withApiBase(`/movies/${tconst}/comments/`));
    const allComments = commentsResp.data || [];

    // Find the parent comment by ID
    const comment = allComments.find(c => c.id === parseInt(comment_id));
    
    if (comment) {
      let rating = null;
      const token = localStorage.getItem('access');
      
      // If user is authenticated, check if this is their own comment by trying to fetch their rating
      if (token) {
        try {
          const userRatingResp = await axios.get(withApiBase(`/movies/ratings/${tconst}/`), {
            headers: { Authorization: `Bearer ${token}` }
          });
          // Check if this is the user's own rating
          if (userRatingResp.data && userRatingResp.data.user?.username === comment.username) {
            rating = userRatingResp.data;
          }
        } catch (err) {
          // User may not have a rating, that's fine
        }
      }
      
      // If not the user's own rating, fetch from all ratings
      if (!rating) {
        const ratingsResp = await axios.get(withApiBase(`/movies/${tconst}/ratings/`));
        const allRatings = ratingsResp.data || [];
        rating = allRatings.find(r => r.user?.id === comment.user?.id || r.user?.username === comment.username);
      }
      
      if (rating) {
        // Combine comment and rating data
        parentComment.value = {
          ...rating,
          comment: comment.text,
          comment_id: comment.id,
          like_count: comment.like_count,
          reply_count: comment.reply_count,
          is_liked: comment.is_liked,
          parent_id: comment.parent_id,
          username: comment.username,
          user: comment.user,
          user_photo: comment.user_photo
        };
      } else {
        // If no rating found, just use the comment
        parentComment.value = {
          id: comment.id,
          comment_id: comment.id,
          text: comment.text,
          comment: comment.text,
          username: comment.username,
          user: comment.user,
          user_photo: comment.user_photo,
          like_count: comment.like_count,
          reply_count: comment.reply_count,
          is_liked: comment.is_liked,
          created_at: comment.created_at,
          updated_at: comment.updated_at,
          parent_id: comment.parent_id
        };
      }
    }
  } catch (err) {
    console.error('Error loading parent comment:', err);
  }
}

async function loadReplies() {
  try {
    const repliesResp = await axios.get(withApiBase(`/movies/comments/${comment_id}/replies/`));
    replies.value = repliesResp.data || [];
  } catch (err) {
    console.error('Error loading replies:', err);
    error.value = 'Could not load replies.';
  }
}

function handleReplyClick() {
  const token = localStorage.getItem('access');
  if (!token) {
    router.push({ name: 'login' });
    return;
  }
  showReplyForm.value = true;
}

async function submitReply() {
  const token = localStorage.getItem('access');
  if (!token) {
    router.push({ name: 'login' });
    return;
  }

  if (!replyText.value.trim()) {
    return;
  }

  if (replyText.value.length > 1000) {
    alert('Reply must be 1000 characters or less');
    return;
  }

  submitting.value = true;
  
  try {
    const payload = {
      movie_tconst: tconst,
      parent_id: parseInt(comment_id),
      text: replyText.value.trim()
    };

    await axios.post(
      withApiBase(`/movies/comments/${tconst}/`),
      payload,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    // Reset form
    replyText.value = '';
    showReplyForm.value = false;

    // Reload replies
    await loadReplies();
  } catch (err) {
    console.error('Error posting reply:', err);
    alert('Failed to post reply. Please try again.');
  } finally {
    submitting.value = false;
  }
}

function cancelReply() {
  replyText.value = '';
  showReplyForm.value = false;
}

function goBack() {
  router.push({ name: 'movie-info', params: { tconst } });
}

const displayedRepliesCount = ref(10); // inicialmente mostramos 10

// Computed para las respuestas que se muestran actualmente
import { computed } from 'vue';
const displayedReplies = computed(() => replies.value.slice(0, displayedRepliesCount.value));

// Función para cargar más respuestas
function loadMoreReplies() {
  displayedRepliesCount.value += 3; // cada vez añadimos 3 más
}

function handleReplyDeleted(commentId) {
  // Filtramos la respuesta eliminada
  replies.value = replies.value.filter(r => r.id !== commentId);
}

async function submitReplyFromCard(replyTextFromCard) {
  if (!replyTextFromCard.trim()) return;
  submitting.value = true;

  try {
    const payload = {
      movie_tconst: tconst,
      parent_id: parseInt(comment_id),
      text: replyTextFromCard.trim()
    };

    await axios.post(
      withApiBase(`/movies/comments/${tconst}/`),
      payload,
      { headers: { Authorization: `Bearer ${localStorage.getItem('access')}` } }
    );

    await loadReplies();
  } catch (err) {
    console.error('Failed to send reply:', err);
    alert('Failed to send reply.');
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  try {
    await Promise.all([loadParentComment(), loadReplies()]);
  } catch (err) {
    console.error('Error loading data:', err);
    error.value = 'Could not load data.';
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.container {
  max-width: 900px;
  margin: 2rem auto;
  padding: 0 1rem;
}

.empty {
  text-align: center;
  color: var(--muted);
  padding: 3rem;
  font-size: 1.1rem;
}

.parent-comment-section {
  margin-bottom: 2rem;
}

.parent-comment-section h2 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: var(--text);
  font-size: 1.25rem;
}

.reply-btn {
  margin-top: 1rem;
  background: var(--card);
  color: var(--primary);
  border: none;
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.reply-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.reply-form {
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.reply-form h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: var(--text);
  font-size: 1.1rem;
}

.reply-form textarea {
  width: 100%;
  padding: 0.875rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: var(--card);
  color: var(--text);
  font-family: inherit;
  font-size: 1rem;
  resize: vertical;
  min-height: 100px;
}

.reply-form textarea:focus {
  outline: none;
  border-color: var(--primary);
}

.char-counter {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--muted);
  text-align: right;
}

.char-counter.at-limit {
  color: #fbbf24;
}

.char-counter.over-limit {
  color: #f43f5e;
}

.char-counter .warning {
  font-weight: 600;
  margin-left: 0.5rem;
}

.form-actions {
  margin-top: 1rem;
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.submit-btn, .cancel-btn {
  padding: 0.625rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.submit-btn {
  background: var(--primary);
  color: white;
}

.submit-btn:hover:not(:disabled) {
  background: #1d4ed8;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cancel-btn {
  background: transparent;
  color: var(--muted);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.cancel-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
}

.replies-section {
  margin-top: 2rem;
  
}

.replies-section h2 {
  margin-bottom: 1.5rem;
  color: var(--text);
  font-size: 1.5rem;
  
}

.no-replies {
  text-align: center;
  color: var(--muted);
  padding: 2rem;
  font-style: italic;
}

.replies {
  display: grid;
  gap: 1.25rem;
  
}

.back-button-container {
  display: flex;
  justify-content: flex-end;
  margin: 1rem 0;
}

.back-btn {
  background: var(--primary);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-right: 50px;
}

.back-btn:hover {
  background: #1d4ed8;
}

.load-more-container {
  display: flex;
  justify-content: center;
  margin-top: 1rem;
}

.load-more-btn {
  background: var(--primary);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 30px;
}

.load-more-btn:hover {
  background: #1d4ed8;
}

</style>
