<template>
  <div class="post">
    <div class="meta"
      :class="{'self-end ml-auto': isCurrentUser}"
    >
      <div class="author">
        <router-link :to="profileLink" class="avatar-link">
          <img class="avatar" :src="avatarSrc" :alt="`Avatar of ${displayName}`" />
        </router-link>
        <router-link v-if="username" :to="profileLink" class="username">{{ displayName }}</router-link>
        <span v-else class="username">{{ displayName }}</span>
      </div>
      <div class="content">{{ post.text }}</div>
      <div class="timestamp">{{ formatDate(post.created_at) }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import defaultAvatar from '@/assets/default-avatar.webp';
import { withApiBase } from '@/utils/api';

// --- PROPS ---
const props = defineProps({
  post: {
    type: Object,
    required: true,
  },
  // If provided, will navigate to named route with param 'username'
  profileRouteName: { type: String, default: '' },
  // Optionally provide which param name to use (e.g. 'username' or 'id')
  profileParam: { type: String, default: 'username' }
});

const myUsername = localStorage.getItem('username');

const isCurrentUser = computed(() => myUsername == props.post.username);

const userValue = computed(() => {
  return {
    'username': props.post.username,
    'photo': props.post.user_photo
  }
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
  const photo = props.post.user_photo;
  if (!photo) return defaultAvatar;
  // If it's already absolute, use as-is
  if (/^https?:\/\//i.test(photo)) return photo;
  // If it starts with '/', assume it's a path served by the API (use withApiBase to make full URL)
  if (photo.startsWith('/')) return withApiBase(photo);
  // otherwise return as-is
  return photo;
});

function formatDate(d) {
  return new Date(d).toLocaleString()
}
</script>

<style scoped>
.post {
  width: 100%;
  display: flex;
}

.meta {
  background: var(--card);
  color: var(--text);
  border-radius: 10px;
  border:2px solid rgba(0, 0, 0, 0.5);
  padding: 1rem;
  width: max-content;
  max-width: 80%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.self-end {
  margin-left: auto;
}

.author {
  display: flex;
  justify-content: flex-start;
}

.avatar-link { 
  display:inline-flex;
}

.avatar { 
  width:36px;
  height:36px;
  border-radius:50%;
  object-fit:cover;
  border:1px solid rgba(0,0,0,0.06);
  margin-left:0.2rem;
}

.username {
  color: var(--primary);
  text-decoration:none;
  font-weight:600;
  margin: auto;
  width: 100%;
  padding-left: 1rem;
}

.username:hover {
  text-decoration:underline;
}

.content {
  font-size: 1.2rem;
  max-width: 100%;
  word-wrap: break-word;
  overflow-wrap: break-word;
  white-space: normal;
}

.timestamp {
  font-size: 0.7rem;
}
</style>
