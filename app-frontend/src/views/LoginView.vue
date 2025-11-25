<template>
  <AppHeader>
    <template #actions>
      <div class="actions"><router-link to="/"><button class="ghost">← Home</button></router-link></div>
    </template>
  </AppHeader>
  <main class="container auth">
    <section class="authCard">
      <div v-if="isLoggedIn">
        <h1 style="margin:0 0 .5rem">Log out</h1>
        <p style="color:#94a3b8; margin:0 0 1rem">You are now logged in.</p>

        <p style="color:#94a3b8; margin:0 0 1rem">Would you like to log out?</p>

        <form @submit.prevent="logout" style="display:grid;gap:.75rem">
          <button type="submit" style="background-color:#f1807e">Log out</button>
        </form>
        <p style="color:#94a3b8; margin-top:1rem; text-align:center">
          Are you lost?
          <router-link to="/" style="color:#3b82f6; text-decoration:none; font-weight:500;">
            Go Home
          </router-link>
        </p>
      </div>
      <div v-else>
        <h1 style="margin:0 0 .5rem">Log in</h1>
        <p style="color:#94a3b8; margin:0 0 1rem">Welcome back! Please log in to your account.</p>

        <form @submit.prevent="login" style="display:grid;gap:.75rem">
          <input class="input" v-model="email" type="email" placeholder="Email" required>
          <input class="input" v-model="password" type="password" placeholder="Password" required>
          <button type="submit">Log in</button>
        </form>

        <p style="color:#94a3b8; margin-top:1rem; text-align:center">
          Do you not have an account yet?
          <router-link to="/register" style="color:#3b82f6; text-decoration:none; font-weight:500;">
            Sign up
          </router-link>
        </p>
      </div>

      <div v-if="loading" class="empty">Logging in...</div>
      <p v-if="error" style="color:red">{{ error }}</p>
    </section>
  </main>

</template>

<script setup>
import { ref, onMounted } from 'vue';
import AppHeader from '@/components/AppHeader.vue'
import axios from 'axios';
import { withApiBase } from '@/utils/api';
import { useRouter } from 'vue-router'

// --- ESTADO ---
const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref(null);
const isLoggedIn = ref(false);
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
    const data = response.data;
    localStorage.setItem('access', data.access);
    localStorage.setItem('refresh', data.refresh);

    // Obtener la información del perfil de usuario para el header
    try {
      const response2 = await axios.get(withApiBase('/movies/profiles/me/'));
      
      const data2 = response2.data;
      localStorage.setItem('username', username.value);
      localStorage.setItem('avatarUrl', avatarUrl.value);
    } catch (e) {
      console.error('Error loading user info', e);
    }

    loading.value = false;

    // Recuperar la última ruta guardada
    let redirect = null;
    try {
      redirect = sessionStorage.getItem('lastPath');
    } catch (e) {
      redirect = null;
    }

    // Validaciones de seguridad: debe ser ruta interna y no ser /login o /register
    if (redirect && typeof redirect === 'string') {
      // sólo permitir rutas internas que empiecen por '/'
      const forbidden = ['/login', '/register']
      if (redirect.startsWith('/') && !forbidden.includes(redirect)) {
        // limpiar y redirigir
        sessionStorage.removeItem('lastPath')
        router.push(redirect)
        return
      }
    }

    // Volver a la pagina de inicio
    router.push('/');
  } catch (err) {
    loading.value = false;
    if (err.response?.data?.detail) {
      // Mostrar los errores del backend
      error.value = err.response.data.detail[0];
    } else {
      error.value = 'Error logging in.';
    }
  }
}

const logout = async () => {
  try {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('username');
    localStorage.removeItem('avatarUrl');

    // Volver a la pagina de inicio
    router.push('/');
  } catch (e) {
    // ignore
    loading.value = false;
    if (err.response?.data?.detail) {
      // Mostrar los errores del backend
      error.value = err.response.data.detail[0];
    } else {
      error.value = 'Error logging out.';
    }
  }
  isLoggedIn.value = false;
}

onMounted(() => {
  // Comprobar si ya está logueado
  try {
    isLoggedIn.value = !!localStorage.getItem('access');
  } catch (e) {
    isLoggedIn.value = false;
  }
});

</script>