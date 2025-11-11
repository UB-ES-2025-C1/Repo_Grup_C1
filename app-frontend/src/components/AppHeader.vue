<template>
  <header class="header">
    <router-link to="/" class="brand">
      <span class="dot"></span> CINEMA UB
    </router-link>

    <!-- Slot to override actions; default shows Login / Sign up buttons -->
    <slot name="actions">
      <div class="actions">
        <router-link to="/login"><button class="ghost">Log in</button></router-link>
      </div>
      <div class="actions">
        <router-link to="/register"><button>Sign up</button></router-link>
      </div>
    </slot>
  </header>
</template>

<script setup>
// No script needed yet; kept for future logic (e.g., show logout when authenticated)
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
  gap: .5rem;
}
.brand .dot {
  width: 10px;
  height: 10px;
  background: #3b82f6;
  border-radius: 50%;
  display: inline-block;
}
.actions { display: inline-flex; gap: .5rem; }
.ghost { background: transparent; border: 1px solid #334155; color: var(--text); padding: .5rem 1rem; border-radius: 8px }
</style>
