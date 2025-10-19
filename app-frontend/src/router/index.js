import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import MovieInfo from '@/views/MovieInfo.vue' // 👈 importa el nuevo componente

const routes = [
  { path: '/', name: 'home', component: HomeView },
  {
    path: '/movie/:tconst',     // 👈 nueva ruta dinámica
    name: 'movie-info',
    component: MovieInfo,
    props: true
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

export default router
