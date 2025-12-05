<template>
  <AppHeader />

  <div class="forum-container">
    <!-- Mensajes de carga o error -->
    <div v-if="loading" class="empty">Loading forum...</div>
    <div v-else-if="error" class="empty">⚠️ {{ error }}</div>

    <template v-else>
      <h2 class="forum-title">{{ forum?.title }}</h2>

      <!-- Posts -->
      <div class="posts" ref="postsBox">
        <ForumPostCard
          v-for="post in posts"
          :key="post.id"
          :post="post"
          profileRouteName="user-profile"
          class="post"
        />
      </div>

      <!-- Chat input -->
      <div class="input-bar">
        <input
          type="text"
          placeholder="Write a post..."
          v-model="postText"
          @keyup.enter="sendpost"
        />

        <button
          class="send-btn"
          @click="sendpost"
          :disabled="sending"
        >
          Send
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
import AppHeader from '@/components/AppHeader.vue'
import ForumPostCard from '@/components/ForumPostCard.vue'
import axios from 'axios'
import { withApiBase } from '@/utils/api'
import { withSseBase } from '@/utils/sse'
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const forumId = route.params.id

// --- STATE ---
const forum = ref(null)
const posts = ref([])
const loading = ref(true)
const error = ref(null)

const postText = ref('')
const sending = ref(false)

// SSE
let sse = null
let clientId = localStorage.getItem('sse_client_id') || null

const postsBox = ref(null)

function scrollToBottom() {
  nextTick(() => {
    if (postsBox.value) {
      postsBox.value.scrollTop = postsBox.value.scrollHeight
    }
  })
}

// --- LOAD FORUM ---
onMounted(async () => {
  try {
    const resForum = await axios.get(withApiBase(`/movies/forums/${forumId}/`))
    forum.value = resForum.data

    const resPosts = await axios.get(withApiBase(`/movies/forums/${forumId}/posts/`))
    posts.value = resPosts.data || []
  } catch (err) {
    error.value = 'Failed to load forum.'
  } finally {
    loading.value = false
  }

  scrollToBottom()
  subscribeToForum()
})

onBeforeUnmount(() => {
  unsubscribeFromForum()
})

// --- SEND post ---
async function sendpost() {
  if (!postText.value.trim() || sending.value) return

  sending.value = true

  try {
    await axios.post(withApiBase(`/movies/forums/${forumId}/posts/`), {
      text: postText.value
    })

    postText.value = ''
  } catch (err) {
    console.error(err)
  } finally {
    sending.value = false
  }
}

// --- SSE SUBSCRIPTION ---
function subscribeToForum() {
  sse = new EventSource(withSseBase('/sse/stream'))

  sse.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      console.log(data)

      if (data.type === 'client_id') {
        clientId = data.client_id
        localStorage.setItem('sse_client_id', clientId)

        axios.post(`${withSseBase('/sse/subscribe')}/forum:${forumId}`, { client_id: clientId })
          .catch(console.warn)
        return
      }

      if (data.type === 'new_forum_post' && data.forum_info.id == forumId) {
        posts.value.push(data.forum_post)
        scrollToBottom()
      }

    } catch (err) {
      console.error('SSE parse error', err)
    }
  }

  sse.onerror = (err) => console.error('SSE error', err)
}

function unsubscribeFromForum() {
  if (!sse || !clientId) return

  axios.post(`${withSseBase('/sse/unsubscribe')}/forum:${forumId}`, {
    client_id: clientId
  }).catch(console.warn)

  sse.close()
  sse = null
}
</script>

<style scoped>
.forum-container {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 1rem;
}

.forum-title {
  font-size: 24px;
  margin-bottom: 1rem;
  font-weight: 700;
}

.posts {
  border: 1px solid #333;
  border-radius: 8px;
  padding: 1rem;
  height: 60vh;
  overflow-y: auto;
  background: #111827;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.input-bar {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
}

input[type="text"] {
  flex: 1;
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid #444;
  background: #1f2937;
  color: white;
}

.send-btn {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  background: #3b82f6;
  color: white;
  font-weight: bold;
  cursor: pointer;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.empty {
  text-align: center;
  margin-top: 3rem;
}
</style>