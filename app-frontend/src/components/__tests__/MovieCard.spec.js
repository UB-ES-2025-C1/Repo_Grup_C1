// app-frontend/src/components/__tests__/MovieCard.spec.js
import { mount } from '@vue/test-utils'
import MovieCard from '@/components/MovieCard.vue'

describe('MovieCard', () => {
  const BASE_URL = 'http://127.0.0.1:8000'

  const baseMovie = {
    tconst: 'tt1375666',
    primaryTitle: 'Inception',
    startYear: '2010',
    average_rating: 8.8,
    poster_path: '/media/posters/tt1375666.png',
  }

  // Helper para montar la tarjeta
  const mountCard = (overrides = {}) =>
    mount(MovieCard, {
      props: {
        movie: baseMovie,
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

  it('muestra el título y el año de la película', () => {
    const wrapper = mountCard()
    const text = wrapper.text()

    expect(text).toContain('Inception')
    expect(text).toContain('2010')
  })

  it('muestra el rating con el prefijo "Rating:"', () => {
    const wrapper = mountCard()
    const text = wrapper.text()

    expect(text).toContain('Rating:')
    expect(text).toContain(String(baseMovie.average_rating))
  })

  it('renderiza la imagen cuando poster_path está definido', () => {
    const wrapper = mountCard()
    const img = wrapper.find('img')

    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe(BASE_URL + baseMovie.poster_path)
    expect(img.attributes('alt')).toBe(`Poster of ${baseMovie.primaryTitle}`)
  })

  it('muestra el placeholder cuando no hay poster_path', () => {
    const wrapper = mountCard({
      props: {
        movie: {
          ...baseMovie,
          poster_path: null,
        },
      },
    })

    // No debería haber imagen
    expect(wrapper.find('img').exists()).toBe(false)

    // Sí debería haber placeholder
    const placeholder = wrapper.find('.poster-placeholder')
    expect(placeholder.exists()).toBe(true)
    expect(placeholder.text()).toContain('No image')
  })
})
