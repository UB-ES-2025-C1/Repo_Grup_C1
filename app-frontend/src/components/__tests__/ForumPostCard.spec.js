import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ForumPostCard from '@/components/ForumPostCard.vue'
import defaultAvatar from '@/assets/default-avatar.webp'

vi.mock('@/utils/api', () => ({ withApiBase: (path) => `http://test.com${path}` }))

describe('ForumPostCard', () => {
  let post

  beforeEach(() => {
    localStorage.clear()
    post = {
      text: 'Hello world',
      username: 'alice',
      user_photo: '/media/alice.webp',
      created_at: '2025-12-05T12:00:00Z'
    }
  })

  function mountComponent(props = {}) {
    return mount(ForumPostCard, {
      props: { post, ...props }
    })
  }

  it('carga el texto del post', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('.content').text()).toBe('Hello world')
  })

  it('carga el username del autor del post', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('.username').text()).toBe('alice')
  })

  it('usa el defaultAvatar si el autor no tiene foto', () => {
    post.user_photo = null
    const wrapper = mountComponent()
    expect(wrapper.find('img.avatar').attributes('src')).toBe(defaultAvatar)
  })

  it('usa la foto si el autor tiene una', () => {
    post.user_photo = 'https://example.com/alice.webp'
    const wrapper = mountComponent()
    expect(wrapper.find('img.avatar').attributes('src')).toBe('https://example.com/alice.webp')
  })

  it('detecta correctamente si el post es del autor', () => {
    localStorage.setItem('username', 'alice')
    const wrapper = mountComponent()
    expect(wrapper.find('.meta').classes()).toContain('self-end')
  })

  it('detecta correctamente si el post no es del autor', () => {
    localStorage.setItem('username', 'bob')
    const wrapper = mountComponent()
    expect(wrapper.find('.meta').classes()).not.toContain('self-end')
  })

  it('genera el link al perfil del autor con profileRouteName', () => {
    const wrapper = mountComponent({ profileRouteName: 'user-profile' })
    expect(wrapper.vm.profileLink).toEqual({ name: 'user-profile', params: { username: 'alice' } })
  })

  it('genera el link al perfil del autor sin profileRouteName', () => {
    const wrapper = mountComponent()
    expect(wrapper.vm.profileLink).toBe('/profile/alice')
  })

  it('aplica el formato correcto al timestamp', () => {
    const wrapper = mountComponent()
    const formatted = new Date(post.created_at).toLocaleString()
    expect(wrapper.find('.timestamp').text()).toBe(formatted)
  })
})