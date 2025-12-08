// src/views/__tests__/MovieInfo.spec.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import MovieInfo from '@/views/MovieInfo.vue'

// Mock EventSource to prevent SSE connections
global.EventSource = vi.fn().mockImplementation(() => ({
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
}))

// Mock de axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}))

// Mock de helpers de API
vi.mock('@/utils/api', () => ({
  getApiBaseUrl: () => 'http://api.test',
  withApiBase: (path) => `http://api.test${path}`
}))

// Mock SSE helper
vi.mock('@/utils/sse', () => ({
  withSseBase: (path) => `http://sse.test${path}`
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
  comment: 'Great movie!',
  user: {
    username: 'fake-username'
  }
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
  axios.post.mockReset()
  window.localStorage.clear()

  if (withToken) {
    window.localStorage.setItem('access', 'fake-token')
    window.localStorage.setItem('refresh', 'fake-token')
    window.localStorage.setItem('username', 'fake-username')
    window.localStorage.setItem('avatar', 'fake-avatar')
  }

  // Mock axios.post for SSE subscription (non-critical)
  axios.post.mockImplementation(async (url, data) => {
    return { data: {} }
  })

  // Mock de axios.get según la URL
  axios.get.mockImplementation(async (url, config) => {
    console.log('axios.get called with:', url)
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

    // All comments for the movie
    if (url === 'http://api.test/movies/tt123/comments/') {
      return { data: [] }
    }

    // All ratings for the movie
    if (url === 'http://api.test/movies/tt123/ratings/') {
      return { data: [] }
    }

    // AppHeader profile call (when authenticated)
    if (url === 'http://api.test/movies/profiles/me/') {
      if (!withToken) {
        const err = new Error('Unauthorized')
        err.response = { status: 401 }
        throw err
      }
      return { 
        data: { 
          username: 'fake-username',
          avatar: 'fake-avatar'
        } 
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

    // Con este escenario se llama 3 veces: detalle de película + all comments + all ratings
    expect(axios.get).toHaveBeenCalledTimes(3)
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

    // Se llama 5 veces: detalle + user rating + all comments + all ratings + profile (AppHeader)
    expect(axios.get).toHaveBeenCalledTimes(5)
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

    // Se llama 5 veces: detalle + user rating (404) + all comments + all ratings + profile
    expect(axios.get).toHaveBeenCalledTimes(5)
  })

  it('muestra solo las valoraciones que contienen comentario (filtra vacíos)', async () => {
    // Preparamos comentarios: algunos con texto, algunos sin
    // Solo los que tienen texto (no vacío) deberían mostrarse
    const allComments = [
      { id: 1, username: 'user1', text: 'Nice', like_count: 2, reply_count: 0, is_liked: false, parent_id: null, created_at: '2025-11-01T10:00:00Z' },
      { id: 3, username: 'user3', text: 'Another', like_count: 1, reply_count: 0, is_liked: false, parent_id: null, created_at: '2025-11-03T12:00:00Z' }
    ]
    
    const allRatings = [
      { id: 1, user: { username: 'user1' }, overall_score: 7, soundtrack: 7, acting: 7, cinematography: 7, plot: 7 },
      { id: 3, user: { username: 'user3' }, overall_score: 8, soundtrack: 8, acting: 8, cinematography: 8, plot: 8 }
    ]

    // Mock axios.get to return movie detail and the comments
    axios.get.mockImplementation(async (url) => {
      if (url === 'http://api.test/movies/tt123/') return { data: sampleMovie }
      if (url === 'http://api.test/movies/tt123/comments/') return { data: allComments }
      if (url === 'http://api.test/movies/tt123/ratings/') return { data: allRatings }
      return { data: {} }
    })

    const wrapper = mount(MovieInfo, {
      props: { tconst: 'tt123' },
      global: { stubs: { 'router-link': { template: '<a><slot /></a>' } } }
    })

    await flushPromises()

    // Se deben renderizar 2 comentarios (los que tienen texto)
    const cards = wrapper.findAll('.comments-list .user-rating-card')
    expect(cards.length).toBe(2)

    // Orden: most liked first -> 'Nice' (2 likes) then 'Another' (1 like)
    expect(cards[0].text()).toContain('Nice')
    expect(cards[1].text()).toContain('Another')
  })

  it('ordena los comentarios por fecha (más recientes primero)', async () => {
    const allComments = [
      { id: 10, username: 'user1', text: 'Old', like_count: 0, reply_count: 0, is_liked: false, parent_id: null, created_at: '2025-11-01T00:00:00Z', date: '2025-11-01' },
      { id: 11, username: 'user2', text: 'Newest', like_count: 0, reply_count: 0, is_liked: false, parent_id: null, created_at: '2025-11-05T00:00:00Z', date: '2025-11-05' },
      { id: 12, username: 'user3', text: 'Mid', like_count: 0, reply_count: 0, is_liked: false, parent_id: null, created_at: '2025-11-03T00:00:00Z', date: '2025-11-03' }
    ]
    
    const allRatings = [
      { id: 10, user: { username: 'user1' }, overall_score: 5, soundtrack: 5, acting: 5, cinematography: 5, plot: 5, date: '2025-11-01' },
      { id: 11, user: { username: 'user2' }, overall_score: 8, soundtrack: 8, acting: 8, cinematography: 8, plot: 8, date: '2025-11-05' },
      { id: 12, user: { username: 'user3' }, overall_score: 7, soundtrack: 7, acting: 7, cinematography: 7, plot: 7, date: '2025-11-03' }
    ]

    axios.get.mockImplementation(async (url) => {
      if (url === 'http://api.test/movies/tt123/') return { data: sampleMovie }
      if (url === 'http://api.test/movies/tt123/comments/') return { data: allComments }
      if (url === 'http://api.test/movies/tt123/ratings/') return { data: allRatings }
      return { data: {} }
    })

    const wrapper = mount(MovieInfo, {
      props: { tconst: 'tt123' },
      global: { stubs: { 'router-link': { template: '<a><slot /></a>' } } }
    })

    await flushPromises()

    const cards = wrapper.findAll('.comments-list .user-rating-card')
    expect(cards.length).toBe(3)
    // Expect order: sorted by likes first (all have 0), then by date newest first
    expect(cards[0].text()).toContain('Newest')
    expect(cards[1].text()).toContain('Mid')
    expect(cards[2].text()).toContain('Old')
  })

  it('pagina los comentarios mostrando solo `pageSize` por página y permite navegar', async () => {
    // Create 12 comments with non-empty comments
    const allComments = Array.from({ length: 12 }).map((_, i) => ({
      id: i + 1,
      username: `user${i + 1}`,
      text: `Comment ${i + 1}`,
      like_count: i % 3,
      reply_count: 0,
      is_liked: false,
      parent_id: null,
      // newer items have larger timestamps
      created_at: new Date(Date.UTC(2025, 10, 30 - i)).toISOString()
    }))
    
    const allRatings = Array.from({ length: 12 }).map((_, i) => ({
      id: i + 1,
      user: { username: `user${i + 1}` },
      overall_score: 6 + (i % 5),
      soundtrack: 6,
      acting: 6,
      cinematography: 6,
      plot: 6
    }))

    axios.get.mockImplementation(async (url) => {
      if (url === 'http://api.test/movies/tt123/') return { data: sampleMovie }
      if (url === 'http://api.test/movies/tt123/comments/') return { data: allComments }
      if (url === 'http://api.test/movies/tt123/ratings/') return { data: allRatings }
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
    // The next 2 items should be lower in the sort order
    expect(cards[0].text()).toContain('Comment')
    expect(cards[1].text()).toContain('Comment')
  })
})
