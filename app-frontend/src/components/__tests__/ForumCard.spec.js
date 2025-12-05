// app-frontend/src/components/__tests__/ForumCard.spec.js
import { mount } from '@vue/test-utils'
import ForumCard from '@/components/ForumCard.vue'

describe('MovieCard', () => {
  const BASE_URL = 'http://127.0.0.1:8000'

  const baseForum = {
    id: '1',
    title: 'title',
    description: 'description'
  }

  // Helper para montar la tarjeta
  const mountCard = (overrides = {}) =>
    mount(ForumCard, {
      props: {
        forum: baseForum,
        ...(overrides.props || {}),
      },
      global: {
        // Stub de router-link para no necesitar router real
        stubs: {
          'router-link': {
            template: '<a><slot /></a>',
          },
        },
        ...(overrides.global || {}),
      },
    })

  it('muestra el título y la descripcion del forum', () => {
    const wrapper = mountCard()
    const text = wrapper.text()

    expect(text).toContain('title')
    expect(text).toContain('description')
  })
})