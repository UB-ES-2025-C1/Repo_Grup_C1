<template>
  <article class="user-rating-card" :class="{ 'reply-card': isReply }">
    <div class="header-row">
      <!-- Scores section - only show for root comments (not replies) -->
      <div v-if="!isReply" class="scores">
        <div class="overall">{{ rating.overall_score ?? '—' }}</div>
        <div class="aspects">
          <span class="aspect">Soundtrack: <strong>{{ rating.soundtrack ?? '—' }}</strong></span>
          <span class="aspect">Acting: <strong>{{ rating.acting ?? '—' }}</strong></span>
          <span class="aspect">Cinematography: <strong>{{ rating.cinematography ?? '—' }}</strong></span>
          <span class="aspect">Plot: <strong>{{ rating.plot ?? '—' }}</strong></span>
        </div>
      </div>

      <div class="user">
        <div class="user-info">
          <router-link v-if="username" :to="profileLink" class="username">{{ displayName }}</router-link>
          <span v-else class="username">{{ displayName }}</span>
          <router-link :to="profileLink" class="avatar-link">
            <img class="avatar" :src="avatarSrc" :alt="`Avatar of ${displayName}`" />
          </router-link>
        </div>
      </div>
    </div>

    <!-- Comment text or edit form -->
    <div v-if="rating.comment || rating.text" class="comment-section">
      <p v-if="!isEditing" class="comment">"{{ commentText }}"</p>
      
      <!-- Edit form -->
      <div v-else class="edit-form">
        <textarea 
          v-model="editedText" 
          maxlength="1000"
          rows="4"
          class="edit-textarea"
        ></textarea>
        <div class="char-counter" :class="{ 'at-limit': editedText.length === 1000, 'over-limit': editedText.length > 1000 }">
          {{ editedText.length }} / 1000 characters
        </div>
        <div class="edit-actions">
          <button @click="saveEdit" class="save-btn" :disabled="saving || editedText.length > 1000">
            {{ saving ? 'Saving...' : 'Save' }}
          </button>
          <button @click="cancelEdit" class="cancel-btn" :disabled="saving">Cancel</button>
        </div>
      </div>
    </div>

    <!-- Action buttons -->
    <div v-if="rating.comment_id || rating.id" class="action-buttons">
      <!-- Edit button - only show if user is the owner -->
      <button v-if="isOwner && !isEditing && isReply" class="edit-button" @click="startEdit" title="Edit comment">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
        Edit comment
      </button>
      <button
        v-if="isOwner && !isEditing && isReply"
        class="delete-button"
        @click="deleteComment"
        title="Delete comment"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        </svg>
        Delete comment
      </button>
      
      <!-- Like button -->
      <button class="like-button" :class="{ 'liked': displayIsLiked }" @click="toggleLike">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" :fill="displayIsLiked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="like-icon">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
        {{ displayLikeCount }}
      </button>

      <!-- Reply button - only for replies -->
      <button v-if="isReply" class="reply-button" @click="startReply">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        Reply
      </button>

      <!-- Link to view replies - only show for root comments -->
      <router-link v-if="!isReply" :to="{ name: 'comment-replies', params: { tconst: rating.movie_info?.tconst || rating.movie?.tconst, comment: 'comment', comment_id: rating.comment_id || rating.id } }" class="blue-link">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chat-icon">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        {{ rating.reply_count || 0 }}
      </router-link>
    </div>

    <!-- Reply form (appear below action buttons) -->
    <div v-if="isReplying" class="reply-form">
      <textarea 
        v-model="replyText" 
        @input="checkPrefix"
        maxlength="1000" 
        rows="3" 
        class="edit-textarea"
      ></textarea>
      <div class="char-counter" :class="{ 'at-limit': replyText.length === 1000, 'over-limit': replyText.length > 1000 }">
        {{ replyText.length }} / 1000 characters
      </div>
      <div class="edit-actions">
        <button @click="sendReply" class="save-btn" :disabled="replyText.length === 0 || replyText.length > 1000">Send</button>
        <button @click="cancelReply" class="cancel-btn">Cancel</button>
      </div>
    </div>
    
  </article>
