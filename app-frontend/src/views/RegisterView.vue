<template>
  <header class="header">
    <div class="brand"><span class="dot"></span> CINEMA UB</div>
    <div class="actions">
      <router-link to="/"><button class="ghost">← Home</button></router-link>
    </div>
  </header>

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
        <button type="submit">Create account</button>
      </form>

      <p v-if="success" style="color:green">{{ success }}</p>
      <ul v-if="error.length" style="color:red; margin:0; padding-left:1rem">
        <li v-for="(msg, i) in error" :key="i">{{ msg }}</li>
      </ul>
    </section>
  </main>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios';

// --- ESTADO ---
const username = ref('')
const email = ref('')
const password = ref('')
const success = ref(null)
const error = ref([])

// --- MÉTODOS (Acciones del usuario) ---
const register = async () => {
  error.value = []
  success.value = null

  try {
    const response = await axios.post('http://127.0.0.1:8000/movies/register/', {
      username: username.value,
      email: email.value,
      password: password.value
    })

    // Si el backend devuelve 201 o similar, es correcto
    success.value = 'Compte creat correctament! Redirigint...'

    // TO DO: Se hace login o se lleva a la pagina de login (falta juntar login y registro)

  } catch (err) {
    if (err.response?.data) {
      // Mostrar los errores del backend
      const data = err.response.data
      if (typeof data === 'object') {
        error.value = Object.values(data).flat()
      } else {
        error.value = [data]
      }
    } else {
      error.value = ['Error en crear el compte.']
    }
  }
}
</script>
