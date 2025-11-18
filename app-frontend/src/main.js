import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './style.css'

// initialize axios interceptors (refresh / auth handling)
import './utils/http'

createApp(App).use(router).mount('#app')
