<template>
  <article class="user-rating-card">
    <div class="header-row">
      <div class="scores">
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

    <p v-if="rating.comment" class="comment">"{{ rating.comment.length > 1000 ? rating.comment.slice(0, 1000) + '...' : rating.comment }}"</p>

    <!-- Action buttons -->
    <div v-if="rating.comment_id" class="action-buttons">
      <!-- Like button -->
      <button class="like-button" :class="{ 'liked': isLiked }" @click="toggleLike">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" :fill="isLiked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="like-icon">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
        {{ localLikeCount }}
      </button>
      
      <!-- Link to view replies -->
      <router-link :to="{ name: 'comment-replies', params: { tconst: rating.movie_info?.tconst, comment: 'comment', comment_id: rating.comment_id } }" class="blue-link">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chat-icon">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        {{ rating.reply_count || 0 }}
      </router-link>
    </div>
  </article>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import defaultAvatar from '@/assets/default-avatar.webp';
import { withApiBase } from '@/utils/api';
import axios from 'axios';

const props = defineProps({
  rating: { type: Object, required: true },
  // If provided, will navigate to named route with param 'username'
  profileRouteName: { type: String, default: '' },
  // Optionally provide which param name to use (e.g. 'username' or 'id')
  profileParam: { type: String, default: 'username' }
});

const router = useRouter();

// Local state for like count and liked status
const localLikeCount = ref(props.rating.like_count || 0);
const isLiked = ref(props.rating.is_liked || false);

const userValue = computed(() => props.rating?.user || null);

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
  const user = props.rating && props.rating.user;
  const photo = user && (user.photo || user.photo_url || user.photoUrl);
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

  // Use comment_id (required for this component to show action buttons)
  const commentId = props.rating.comment_id;
  
  if (!commentId) {
    console.error('No comment_id available for this rating');
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
  } catch (error) {
    console.error('Error toggling like:', error);
    // Optionally show an error message to the user
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
}
.header-row { display:flex; justify-content:space-between; align-items:flex-start; gap:1rem }
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
.no-comment { margin-top:0.8rem; color: var(--muted); font-style:italic }

.action-buttons { 
  margin-top:1rem; 
  display:flex; 
  flex-direction:row; 
  align-items:center; 
  justify-content:flex-end;
  gap:1rem;
  font-size:0.95rem;
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
</style>
