// src/views/__tests__/MovieInfo.spec.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import MovieInfo from '@/views/MovieInfo.vue'

// Mock de axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn()
  }
}))

// Mock de helpers de API
vi.mock('@/utils/api', () => ({
  getApiBaseUrl: () => 'http://api.test',
  withApiBase: (path) => `http://api.test${path}`
}))

import axios from 'axios'

// Película de ejemplo
const sampleMovie = {
  tconst: 'tt123',
  primaryTitle: 'Test Movie',
  startYear: '2001',
  description: 'A test movie description.',
  poster_path: '/static/posters/tt123.png',
  average_rating: 8.5,
  numVotes: 1234
}

// Rating de ejemplo
const sampleRating = {
  overall_score: 9,
  soundtrack: 8,
  acting: 9,
  cinematography: 10,
  plot: 9,
  comment: 'Great movie!'
}

// Helper para montar el componente con distintos escenarios
const mountMovieInfo = async ({
  movieOk = true,
  withToken = false,
  hasUserRating = false,
  ratingStatus = 404
} = {}) => {
  // Limpia mocks y localStorage
  axios.get.mockReset()
  window.localStorage.clear()

  if (withToken) {
    window.localStorage.setItem('access', 'fake-token')
  }

  // Mock de axios.get según la URL
  axios.get.mockImplementation(async (url, config) => {
    // Detalle de película
    if (url === 'http://api.test/movies/tt123/') {
      if (!movieOk) {
        throw new Error('Movie fetch failed')
      }
      return { data: sampleMovie }
    }

    // Rating del usuario
    if (url === 'http://api.test/movies/ratings/tt123/') {
      if (!withToken) {
        throw new Error('Should not be called without token')
      }
      if (hasUserRating) {
        return { data: sampleRating }
      } else {
        const err = new Error('Not found')
        err.response = { status: ratingStatus }
        throw err
      }
    }

    return { data: {} }
  })

  const wrapper = mount(MovieInfo, {
    props: {
      tconst: 'tt123'
    },
    global: {
      stubs: {
        'router-link': {
          template: '<a><slot /></a>'
        }
      }
    }
  })

  await flushPromises()
  return wrapper
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('MovieInfo', () => {
  it('muestra estado de carga inicialmente', async () => {
    // Montamos, pero NO esperamos a flushPromises aún
    axios.get.mockResolvedValueOnce({ data: sampleMovie })

    const wrapper = mount(MovieInfo, {
      props: { tconst: 'tt123' },
      global: {
        stubs: {
          'router-link': { template: '<a><slot /></a>' }
        }
      }
    })

    // Durante el primer render debe mostrar "Loading movie..."
    expect(wrapper.text()).toContain('Loading movie...')

    await flushPromises()
  })

  it('muestra los detalles de la película cuando la carga tiene éxito', async () => {
    const wrapper = await mountMovieInfo({
      movieOk: true,
      withToken: false
    })

    const text = wrapper.text()

    // Título, año, descripción
    expect(text).toContain('Test Movie (2001)')
    expect(text).toContain('A test movie description.')

    // Rating y votos
    expect(text).toContain('Rating:')
    expect(text).toContain('8.5')
    // numVotes.toLocaleString() -> depende del locale, pero debería incluir "1,234" o "1234"
    expect(text.replace(/[.,]/g, '')).toContain('1234')

    // Póster con base URL
    const img = wrapper.get('img')
    expect(img.attributes('src')).toBe('http://api.test' + sampleMovie.poster_path)
  })

  it('muestra mensaje de error cuando falla la carga de la película', async () => {
    const wrapper = await mountMovieInfo({
      movieOk: false
    })

    // Debería mostrar el mensaje de película no encontrada
    expect(wrapper.text()).toContain('Movie not found.')

    // No debe mostrar detalles de película
    expect(wrapper.find('.movie-details').exists()).toBe(false)
  })

  it('no muestra rating de usuario ni botón "Change Rating" si no hay token', async () => {
    const wrapper = await mountMovieInfo({
      movieOk: true,
      withToken: false
    })

    expect(wrapper.find('.user-rating-preview').exists()).toBe(false)

    // Buscar el botón dentro de .actions del componente MovieInfo, no del header
    const actionsDiv = wrapper.find('.movie-details .actions')
    const button = actionsDiv.get('button')
    expect(button.text()).toBe('Rate')

    // Con este escenario solo se debe haber llamado una vez (detalle de película)
    expect(axios.get).toHaveBeenCalledTimes(1)
  })

  it('muestra el rating del usuario y el botón "Change Rating" si hay token y rating', async () => {
    const wrapper = await mountMovieInfo({
      movieOk: true,
      withToken: true,
      hasUserRating: true
    })

    // Bloque de preview de rating del usuario
    const preview = wrapper.find('.user-rating-preview')
    expect(preview.exists()).toBe(true)

    const text = preview.text()
    expect(text).toContain('Your rating')
    expect(text).toContain('Overall: 9')
    expect(text).toContain('Soundtrack: 8')
    expect(text).toContain('Acting: 9')
    expect(text).toContain('Cinematography: 10')
    expect(text).toContain('Plot: 9')
    expect(text).toContain('Great movie!')

    // Buscar el botón dentro de .actions del componente MovieInfo, no del header
    const actionsDiv = wrapper.find('.movie-details .actions')
    const button = actionsDiv.get('button')
    expect(button.text()).toBe('Change Rating')

    // Debe haberse llamado 2 veces: detalle + rating
    expect(axios.get).toHaveBeenCalledTimes(2)
  })

  it('si hay token pero la API devuelve 404 de rating, se comporta como no valorada', async () => {
    const wrapper = await mountMovieInfo({
      movieOk: true,
      withToken: true,
      hasUserRating: false,
      ratingStatus: 404
    })

    // No hay bloque de rating de usuario
    expect(wrapper.find('.user-rating-preview').exists()).toBe(false)

    // Buscar el botón dentro de .actions del componente MovieInfo, no del header
    const actionsDiv = wrapper.find('.movie-details .actions')
    const button = actionsDiv.get('button')
    expect(button.text()).toBe('Rate')

    // Aun así se llama a ambas APIs
    expect(axios.get).toHaveBeenCalledTimes(2)
  })
})
