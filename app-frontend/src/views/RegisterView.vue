<template>
  <AppHeader>
    <template #actions>
      <div class="actions">
        <router-link to="/"><button class="ghost">← Home</button></router-link>
      </div>
    </template>
  </AppHeader>

  <main class="container auth">
    <section class="authCard">
      <h1 style="margin:0 0 .5rem">Sign up</h1>
      <p style="color:#94a3b8; margin:0 0 1rem">
        Create your account to enjoy CINEMA&nbsp;UB.
      </p>

      
      <form @submit.prevent="register" style="display:grid;gap:.75rem">
        <input class="input" v-model="username" type="text" placeholder="Name" required>
        <input class="input" v-model="email" type="email" placeholder="Email" required>
        <input class="input" v-model="password" type="password" placeholder="Password" required>
        <input class="input" v-model="confirmPassword" type="password" placeholder="Confirm Password" required>
        <button type="submit">Create account</button>
      </form>

      <p style="color:#94a3b8; margin-top:1rem; text-align:center">
        Already have an account?
        <router-link to="/login" style="color:#3b82f6; text-decoration:none; font-weight:500;">
          Log in
        </router-link>
      </p>

      <div v-if="loading" class="empty">Creating account...</div>
      <div v-if="success" style="color:green">{{ success }}</div>
      <div v-if="error.length">
        <p style="color:red">Error creating your account</p>
        <ul style="color:red; margin:0; padding-left:1rem">
          <li v-for="(msg, i) in error" :key="i">{{ msg }}</li>
        </ul>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref } from 'vue';
import AppHeader from '@/components/AppHeader.vue'
import axios from 'axios';
import { withApiBase } from '@/utils/api';

// --- ESTADO ---
const username = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const success = ref(null);
const error = ref([]);

// --- MÉTODOS (Acciones del usuario) ---
const register = async () => {
  error.value = [];
  success.value = null;

  // Validar contraseñas
  if (password.value !== confirmPassword.value) {
    error.value = ['Les contrasenyes no coincideixen.'];
    return;
  }

  loading.value = true;

  try {
    const response = await axios.post(withApiBase('/movies/register/'), {
      username: username.value,
      email: email.value,
      password: password.value
    });

    // Si el backend devuelve 201 o similar, es correcto
    loading.value = false;
    success.value = 'Compte creat correctament! Redirigint...';

    // TO DO: Se hace login o se lleva a la pagina de login (falta juntar login y registro)
    // Volver a la pagina de inicio
    window.location.href = '/login';
  } catch (err) {
    loading.value = false;
    if (err.response?.data) {
      // Mostrar los errores del backend
      const data = err.response.data;
      if (typeof data === 'object') {
        error.value = Object.values(data).flat();
      } else {
        error.value = [data];
      }
    } else {
      error.value = ['Error en crear el compte.'];
    }
  }
}

</script>