</template>


<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import defaultAvatar from '@/assets/default-avatar.webp';
import { withApiBase } from '@/utils/api';
import axios from 'axios';

const emit = defineEmits(['deleted']);

const props = defineProps({
  rating: { type: Object, required: true },
  // If provided, will navigate to named route with param 'username'
  profileRouteName: { type: String, default: '' },
  // Optionally provide which param name to use (e.g. 'username' or 'id')
  profileParam: { type: String, default: 'username' }
});

const router = useRouter();

// Determine if this is a reply (has parent_id) or root comment
const isReply = computed(() => {
  return props.rating.parent_id != null || props.rating.parent != null;
});

// Get comment text from either 'text' (pure Comment) or 'comment' (Rating+Comment)
const commentText = computed(() => {
  const text = props.rating.text || props.rating.comment || '';
  return text.length > 1000 ? text.slice(0, 1000) + '...' : text;
});

// Local state for like count and liked status - only track after user interacts
const hasUserInteracted = ref(false);
const localLikeCount = ref(props.rating.like_count || 0);
const isLiked = ref(props.rating.is_liked || false);

// Computed properties that show correct data
const displayLikeCount = computed(() => {
  if (hasUserInteracted.value) {
    return localLikeCount.value;
  }
  return props.rating.like_count || 0;
});

const displayIsLiked = computed(() => {
  if (hasUserInteracted.value) {
    return isLiked.value;
  }
  return props.rating.is_liked || false;
});

// Edit mode state
const isEditing = ref(false);
const editedText = ref('');
const saving = ref(false);

// Check if current user is the owner of this comment
const isOwner = computed(() => {
  const loggedInUser = localStorage.getItem('username');
  if (!loggedInUser) return false;
  
  const commentOwner = props.rating.user?.username || props.rating.username;
  return loggedInUser === commentOwner;
});

const userValue = computed(() => {
  // If there's a user object, use it
  if (props.rating?.user) {
    return props.rating.user;
  }
  // If there's just a username string (from Comment serializer), create a minimal user object
  if (props.rating?.username) {
    return { username: props.rating.username };
  }
  return null;
});

const displayName = computed(() => {
  const u = userValue.value;
  if (!u) return 'Anonymous';
  if (typeof u === 'string') return u;
  return u.username || u.name || u.displayName || 'User';
});

const username = computed(() => {
  const u = userValue.value;
  if (!u) return '';
  if (typeof u === 'string') return u;
  // prefer username, then id as string
  return u.username || (u.id ? String(u.id) : '');
});

const profileLink = computed(() => {
  const uname = username.value;
  if (!uname) return '#';
  if (props.profileRouteName) {
    // build named route object
    return { name: props.profileRouteName, params: { [props.profileParam]: uname } };
  }
  // default path-based profile
  return `/profile/${encodeURIComponent(uname)}`;
});

