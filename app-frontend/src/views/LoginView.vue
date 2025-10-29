<template>
  <header class="header">
    <div class="brand"><span class="dot"></span> CINEMA UB</div>
    <div class="actions"><router-link to="/"><button class="ghost">← Home</button></router-link></div>
  </header>
  <main class="container auth">
    <section class="authCard">
      <h1 style="margin:0 0 .5rem">Log in</h1>
      <p style="color:#94a3b8; margin:0 0 1rem">Placeholder page</p>
      <form @submit.prevent="noop" style="display:grid;gap:.75rem">
        <input class="input" type="email" placeholder="Email" required>
        <input class="input" type="password" placeholder="Password" required>
        <button type="submit">Log in</button>
      </form>
    </section>
  </main>

</template>
<script setup>
    const noop = () => {}
</script>