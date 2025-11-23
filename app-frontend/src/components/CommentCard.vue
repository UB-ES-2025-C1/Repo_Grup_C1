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

    <p v-if="rating.comment" class="comment">"{{ rating.comment }}"</p>
  </article>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import defaultAvatar from '@/assets/default-avatar.webp';
import { withApiBase } from '@/utils/api';

const props = defineProps({
  rating: { type: Object, required: true },
  // If provided, will navigate to named route with param 'username'
  profileRouteName: { type: String, default: '' },
  // Optionally provide which param name to use (e.g. 'username' or 'id')
  profileParam: { type: String, default: 'username' }
});

const router = useRouter();

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
.comment { margin-top:1.5rem; color: var(--text); font-style:italic }
.no-comment { margin-top:0.8rem; color: var(--muted); font-style:italic }
</style>