// Compute avatar src robustly: prefer rating.user.photo when provided by API.
const avatarSrc = computed(() => {
  // Try to get photo from user object first
  const user = props.rating && props.rating.user;
  let photo = user && (user.photo || user.photo_url || user.photoUrl);
  
  // If no photo from user object, try user_photo field (from Comment serializer)
  if (!photo && props.rating.user_photo) {
    photo = props.rating.user_photo;
  }
  
  if (!photo) return defaultAvatar;
  
  // If it's already absolute, use as-is
  if (/^https?:\/\//i.test(photo)) return photo;
  // If it starts with '/', assume it's a path served by the API (use withApiBase to make full URL)
  if (photo.startsWith('/')) return withApiBase(photo);
  // otherwise return as-is
  return photo;
});

// Toggle like function
async function toggleLike() {
  const token = localStorage.getItem('access');
  if (!token) {
    // Redirect to login if not authenticated
    router.push({ name: 'login' });
    return;
  }

  // Use comment_id (for combined rating+comment) or id (for pure comment/reply)
  const commentId = props.rating.comment_id || props.rating.id;
  
  if (!commentId) {
    console.error('No comment ID available');
    return;
  }
  
  const url = withApiBase(`/movies/comments/${commentId}/like/`);
  
  try {
    const response = await axios.post(
      url,
      {},
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    // Update local state with response
    isLiked.value = response.data.liked;
    localLikeCount.value = response.data.like_count;
    hasUserInteracted.value = true;
    
    // Also update parent object to keep it in sync
    props.rating.is_liked = response.data.liked;
    props.rating.like_count = response.data.like_count;
  } catch (error) {
    console.error('Error toggling like:', error);
    // Optionally show an error message to the user
  }
}

// Edit functions
function startEdit() {
  editedText.value = props.rating.text || props.rating.comment || '';
  isEditing.value = true;
}

function cancelEdit() {
  isEditing.value = false;
  editedText.value = '';
}

async function saveEdit() {
  const token = localStorage.getItem('access');
  if (!token) {
    router.push({ name: 'login' });
    return;
  }

  if (editedText.value.length > 1000) {
    alert('Comment text cannot exceed 1000 characters.');
    return;
  }

  const commentId = props.rating.comment_id || props.rating.id;
  if (!commentId) {
    console.error('No comment ID available');
    return;
  }

  saving.value = true;

  try {
    const url = withApiBase(`/movies/comments/${commentId}/`);
    await axios.patch(
      url,
      { text: editedText.value },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    // Update the local display
    if (props.rating.text !== undefined) {
      props.rating.text = editedText.value;
    }
    if (props.rating.comment !== undefined) {
      props.rating.comment = editedText.value;
    }

    isEditing.value = false;
  } catch (error) {
    console.error('Error saving edit:', error.response?.data || error.message);
    alert('Failed to save changes. Please try again.');
  } finally {
    saving.value = false;
  }
}

async function deleteComment() {
  const token = localStorage.getItem('access');
  if (!token) {
    router.push({ name: 'login' });
    return;
  }

  const commentId = props.rating.comment_id || props.rating.id;
  if (!commentId) return;

  try {
    await axios.delete(withApiBase(`/movies/comments/${commentId}/`), {
      headers: { Authorization: `Bearer ${token}` }
    });

    // Emitimos al padre para actualizar la lista localmente
    emit('deleted', commentId);
  } catch (err) {
    console.error('Error deleting comment:', err);
    alert('Failed to delete comment. Please try again.');
  }
}

const isReplying = ref(false);

function startReply() {
  isReplying.value = true;
  replyText.value = `@${displayName.value} `;
}

function cancelReply() {
  isReplying.value = false;
  replyText.value = '';
}


function sendReply() {
  // Emitimos el texto de la reply al padre
  emit('reply', replyText.value);
  isReplying.value = false;
  replyText.value = '';
}

const replyText = ref('');
const prefix = ref(`@${displayName.value} `);


function checkPrefix(e) {
  if (!replyText.value.startsWith(prefix.value)) {
    replyText.value = prefix.value;
    // opcional: mover el cursor al final
    nextTick(() => {
      const textarea = e.target;
      textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
    });
  }
}


</script>

<style scoped>
.user-rating-card {
  background: var(--card);
  color: var(--text);
  padding: 1rem;
  border-radius: 10px;
  box-shadow: 0 6px 14px rgba(0,0,0,0.18);
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

/* Styling for replies - lighter background, less padding */
.user-rating-card.reply-card {
  background: rgba(255, 255, 255, 0.02);
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  padding: 0.875rem;
  border-left: 3px solid var(--primary);
}

.header-row { display:flex; justify-content:space-between; align-items:flex-start; gap:1rem }

/* When it's a reply, user section takes full width since no scores */
.reply-card .header-row { justify-content: flex-start; }

.scores { display:flex; gap:1rem; align-items:center }
.overall {
  font-size:1.5rem;
  font-weight:700;
  background: rgba(255,255,255,0.03);
  padding:0.35rem 0.6rem;
  border-radius:8px;
  min-width:52px;
  text-align:center;
}
.aspects { display:flex; flex-direction:column; gap:0.2rem; font-size:0.95rem; color:var(--muted) }
.aspect strong { color: var(--text); }
.user { margin-left:auto; display:flex; align-items:center }

/* In replies, user section doesn't need auto margin */
.reply-card .user { margin-left: 0; }

.user-info { display:flex; align-items:center; gap: .5rem }
.avatar-link { display:inline-flex }
.avatar { width:36px; height:36px; border-radius:50%; object-fit:cover; border:1px solid rgba(0,0,0,0.06); margin-left:0.2rem; }
.username { color: var(--primary); text-decoration:none; font-weight:600 }
.username:hover { text-decoration:underline }
.comment { 
  margin-top:1.5rem; 
  color: var(--text); 
  font-style:italic;
  word-wrap: break-word;
  overflow-wrap: break-word;
  max-height: 150px;
  overflow-y: auto;
  margin-left: auto;
  margin-right: auto;
  white-space: pre-wrap;
}

/* Replies have less top margin for comment text */
.reply-card .comment {
  margin-top: 1rem;
}

.no-comment { margin-top:0.8rem; color: var(--muted); font-style:italic }

.action-buttons { 
  margin-top: auto; 
  padding-top: 1rem;
  display:flex; 
  flex-direction:row; 
  align-items:center; 
  justify-content:flex-end;
  gap:1rem;
  font-size:0.95rem;
}

.edit-button {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 0.25rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
  transition: color 0.2s;
  margin-right: 0;
}

.edit-button:hover {
  color: #3b82f6;
}

.delete-button {
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
  padding: 0.25rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
  transition: color 0.2s;
  margin-right: 420px;
}

.delete-button:hover {
  color: #c21717;
}


.like-button {
  background: none;
  border: none;
  color: #3b82f6;
  cursor: pointer;
  padding: 0;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.95rem;
  transition: color 0.2s;
}

.like-button:hover {
  color: #1d4ed8;
}

.like-button.liked {
  color: #ef4444;
}

.like-button.liked:hover {
  color: #dc2626;
}

.like-icon {
  display: inline-block;
  vertical-align: middle;
  margin-bottom: -2px;
}

.blue-link { color: #3b82f6; text-decoration:none; font-weight:500; display:inline-flex; align-items:center; gap:0.25rem }
.blue-link:hover { text-decoration:underline }
.chat-icon { display:inline-block; vertical-align:middle; margin-bottom: -2px }

/* Edit form styles */
.comment-section {
  margin-top: 1.5rem;
}

.reply-card .comment-section {
  margin-top: 1rem;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.edit-textarea {
  width: 100%;
  min-height: 100px;
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.2);
  color: var(--text);
  font-family: inherit;
  font-size: 0.95rem;
  resize: vertical;
  box-sizing: border-box;
}

.edit-textarea:focus {
  outline: none;
  border-color: var(--primary);
}

.char-counter {
  font-size: 0.85rem;
  color: var(--muted);
  text-align: right;
}

.char-counter.at-limit {
  color: #f59e0b;
}

.char-counter.over-limit {
  color: #ef4444;
}

.edit-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.save-btn,
.cancel-btn {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  border: none;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.save-btn {
  background: var(--primary);
  color: white;
}

.save-btn:hover:not(:disabled) {
  background: #1d4ed8;
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cancel-btn {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
}

.cancel-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
}

.cancel-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.reply-button {
  background: none;
  border: none;
  color: #3b82f6;
  cursor: pointer;
  padding: 0.25rem;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.95rem;
}

.reply-button:hover {
  color: #1d4ed8;
}

.reply-form {
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

</style>
