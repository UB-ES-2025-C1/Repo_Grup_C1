// src/views/__tests__/RateMovie.spec.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import RateMovie from '@/views/RateMovie.vue'

// --- Mocks globales ---

// Mock axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}))

// Mock helpers de API
vi.mock('@/utils/api', () => ({
  getApiBaseUrl: () => 'http://api.test',
  withApiBase: (path) => `http://api.test${path}`
}))

// Mock vue-router: useRouter (para router.push)
const pushMock = vi.fn()
const replaceMock = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: pushMock
    , replace: replaceMock
  })
}))

import axios from 'axios'

// --- Helpers ---

const sampleMovie = {
  primaryTitle: 'Inception',
  title: 'Inception'
}

const sampleRating = {
  overall_score: 9,
  soundtrack: 8,
  acting: 9,
  cinematography: 10,
  plot: 9,
  comment: 'Amazing movie!'
}

const TCONST = 'tt1375666'

const mountRateMovie = async (options = {}) => {
  const {
    hasToken = true,
    ratingStatus = 200,
    withExistingRating = true
  } = options

  // Reset mocks y localStorage
  axios.get.mockReset()
  axios.post.mockReset()
  pushMock.mockReset()
  replaceMock.mockReset()
  localStorage.clear()

  if (hasToken) {
    window.localStorage.setItem('access', 'fake-token')
    window.localStorage.setItem('refresh', 'fake-token')
    window.localStorage.setItem('username', 'fake-username')
    window.localStorage.setItem('avatar', 'fake-avatar')
  }

  // Mock de axios.get según URL
  axios.get.mockImplementation(async (url, config) => {
    if (url === `http://api.test/movies/${TCONST}/`) {
      return { data: sampleMovie }
    }

    if (url === `http://api.test/movies/ratings/${TCONST}/`) {
      if (!hasToken) {
        const err = new Error('Unauthorized')
        err.response = { status: 401 }
        throw err
      }

      if (!withExistingRating) {
        const err = new Error('Not found')
        err.response = { status: ratingStatus }
        throw err
      }

      return { data: sampleRating }
    }

    return { data: {} }
  })

  const wrapper = mount(RateMovie, {
    props: { tconst: TCONST },
    global: {
      stubs: {
        'router-link': { template: '<a><slot /></a>' }
      }
    }
  })

  await flushPromises()
  return wrapper
}

// --- beforeEach ---

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

// --- TESTS ---

describe('RateMovie', () => {
  it('redirige a login si no hay token al montar', async () => {
    // Sin token
    axios.get.mockResolvedValueOnce({ data: sampleMovie })

    const wrapper = mount(RateMovie, {
      props: { tconst: TCONST },
      global: {
        stubs: {
          'router-link': { template: '<a><slot /></a>' }
        }
      }
    })

    await flushPromises()

    // Debe haber intentado redirigir al login (se usa router.replace)
    expect(replaceMock).toHaveBeenCalledWith({ name: 'login' })
  })

  it('carga título de la película y rating existente cuando hay token', async () => {
    const wrapper = await mountRateMovie({
      hasToken: true,
      withExistingRating: true
    })

    // Título en el encabezado
    expect(wrapper.text()).toContain('Rate: Inception')

    // Comprobar valores del formulario (desde el estado interno)
    const form = wrapper.vm.form
    expect(form.overall_score).toBe(sampleRating.overall_score)
    expect(form.soundtrack).toBe(sampleRating.soundtrack)
    expect(form.acting).toBe(sampleRating.acting)
    expect(form.cinematography).toBe(sampleRating.cinematography)
    expect(form.plot).toBe(sampleRating.plot)
    expect(form.comment).toBe(sampleRating.comment)

    // Se han hecho 2 peticiones: movie + rating
    expect(axios.get).toHaveBeenCalledTimes(2)
    expect(axios.get).toHaveBeenCalledWith(
      `http://api.test/movies/${TCONST}/`
    )
    expect(axios.get).toHaveBeenCalledWith(
      `http://api.test/movies/ratings/${TCONST}/`,
      expect.objectContaining({
        headers: { Authorization: 'Bearer fake-token' }
      })
    )
  })

  it('si hay token pero no existe rating (404), mantiene valores por defecto y no muestra error', async () => {
    const wrapper = await mountRateMovie({
      hasToken: true,
      withExistingRating: false,
      ratingStatus: 404
    })

    const form = wrapper.vm.form
    // overall_score por defecto: 10
    expect(form.overall_score).toBe(10)
    // otros campos también por defecto
    expect(form.soundtrack).toBe(10)
    expect(form.acting).toBe(10)
    expect(form.cinematography).toBe(10)
    expect(form.plot).toBe(10)
    expect(form.comment).toBe('')

    // No mensaje de error global
    expect(wrapper.text()).not.toContain('Error loading data.')
  })

  it('submitRating envía el rating por POST y redirige al detalle de la película cuando hay token', async () => {
    const wrapper = await mountRateMovie({
      hasToken: true,
      withExistingRating: false,
      ratingStatus: 404
    })

    // Ajustamos algunos valores del formulario
    wrapper.vm.form.overall_score = 8
    wrapper.vm.form.soundtrack = 7
    wrapper.vm.form.acting = 9
    wrapper.vm.form.cinematography = 8
    wrapper.vm.form.plot = 8
    wrapper.vm.form.comment = 'Very good!'

    axios.post.mockResolvedValueOnce({ data: { ok: true } })

    await wrapper.vm.submitRating()
    await flushPromises()

    // Comprobar que se ha llamado POST con el payload correcto
    expect(axios.post).toHaveBeenCalledTimes(1)
    expect(axios.post).toHaveBeenCalledWith(
      'http://api.test/movies/ratings/',
      {
        movie: TCONST,
        overall_score: 8,
        soundtrack: 7,
        acting: 9,
        cinematography: 8,
        plot: 8,
        comment: 'Very good!'
      },
      expect.objectContaining({
        headers: { Authorization: 'Bearer fake-token' }
      })
    )

    // Debe redirigir a movie-info tras guardar
    expect(pushMock).toHaveBeenCalledWith({
      name: 'movie-info',
      params: { tconst: TCONST }
    })
  })

  it('submitRating redirige a login si no hay token y no hace POST', async () => {
    // Montamos con token para no redirigir en onMounted,
    // luego lo borramos antes de enviar el formulario
    const wrapper = await mountRateMovie({
      hasToken: true,
      withExistingRating: false,
      ratingStatus: 404
    })

    localStorage.removeItem('access')
    pushMock.mockReset()
    replaceMock.mockReset()
    axios.post.mockReset()

    await wrapper.vm.submitRating()
    await flushPromises()

    expect(replaceMock).toHaveBeenCalledWith({ name: 'login' })
    expect(axios.post).not.toHaveBeenCalled()
  })
})
