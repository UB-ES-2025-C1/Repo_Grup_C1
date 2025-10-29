import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import MovieInfo from '@/views/MovieInfo.vue'
import RegisterView from '@/views/RegisterView.vue'   

const routes = [
  { path: '/', name: 'home', component: HomeView },
  {
    path: '/movie/:tconst',
    name: 'movie-info',
    component: MovieInfo,
    props: true
  },
  { path: '/register', name: 'register', component: RegisterView } 
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

export default router
