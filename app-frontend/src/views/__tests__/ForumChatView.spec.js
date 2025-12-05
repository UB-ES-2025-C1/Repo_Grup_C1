// src/views/__tests__/ForumChatView.spec.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ForumChatView from '@/views/ForumChatView.vue'
import axios from 'axios'

vi.mock('axios')

// Datos de prueba
const forumData = {
  id: 1,
  title: 'Test Forum'
}

const postsData = [
  {
    id: 1,
    text: 'First post',
    username: 'Alice'
  }
]

// Helper para montar el componente
function mountComponent(forumId = 1) {
  const ForumPostCardStub = { name: 'ForumPostCard', template: '<div class="forum-post-stub"></div>' }

  return mount(ForumChatView, {
    global: {
      stubs: {
        AppHeader: true,
        ForumPostCard: ForumPostCardStub
      }
    },
    props: { forumId },
    mocks: {
      $route: { params: { id: 1 } }
    }
  })
}

beforeAll(() => {
  global.EventSource = class {
    constructor(url) {
      this.url = url
      this.onmessage = null
      this.onerror = null
    }
    close() {}
  }
})

afterAll(() => {
  delete global.EventSource
})

describe('ForumChatView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('muestra mensaje de carga mientras se cargan datos', async () => {
    axios.get.mockReturnValue(new Promise(() => {})) // never resolves
    const wrapper = mountComponent()
    expect(wrapper.find('.empty').text()).toBe('Loading forum...')
  })

  it('carga y muestra el foro y posts correctamente', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/posts/')) return Promise.resolve({ data: postsData })
      return Promise.resolve({ data: forumData })
    })

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.find('.forum-title').text()).toBe('Test Forum')
    expect(wrapper.findAll('.forum-post-stub')).toHaveLength(postsData.length)
    expect(wrapper.find('.empty').exists()).toBe(false)
  })

  it('muestra mensaje de error si falla la carga', async () => {
    axios.get.mockRejectedValue(new Error('Network error'))

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.find('.empty').text()).toBe('⚠️ Failed to load forum.')
  })

  it('envía un post y limpia el input', async () => {
    axios.get.mockResolvedValue({ data: forumData })
    axios.post.mockResolvedValue({})

    const wrapper = mountComponent()
    await flushPromises()

    const input = wrapper.find('input[type="text"]')
    await input.setValue('Hello world')

    const button = wrapper.find('button.send-btn')
    await button.trigger('click')

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/movies/forums/1/posts/'),
      { text: 'Hello world' }
    )
    expect(wrapper.vm.postText).toBe('')
  })
})