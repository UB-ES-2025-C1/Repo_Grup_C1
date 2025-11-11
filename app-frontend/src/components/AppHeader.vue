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
          <router-link to="/profile"><button class="ghost">Profile</button></router-link>
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
import { ref } from 'vue';
const isLoggedIn = ref(false);
// Comprobar si ya está logueado
try {
    isLoggedIn.value = !!localStorage.getItem('access');
} catch (e) {
    isLoggedIn.value = false;
}
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
</style>
