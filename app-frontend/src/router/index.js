import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import MovieInfo from '@/views/MovieInfo.vue'
import RegisterView from '@/views/RegisterView.vue'
import LoginView from '@/views/LoginView.vue'
import ProfileView from '@/views/ProfileView.vue'
import ForumHomeView from '@/views/ForumHomeView.vue'
import ForumChatView from '@/views/ForumChatView.vue'

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
  {
    path: '/movie/:tconst/:comment/:comment_id',
    name: 'comment-replies',
    component: () => import('@/views/CommentReplies.vue'),
    props: true
  },
  { path: '/register', name: 'register', component: RegisterView } ,
  { path: '/login', name: 'login', component: LoginView },
  {
    path: '/profile',
    name: 'my-profile',
    component: ProfileView,
    props: () => ({ username: 'me' }),
    meta: { requiresAuth: true }
  },
  {
    path: '/profile/:username',
    name: 'user-profile',
    component: ProfileView,
    props: true
  },
  { 
    path: '/forums',
    name: 'forums',
    component: ForumHomeView,
    meta: { requiresAuth: true }
  },
  {
    path: '/forums/:id',
    name: 'forum-chat',
    component: ForumChatView,
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

// guarda la última ruta visitada (excepto login/register)
router.beforeEach((to, from, next) => {
  // no guardar login/register
  const skipNames = ['login', 'register']
  if (!skipNames.includes(to.name)) {
    // Usa sessionStorage (se borra con la pestaña)
    try {
      sessionStorage.setItem('lastPath', to.fullPath)
    } catch (e) {
      // fallback silencioso
    }
  }
  next()
})

// se asegura que se haya iniciado sesion para las paginas que lo requieren
router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !isLoggedIn()) {
    next('/login')
  } else {
    next()
  }
})

// mira si el usuario esta autenticado
function isLoggedIn() {
  return !!localStorage.getItem('access')
}

export default router
