<template>
  <header class="header">
    <router-link to="/" class="brand">
      <span class="dot"></span> CINEMA UB
    </router-link>

    <!-- Two named slots for fine-grained control: `login` and `signup`.
         A full `actions` slot can still override both. -->
    <div class="actions">
      <slot name="actions">
        <!-- If logged in, show nothing here by default (you can provide a profile slot) -->
        <template v-if="isLoggedIn">
          <!-- Default when logged: show a simple Logout link placeholder (can be overridden) -->
           <slot name="logout">
            <router-link to="/login"><button class="logout ghost">Log out</button></router-link>
          </slot>
          <router-link to="/profile"><button class="profile-btn">
            <span>{{ username }}</span>
            <img :src="avatarUrl" alt="Avatar" class="avatar" />
          </button></router-link>
        </template>

        <!-- When not logged, render login and signup via named slots with defaults -->
        <template v-else>
          <slot name="login">
            <router-link to="/login"><button class="ghost">Log in</button></router-link>
          </slot>
          <slot name="signup">
            <router-link to="/register"><button>Sign up</button></router-link>
          </slot>
        </template>
      </slot>
    </div>
  </header>
</template>

<script setup>
import defaultAvatar from '@/assets/default-avatar.webp';
import { ref, onMounted, onUnmounted } from 'vue';
import axios from 'axios';
import { withApiBase } from '@/utils/api';

const isLoggedIn = ref(false);
const username = ref(null);
const avatarUrl = ref(null);

// Comprobar si ya está logueado
try {
    isLoggedIn.value = !!localStorage.getItem('access');
} catch (e) {
    isLoggedIn.value = false;
}

// Si está logueado, cargar los datos
onMounted(async () => {
  if (isLoggedIn.value) {
    username.value = localStorage.getItem('username');
    avatarUrl.value = localStorage.getItem('avatarUrl') || defaultAvatar;

    if (!username.value || !avatarUrl.value) {
      try {
        const response = await axios.get(withApiBase('/movies/profiles/me/'));
        
        const data = response.data;
        username.value = data.username;
        avatarUrl.value = data.photo || defaultAvatar;
        
        localStorage.setItem('username', username.value);
        localStorage.setItem('avatarUrl', avatarUrl.value);
      } catch (e) {
        console.error('Error loading user info', e);
      }
    }
    }
  });

  // Listen for profile updates in the same tab (ProfileView dispatches this)
  const onProfileUpdated = (ev) => {
    try {
      const photo = ev && ev.detail && ev.detail.photo;
      const name = ev && ev.detail && ev.detail.username;
      if (photo) {
        avatarUrl.value = photo;
        localStorage.setItem('avatarUrl', photo);
      }
      if (name) username.value = name;
    } catch (e) {
      // ignore
    }
  };
  window.addEventListener('profile-updated', onProfileUpdated);
  onUnmounted(() => window.removeEventListener('profile-updated', onProfileUpdated));
</script>

<style scoped>
/* Keep header styles consistent with existing views (relies on global CSS var definitions) */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
}

.brand {
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.brand .dot {
  width: 10px;
  height: 10px;
  background: #3b82f6;
  border-radius: 50%;
  display: inline-block;
}

.actions { display: inline-flex; gap: 0.5rem; }

.ghost { background: transparent; border: 1px solid #334155; color: var(--text); padding: 0.5rem 1rem; border-radius: 8px }

.logout {
  height: 100%;
}

.profile-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
}

.profile-btn .avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid #334155;
}
</style>
