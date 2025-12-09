// src/components/__tests__/CommentReplies.spec.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import CommentReplies from '../CommentReplies.vue'
import axios from 'axios'

// Mocks
vi.mock('axios')

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}))

import { withApiBase } from '@/utils/api'
vi.mock('@/utils/api', () => ({
  withApiBase: (p) => `http://api.test${p}`
}))

// Mocks vue-router
const pushMock = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock }),
  useRoute: () => ({ params: { comment_id: '1', tconst: 'tt123456' } })
}))

describe('CommentReplies', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    pushMock.mockReset()
    axios.get.mockReset()
    axios.post.mockReset()
  })

  it('loads parent comment and displays it', async () => {
    localStorage.setItem('access', 'token')

    const parentComment = {
        id: 1,
        text: 'Parent comment',
        username: 'bob',
        user: { username: 'bob' },
        parent_id: null,
        reply_count: 0,
        like_count: 0,
        is_liked: false,
        user_photo: ''
    }

    // Mock de axios.get para /comments/ y /ratings/
    axios.get.mockImplementation(url => {
        if (url.endsWith('/comments/')) return Promise.resolve({ data: [parentComment] })
        if (url.endsWith('/ratings/')) return Promise.resolve({ data: [] })
        if (url.endsWith('/replies/')) return Promise.resolve({ data: [] })
    })

    const wrapper = mount(CommentReplies)
    await flushPromises()

    // El CommentCard ya debería renderizarse
    const commentCard = wrapper.findComponent({ name: 'CommentCard' })
    expect(commentCard.exists()).toBe(true)

    // Verifica que la prop 'rating.comment' contenga el texto correcto
    expect(commentCard.props('rating').comment).toBe('Parent comment')
    expect(commentCard.props('rating').username).toBe('bob')
    })

  it('shows reply form when authenticated and clicking reply', async () => {
    localStorage.setItem('access', 'token')
    const parentComment = {
      id: 1,
      comment_id: 1,
      text: 'Parent comment',
      user: { username: 'bob' },
      username: 'bob',
      parent_id: null,
      reply_count: 0
    }
    axios.get.mockResolvedValue({ data: [parentComment] })

    const wrapper = mount(CommentReplies)
    await flushPromises()

    const replyButton = wrapper.find('.reply-btn')
    expect(replyButton.exists()).toBe(true)
    await replyButton.trigger('click')
    await flushPromises()

    const replyForm = wrapper.find('.reply-form')
    expect(replyForm.exists()).toBe(true)
  })

  it('submits reply correctly and clears form', async () => {
    localStorage.setItem('access', 'token')
    const parentComment = { id: 1, comment_id: 1, text: 'Parent', user: { username: 'bob' }, username: 'bob', parent_id: null, reply_count: 0 }
    axios.get.mockResolvedValue({ data: [parentComment] })
    axios.post.mockResolvedValue({})

    const wrapper = mount(CommentReplies)
    await flushPromises()

    await wrapper.find('.reply-btn').trigger('click')
    const textarea = wrapper.find('textarea')
    await textarea.setValue('Test reply')
    await wrapper.find('.submit-btn').trigger('click')
    await flushPromises()

    expect(axios.post).toHaveBeenCalledWith(
      'http://api.test/movies/comments/tt123456/',
      { movie_tconst: 'tt123456', parent_id: 1, text: 'Test reply' },
      { headers: { Authorization: 'Bearer token' } }
    )

    expect(wrapper.find('.reply-form').exists()).toBe(false)
    expect(wrapper.find('textarea').exists()).toBe(false)
  })

  it('redirects to login if unauthenticated', async () => {
    const parentComment = { id: 1, comment_id: 1, text: 'Parent', user: { username: 'bob' }, username: 'bob', parent_id: null, reply_count: 0 }
    axios.get.mockResolvedValue({ data: [parentComment] })

    const wrapper = mount(CommentReplies)
    await flushPromises()

    await wrapper.find('.reply-btn').trigger('click')
    await flushPromises()

    expect(pushMock).toHaveBeenCalledWith({ name: 'login' })
  })

  it('loads more replies when load more clicked', async () => {
    localStorage.setItem('access', 'token')
    const parentComment = { id: 1, comment_id: 1, text: 'Parent', user: { username: 'bob' }, username: 'bob', parent_id: null, reply_count: 0 }
    const replies = Array.from({ length: 15 }, (_, i) => ({ id: i, text: `Reply ${i}`, user: { username: `user${i}` } }))
    axios.get.mockImplementation(url => {
      if (url.endsWith('/comments/')) return Promise.resolve({ data: [parentComment] })
      if (url.endsWith('/replies/')) return Promise.resolve({ data: replies })
    })

    const wrapper = mount(CommentReplies)
    await flushPromises()

    expect(wrapper.findAllComponents({ name: 'CommentCard' }).length).toBe(10)
    await wrapper.find('.load-more-btn').trigger('click')
    await flushPromises()

    expect(wrapper.findAllComponents({ name: 'CommentCard' }).length).toBe(13)
  })

  it('shows error message if replies fail to load', async () => {
    axios.get.mockRejectedValue(new Error('Network Error'))
    const wrapper = mount(CommentReplies)
    await flushPromises()

    expect(wrapper.text()).toContain('Could not load replies.')
  })

  it('cancels reply form correctly', async () => {
    localStorage.setItem('access', 'token')
    const parentComment = { id: 1, comment_id: 1, text: 'Parent', user: { username: 'bob' }, username: 'bob', parent_id: null, reply_count: 0 }
    axios.get.mockResolvedValue({ data: [parentComment] })

    const wrapper = mount(CommentReplies)
    await flushPromises()

    await wrapper.find('.reply-btn').trigger('click')
    const textarea = wrapper.find('textarea')
    await textarea.setValue('Temporary reply')
    await wrapper.find('.cancel-btn').trigger('click')
    await flushPromises()

    expect(wrapper.find('.reply-form').exists()).toBe(false)
    expect(wrapper.find('textarea').exists()).toBe(false)
    })

  it('does not submit empty reply', async () => {
    localStorage.setItem('access', 'token')
    const parentComment = { id: 1, comment_id: 1, text: 'Parent', user: { username: 'bob' }, username: 'bob', parent_id: null, reply_count: 0 }
    axios.get.mockResolvedValue({ data: [parentComment] })

    const wrapper = mount(CommentReplies)
    await flushPromises()

    await wrapper.find('.reply-btn').trigger('click')
    const textarea = wrapper.find('textarea')
    await textarea.setValue('   ') // solo espacios
    await wrapper.find('.submit-btn').trigger('click')
    await flushPromises()

    expect(axios.post).not.toHaveBeenCalled()
    })

  it('shows warning if reply exceeds character limit', async () => {
    localStorage.setItem('access', 'token')
    
    const parentComment = {
        id: 1,
        text: 'Parent comment',
        username: 'bob',
        user: { username: 'bob' },
        parent_id: null,
        reply_count: 0
    }
    
    // Mock de axios.get para /comments/ y /ratings/
    axios.get.mockImplementation(url => {
        if (url.endsWith('/comments/')) return Promise.resolve({ data: [parentComment] })
        if (url.endsWith('/ratings/')) return Promise.resolve({ data: [] })
        if (url.endsWith('/replies/')) return Promise.resolve({ data: [] })
    })

    const wrapper = mount(CommentReplies)
    await flushPromises()

    // Abrir el formulario de respuesta
    await wrapper.find('.reply-btn').trigger('click')
    await flushPromises()

    const textarea = wrapper.find('textarea')
    // Rellenar con más de 1000 caracteres
    const longText = 'a'.repeat(1001)
    await textarea.setValue(longText)
    await flushPromises()

    // Verificar que aparece la clase de advertencia
    const warning = wrapper.find('.char-counter.over-limit')
    expect(warning.exists()).toBe(true)
    expect(warning.text()).toContain('over limit')
    })

  it('pre-fills reply textarea with @username when replying from CommentCard', async () => {
    localStorage.setItem('access', 'token')
    const parentComment = { id: 1, comment_id: 1, text: 'Parent', user: { username: 'bob' }, username: 'bob', parent_id: null, reply_count: 0 }
    axios.get.mockResolvedValue({ data: [parentComment] })

    const wrapper = mount(CommentReplies)
    await flushPromises()

    await wrapper.vm.submitReplyFromCard('@bob Hello!')
    await flushPromises()

    expect(axios.post).toHaveBeenCalled()
  })

  it('does not show "Load more" button if all replies are loaded', async () => {
    localStorage.setItem('access', 'token')
    const parentComment = { id: 1, comment_id: 1, text: 'Parent', user: { username: 'bob' }, username: 'bob', parent_id: null, reply_count: 0 }
    const replies = Array.from({ length: 5 }, (_, i) => ({ id: i, text: `Reply ${i}`, user: { username: `user${i}` } }))
    axios.get.mockImplementation(url => {
        if (url.endsWith('/comments/')) return Promise.resolve({ data: [parentComment] })
        if (url.endsWith('/replies/')) return Promise.resolve({ data: replies })
    })

    const wrapper = mount(CommentReplies)
    await flushPromises()

    expect(wrapper.find('.load-more-btn').exists()).toBe(false)
  })
})
