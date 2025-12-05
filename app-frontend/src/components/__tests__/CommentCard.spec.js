// src/components/__tests__/CommentCard.spec.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import CommentCard from '@/components/CommentCard.vue'



// Mock axios
vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    patch: vi.fn()
  }
}))

import axios from 'axios'

// Mock vue-router
const pushMock = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: pushMock
  })
}))

// Mock utils/api helper so withApiBase returns predictable base
vi.mock('@/utils/api', () => ({
  withApiBase: (p) => `http://api.test${p}`
}))

// Mock the default avatar asset import to a known string (export as default)
vi.mock('@/assets/default-avatar.webp', () => ({ default: 'DEFAULT_AVATAR' }))

describe('CommentCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    pushMock.mockReset()
    axios.post.mockReset()
    axios.patch.mockReset()
  })

  it('renders scores, aspects and comment, and resolves relative photo with withApiBase', () => {
    const rating = {
      overall_score: 8,
      soundtrack: 7,
      acting: 9,
      cinematography: 8,
      plot: 7,
      comment: 'Lovely',
      user: { username: 'alice', photo: '/media/avatars/alice.png' }
    }

    const wrapper = mount(CommentCard, {
      props: { rating },
      global: { stubs: { 'router-link': { template: '<a><slot /></a>' } } }
    })

    const text = wrapper.text()
    expect(text).toContain('8')
    expect(text).toContain('Soundtrack:')
    expect(text).toContain('Acting:')
    expect(text).toContain('Cinematography:')
    expect(text).toContain('Plot:')
    expect(text).toContain('Lovely')

    const img = wrapper.get('img')
    expect(img.attributes('src')).toBe('http://api.test/media/avatars/alice.png')
  })

  it('uses absolute photo URL as-is', () => {
    const rating = {
      overall_score: 5,
      comment: 'OK',
      user: { username: 'bob', photo: 'https://cdn.example.com/bob.jpg' }
    }

    const wrapper = mount(CommentCard, {
      props: { rating },
      global: { stubs: { 'router-link': { template: '<a><slot /></a>' } } }
    })

    const img = wrapper.get('img')
    expect(img.attributes('src')).toBe('https://cdn.example.com/bob.jpg')
  })

  it('falls back to default avatar and Anonymous when no user provided', () => {
    const rating = {
      overall_score: null,
      comment: ''
      // no user
    }

    const wrapper = mount(CommentCard, {
      props: { rating },
      global: { stubs: { 'router-link': { template: '<a><slot /></a>' } } }
    })

    expect(wrapper.text()).toContain('Anonymous')
    const img = wrapper.get('img')
    expect(img.attributes('src')).toBe('DEFAULT_AVATAR')
  })

  // === Tests for Like Functionality ===

  it('displays like count and liked state correctly from props', () => {
    const rating = {
      id: 1,
      comment: 'Great movie!',
      user: { username: 'testuser' },
      like_count: 5,
      is_liked: true
    }

    const wrapper = mount(CommentCard, {
      props: { rating },
      global: { stubs: { 'router-link': { template: '<a><slot /></a>' } } }
    })

    const likeButton = wrapper.find('.like-button')
    expect(likeButton.exists()).toBe(true)
    expect(likeButton.text()).toContain('5')
    expect(likeButton.classes()).toContain('liked')
  })

  it('toggles like when like button is clicked (authenticated)', async () => {
    localStorage.setItem('access', 'fake-token')
    
    const rating = {
      id: 123,
      comment: 'Nice film',
      user: { username: 'alice' },
      like_count: 3,
      is_liked: false
    }

    axios.post.mockResolvedValueOnce({
      data: { liked: true, like_count: 4 }
    })

    const wrapper = mount(CommentCard, {
      props: { rating },
      global: { stubs: { 'router-link': { template: '<a><slot /></a>' } } }
    })

    const likeButton = wrapper.find('.like-button')
    await likeButton.trigger('click')
    await flushPromises()

    // Should call the like API
    expect(axios.post).toHaveBeenCalledWith(
      'http://api.test/movies/comments/123/like/',
      {},
      { headers: { Authorization: 'Bearer fake-token' } }
    )

    // Should update the display
    expect(likeButton.text()).toContain('4')
    expect(likeButton.classes()).toContain('liked')
  })

  it('redirects to login when like button clicked without authentication', async () => {
    // No token in localStorage
    
    const rating = {
      id: 123,
      comment: 'Nice',
      user: { username: 'bob' },
      like_count: 0,
      is_liked: false
    }

    const wrapper = mount(CommentCard, {
      props: { rating },
      global: { stubs: { 'router-link': { template: '<a><slot /></a>' } } }
    })

    const likeButton = wrapper.find('.like-button')
    await likeButton.trigger('click')
    await flushPromises()

    expect(pushMock).toHaveBeenCalledWith({ name: 'login' })
    expect(axios.post).not.toHaveBeenCalled()
  })

  it('updates like count when unlike is clicked', async () => {
    localStorage.setItem('access', 'fake-token')
    
    const rating = {
      id: 456,
      comment: 'Excellent',
      user: { username: 'charlie' },
      like_count: 10,
      is_liked: true
    }

    axios.post.mockResolvedValueOnce({
      data: { liked: false, like_count: 9 }
    })

    const wrapper = mount(CommentCard, {
      props: { rating },
      global: { stubs: { 'router-link': { template: '<a><slot /></a>' } } }
    })

    const likeButton = wrapper.find('.like-button')
    await likeButton.trigger('click')
    await flushPromises()

    expect(likeButton.text()).toContain('9')
    expect(likeButton.classes()).not.toContain('liked')
  })

  // === Tests for Reply Count Display ===

  it('displays reply count for root comments', () => {
    const rating = {
      id: 1,
      comment: 'Root comment',
      user: { username: 'user1' },
      like_count: 2,
      is_liked: false,
      reply_count: 7,
      parent_id: null,
      movie_info: { tconst: 'tt123456' }
    }

    const wrapper = mount(CommentCard, {
      props: { rating },
      global: { stubs: { 'router-link': { template: '<a><slot /></a>' } } }
    })

    expect(wrapper.text()).toContain('7')
    const replyLink = wrapper.find('.blue-link')
    expect(replyLink.exists()).toBe(true)
  })

  it('does not display reply count for reply comments (has parent_id)', () => {
    const rating = {
      id: 2,
      comment: 'This is a reply',
      user: { username: 'user2' },
      like_count: 0,
      is_liked: false,
      parent_id: 1 // This is a reply
    }

    const wrapper = mount(CommentCard, {
      props: { rating },
      global: { stubs: { 'router-link': { template: '<a><slot /></a>' } } }
    })

    const replyLink = wrapper.find('.blue-link')
    expect(replyLink.exists()).toBe(false)
  })

  it('shows 0 reply count when reply_count is undefined', () => {
    const rating = {
      id: 3,
      comment: 'No replies yet',
      user: { username: 'user3' },
      like_count: 1,
      is_liked: false,
      parent_id: null,
      movie_info: { tconst: 'tt999999' }
      // reply_count not provided
    }

    const wrapper = mount(CommentCard, {
      props: { rating },
      global: { stubs: { 'router-link': { template: '<a><slot /></a>' } } }
    })

    expect(wrapper.text()).toContain('0')
  })

  // === Tests for Edit-in-Place Functionality ===

  it('shows edit button only for comment owner', () => {
    localStorage.setItem('username', 'alice')
    
    const rating = {
      id: 100,
      parent_id: 1, // <-- Necesario para ser reply
      comment: 'My comment',
      user: { username: 'alice' },
      like_count: 0,
      is_liked: false
    }

    const wrapper = mount(CommentCard, {
      props: { rating },
      global: { stubs: { 'router-link': { template: '<a><slot /></a>' } } }
    })

    const editButton = wrapper.find('.edit-button')
    expect(editButton.exists()).toBe(true)
    expect(editButton.text()).toContain('Edit comment')
  })

  it('does not show edit button for other users comments', () => {
    localStorage.setItem('username', 'alice')
    
    const rating = {
      id: 101,
      comment: 'Someone elses comment',
      user: { username: 'bob' },
      like_count: 2,
      is_liked: false
    }

    const wrapper = mount(CommentCard, {
      props: { rating },
      global: { stubs: { 'router-link': { template: '<a><slot /></a>' } } }
    })

    const editButton = wrapper.find('.edit-button')
    expect(editButton.exists()).toBe(false)
  })

  it('enters edit mode when edit button is clicked', async () => {
    localStorage.setItem('username', 'alice')
    
    const rating = {
      id: 200,
      parent_id: 1, // <-- reply
      comment: 'Original text',
      user: { username: 'alice' },
      like_count: 0,
      is_liked: false
    }

    const wrapper = mount(CommentCard, {
      props: { rating },
      global: { stubs: { 'router-link': { template: '<a><slot /></a>' } } }
    })

    const editButton = wrapper.find('.edit-button')
    await editButton.trigger('click')
    await flushPromises()

    // Should show edit form
    const textarea = wrapper.find('.edit-textarea')
    expect(textarea.exists()).toBe(true)
    expect(textarea.element.value).toBe('Original text')

    // Should show save and cancel buttons
    expect(wrapper.find('.save-btn').exists()).toBe(true)
    expect(wrapper.find('.cancel-btn').exists()).toBe(true)

    // Edit button should be hidden
    expect(wrapper.find('.edit-button').exists()).toBe(false)
  })

  it('cancels edit and restores original text when cancel is clicked', async () => {
    localStorage.setItem('username', 'alice')
    
    const rating = {
      id: 300,
      parent_id: 1, // <-- reply
      comment: 'Original text',
      user: { username: 'alice' },
      like_count: 0,
      is_liked: false
    }

    const wrapper = mount(CommentCard, {
      props: { rating },
      global: { stubs: { 'router-link': { template: '<a><slot /></a>' } } }
    })

    // Enter edit mode
    await wrapper.find('.edit-button').trigger('click')
    
    // Change text
    const textarea = wrapper.find('.edit-textarea')
    await textarea.setValue('Modified text')

    // Click cancel
    await wrapper.find('.cancel-btn').trigger('click')
    await flushPromises()

    // Should exit edit mode
    expect(wrapper.find('.edit-textarea').exists()).toBe(false)
    expect(wrapper.find('.edit-button').exists()).toBe(true)
    
    // Original text should still be shown
    expect(wrapper.text()).toContain('Original text')
  })

  it('saves edited comment when save button is clicked', async () => {
    localStorage.setItem('username', 'alice')
    localStorage.setItem('access', 'fake-token')
    
    const rating = {
      id: 400,
      parent_id: 1,  
      comment: 'Original text',
      user: { username: 'alice' },
      like_count: 0,
      is_liked: false
    }

    axios.patch.mockResolvedValueOnce({
      data: { text: 'Updated text' }
    })

    const wrapper = mount(CommentCard, {
      props: { rating },
      global: { stubs: { 'router-link': { template: '<a><slot /></a>' } } }
    })

    // Enter edit mode
    await wrapper.find('.edit-button').trigger('click')
    
    // Change text
    const textarea = wrapper.find('.edit-textarea')
    await textarea.setValue('Updated text')

    // Click save
    await wrapper.find('.save-btn').trigger('click')
    await flushPromises()

    // Should call PATCH API
    expect(axios.patch).toHaveBeenCalledWith(
      'http://api.test/movies/comments/400/',
      { text: 'Updated text' },
      { headers: { Authorization: 'Bearer fake-token' } }
    )

    // Should exit edit mode
    expect(wrapper.find('.edit-textarea').exists()).toBe(false)
    expect(wrapper.text()).toContain('Updated text')
  })

  it('shows character counter during edit', async () => {
    localStorage.setItem('username', 'alice')
    
    const rating = {
      id: 500,
      parent_id: 1,
      comment: 'Text',
      user: { username: 'alice' },
      like_count: 0,
      is_liked: false
    }

    const wrapper = mount(CommentCard, {
      props: { rating },
      global: { stubs: { 'router-link': { template: '<a><slot /></a>' } } }
    })

    // Enter edit mode
    await wrapper.find('.edit-button').trigger('click')
    
    // Check character counter
    expect(wrapper.find('.char-counter').exists()).toBe(true)
    expect(wrapper.find('.char-counter').text()).toContain('4 / 1000')

    // Type more text
    const textarea = wrapper.find('.edit-textarea')
    await textarea.setValue('This is a longer comment with more characters')
    
    expect(wrapper.find('.char-counter').text()).toContain('45 / 1000')
  })

  it('disables save button when text exceeds 1000 characters', async () => {
    localStorage.setItem('username', 'alice')
    
    const rating = {
      id: 600,
      parent_id: 1,
      comment: 'Short',
      user: { username: 'alice' },
      like_count: 0,
      is_liked: false
    }

    const wrapper = mount(CommentCard, {
      props: { rating },
      global: { stubs: { 'router-link': { template: '<a><slot /></a>' } } }
    })

    // Enter edit mode
    await wrapper.find('.edit-button').trigger('click')
    
    // Set text over limit
    const longText = 'a'.repeat(1001)
    const textarea = wrapper.find('.edit-textarea')
    await textarea.setValue(longText)
    await flushPromises()

    // Save button should be disabled
    const saveBtn = wrapper.find('.save-btn')
    expect(saveBtn.attributes('disabled')).toBeDefined()
  })

  it('redirects to login when trying to save without authentication', async () => {
    localStorage.setItem('username', 'alice')
    // No access token
    
    const rating = {
      id: 700,
      parent_id: 1,
      comment: 'Text',
      user: { username: 'alice' },
      like_count: 0,
      is_liked: false
    }

    const wrapper = mount(CommentCard, {
      props: { rating },
      global: { stubs: { 'router-link': { template: '<a><slot /></a>' } } }
    })

    // Enter edit mode
    await wrapper.find('.edit-button').trigger('click')
    
    // Try to save
    await wrapper.find('.save-btn').trigger('click')
    await flushPromises()

    expect(pushMock).toHaveBeenCalledWith({ name: 'login' })
    expect(axios.patch).not.toHaveBeenCalled()
  })

  it('works with comment_id field (combined rating+comment)', async () => {
    localStorage.setItem('access', 'fake-token')
    
    const rating = {
      comment_id: 999,
      comment: 'Combined comment',
      user: { username: 'user' },
      like_count: 5,
      is_liked: false,
      overall_score: 8
    }

    axios.post.mockResolvedValueOnce({
      data: { liked: true, like_count: 6 }
    })

    const wrapper = mount(CommentCard, {
      props: { rating },
      global: { stubs: { 'router-link': { template: '<a><slot /></a>' } } }
    })

    const likeButton = wrapper.find('.like-button')
    await likeButton.trigger('click')
    await flushPromises()

    // Should use comment_id
    expect(axios.post).toHaveBeenCalledWith(
      'http://api.test/movies/comments/999/like/',
      {},
      { headers: { Authorization: 'Bearer fake-token' } }
    )
  })

  it('shows delete button only for comment owner', () => {
    localStorage.setItem('username', 'alice')
    const wrapper = mount(CommentCard, {
      props: {
        rating: {
          id: 1,
          parent_id: 123, // esto hace que isReply=true
          user: { username: 'alice' },
          comment: 'Test comment'
        }
      }
    })
    expect(wrapper.find('.delete-button').exists()).toBe(true)
  })

  it('does not show delete button for other users comments', () => {
    localStorage.setItem('username', 'bob') // no es el dueño
    const wrapper = mount(CommentCard, {
      props: {
        rating: {
          id: 1,
          parent_id: 123,
          user: { username: 'alice' },
          comment: 'Test comment'
        }
      }
    })
    expect(wrapper.find('.delete-button').exists()).toBe(false)
  })
  

  // === Tests for Reply Form ===

  it('shows reply form when reply button is clicked', async () => {
    localStorage.setItem('username', 'alice')
    localStorage.setItem('access', 'token')
    const wrapper = mount(CommentCard, {
      props: {
        rating: { id: 1, parent_id: 123, user: { username: 'bob' }, comment: 'Replyable comment' }
      }
    })

    await wrapper.find('.reply-button').trigger('click')
    expect(wrapper.find('.reply-form').exists()).toBe(true)
  })

  it('does not show reply form for unauthenticated users', async () => {
    localStorage.removeItem('access')

    const wrapper = mount(CommentCard, {
      props: {
        rating: { id: 1, parent_id: 123, user: { username: 'bob' }, comment: 'Replyable comment' }
      },
      global: {
        stubs: { 'router-link': { template: '<a><slot /></a>' } }
      }
    })

    await wrapper.find('.reply-button').trigger('click')

    expect(pushMock).toHaveBeenCalledWith('/login')

    expect(wrapper.find('.reply-form').exists()).toBe(false)
  })
})