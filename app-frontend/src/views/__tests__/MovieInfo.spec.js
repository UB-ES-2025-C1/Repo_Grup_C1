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
    window.localStorage.setItem('refresh', 'fake-token')
    window.localStorage.setItem('username', 'fake-username')
    window.localStorage.setItem('avatar', 'fake-avatar')
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
    expect(text).toContain('Overall rating:')
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

    const button = wrapper.get('button.primary')
    expect(button.text()).toBe('Rate')

    // Con este escenario solo se debe haber llamado dos veces (detalle de película + public comments)
    expect(axios.get).toHaveBeenCalledTimes(2)
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
    expect(text).toContain('9')
    expect(text).toContain('Soundtrack: 8')
    expect(text).toContain('Acting: 9')
    expect(text).toContain('Cinematography: 10')
    expect(text).toContain('Plot: 9')
    expect(text).toContain('Great movie!')

    const button = wrapper.get('button.primary')
    expect(button.text()).toBe('Change rating')

    const ghostButtons = wrapper.findAll('button.ghost') // NodeArray

    const deleteRatingBtn = ghostButtons.find(b => b.text().trim() === 'Delete rating')
    const deleteCommentBtn = ghostButtons.find(b => b.text().trim() === 'Delete comment')

    expect(deleteRatingBtn).toBeTruthy()
    expect(deleteCommentBtn).toBeTruthy()

    // Debe haberse llamado 3 veces: detalle + rating + public comments
    expect(axios.get).toHaveBeenCalledTimes(3)
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

    // Botón debe decir "Rate"
    const button = wrapper.get('button.primary')
    expect(button.text()).toBe('Rate')

    // Aun así se llama a las APIs: detalle + rating (404) + public comments
    expect(axios.get).toHaveBeenCalledTimes(3)
  })

  it('muestra solo las valoraciones que contienen comentario (filtra vacíos)', async () => {
    // Preparamos comentarios mixtos (algunos sin comment)
    const commentsResp = [
      { id: 1, overall_score: 7, comment: 'Nice', date: '2025-11-01T10:00:00Z' },
      { id: 2, overall_score: 6, comment: '', date: '2025-11-02T11:00:00Z' },
      { id: 3, overall_score: 8, comment: 'Another', date: '2025-11-03T12:00:00Z' }
    ]

    // Mock axios.get to return movie detail and the comments
    axios.get.mockImplementation(async (url) => {
      if (url === 'http://api.test/movies/tt123/') return { data: sampleMovie }
      if (url === 'http://api.test/movies/tt123/ratings/') return { data: commentsResp }
      // other endpoints (user rating) should not be called in this scenario
      return { data: {} }
    })

    const wrapper = mount(MovieInfo, {
      props: { tconst: 'tt123' },
      global: { stubs: { 'router-link': { template: '<a><slot /></a>' } } }
    })

    await flushPromises()

    // Solo se deben renderizar 2 comentarios (los no vacíos)
    const cards = wrapper.findAll('.comments-list .user-rating-card')
    expect(cards.length).toBe(2)

    // Orden: newest first -> 'Another' (2025-11-03) then 'Nice' (2025-11-01)
    expect(cards[0].text()).toContain('Another')
    expect(cards[1].text()).toContain('Nice')
  })

  it('ordena los comentarios por fecha (más recientes primero)', async () => {
    const commentsResp = [
      { id: 10, overall_score: 5, comment: 'Old', date: '2025-11-01T00:00:00Z' },
      { id: 11, overall_score: 8, comment: 'Newest', date: '2025-11-05T00:00:00Z' },
      { id: 12, overall_score: 7, comment: 'Mid', date: '2025-11-03T00:00:00Z' }
    ]

    axios.get.mockImplementation(async (url) => {
      if (url === 'http://api.test/movies/tt123/') return { data: sampleMovie }
      if (url === 'http://api.test/movies/tt123/ratings/') return { data: commentsResp }
      return { data: {} }
    })

    const wrapper = mount(MovieInfo, {
      props: { tconst: 'tt123' },
      global: { stubs: { 'router-link': { template: '<a><slot /></a>' } } }
    })

    await flushPromises()

    const cards = wrapper.findAll('.comments-list .user-rating-card')
    expect(cards.length).toBe(3)
    // Expect order: Newest, Mid, Old
    expect(cards[0].text()).toContain('Newest')
    expect(cards[1].text()).toContain('Mid')
    expect(cards[2].text()).toContain('Old')
  })

  it('pagina los comentarios mostrando solo `pageSize` por página y permite navegar', async () => {
    // Create 12 comments with non-empty comments
    const commentsResp = Array.from({ length: 12 }).map((_, i) => ({
      id: i + 1,
      overall_score: 6 + (i % 5),
      comment: `Comment ${i + 1}`,
      // newer items have larger timestamps
      date: new Date(Date.UTC(2025, 10, 30 - i)).toISOString()
    }))

    axios.get.mockImplementation(async (url) => {
      if (url === 'http://api.test/movies/tt123/') return { data: sampleMovie }
      if (url === 'http://api.test/movies/tt123/ratings/') return { data: commentsResp }
      return { data: {} }
    })

    const wrapper = mount(MovieInfo, {
      props: { tconst: 'tt123' },
      global: { stubs: { 'router-link': { template: '<a><slot /></a>' } } }
    })

    await flushPromises()

    // pageSize is 10, so first page shows 10 items
    let cards = wrapper.findAll('.comments-list .user-rating-card')
    expect(cards.length).toBe(10)

    // Pagination controls should be present and have 2 pages
    const pagination = wrapper.find('.comments-section .pagination')
    expect(pagination.exists()).toBe(true)
    // Click page 2
    const pageButtons = pagination.findAll('button')
    const page2 = pageButtons.find(b => b.text() === '2')
    expect(page2).toBeTruthy()
    await page2.trigger('click')
    await flushPromises()

    // Now the second page should show the remaining 2 items
    cards = wrapper.findAll('.comments-list .user-rating-card')
    expect(cards.length).toBe(2)
    expect(cards[0].text()).toContain('Comment 11')
    expect(cards[1].text()).toContain('Comment 12')
  })
})
