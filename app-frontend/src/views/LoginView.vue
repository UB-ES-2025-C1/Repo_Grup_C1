<template>
  <header class="header">
    <div class="brand"><span class="dot"></span> CINEMA UB</div>
    <div class="actions"><router-link to="/"><button class="ghost">← Home</button></router-link></div>
  </header>
  <main class="container auth">
    <section class="authCard">
      <h1 style="margin:0 0 .5rem">Log in</h1>
      <p style="color:#94a3b8; margin:0 0 1rem">Placeholder page</p>

      <form @submit.prevent="login" style="display:grid;gap:.75rem">
        <input class="input" v-model="email" type="email" placeholder="Email" required>
        <input class="input" v-model="password" type="password" placeholder="Password" required>
        <button type="submit">Log in</button>
      </form>

      <div v-if="loading" class="empty">Logging in...</div>
      <p v-if="error" style="color:red">{{ error }}</p>
    </section>
  </main>

</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';
import { withApiBase } from '@/utils/api';
import { useRouter } from 'vue-router'

// --- ESTADO ---
const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref(null);
const router = useRouter();

// --- MÉTODOS (Acciones del usuario) ---
const login = async () => {
  loading.value = true;
  error.value = null;

  try {
    const response = await axios.post(withApiBase('/movies/login/'), {
      email: email.value,
      password: password.value
    });

    // Si el backend devuelve access y data es correcto
    loading.value = false;
    const data = response.data;
    localStorage.setItem('access', data.access);
    localStorage.setItem('refresh', data.refresh);

    // Volver a la pagina de inicio
    router.push('/');
  } catch (err) {
    loading.value = false;
    if (err.response?.data?.detail) {
      // Mostrar los errores del backend
      error.value = err.response.data.detail[0];
    } else {
      error.value = 'Error al iniciar sessió.';
    }
  }
}
</script>