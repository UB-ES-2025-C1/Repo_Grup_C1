import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import MovieInfo from '@/views/MovieInfo.vue'
import RegisterView from '@/views/RegisterView.vue'
import LoginView from '@/views/LoginView.vue'

const routes = [
  { path: '/', name: 'home', component: HomeView },
  {
    path: '/movie/:tconst',
    name: 'movie-info',
    component: MovieInfo,
    props: true
  },
  {
    path: '/movie/:tconst/rate',
    name: 'movie-rate',
    // lazy-load the component
    component: () => import('@/views/RateMovie.vue'),
    props: true
  },
  { path: '/register', name: 'register', component: RegisterView } ,
  { path: '/login', name: 'login', component: LoginView } 
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

export default router
