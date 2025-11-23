// src/components/__tests__/CommentCard.spec.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import CommentCard from '@/components/CommentCard.vue'

// Mock vue-router (component imports useRouter but doesn't call router methods in our tests)
vi.mock('vue-router', () => ({
  useRouter: () => ({})
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
})
