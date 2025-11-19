// src/views/__tests__/ProfileView.spec.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ProfileView from '@/views/ProfileView.vue'

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

const mountProfileView = async ({
    hasToken = true,
    withStoredHeaderData = true,
    hasRatedMovies = true,
    username = 'test',
    profileStatus = 200,
    ratingsStatus = 200,
    errorMessage = 'Test error.'
}) => {
  // Reset mocks y localStorage
  axios.get.mockReset()
  localStorage.clear()

  // Si queremos simular usuario logueado
  if (hasToken) {
    localStorage.setItem('access', 'fake-token')
    localStorage.setItem('refresh', 'fake-token')
  }

  // Si queremos simular que ya hay datos en localStorage
  if (withStoredHeaderData) {
    localStorage.setItem('username', 'test')
    localStorage.setItem('avatarUrl', '/avatar.jpg')
  }

  // Mock de axios.get según URL
  axios.get.mockImplementation(async (url) => {
    // Perfil
    if (url.endsWith(`/movies/profiles/${username}/`) || url.endsWith('/movies/profiles/me/')) {
      if (profileStatus !== 200) {
        const err = new Error('Not found')
        if (errorMessage) {
          err.response = { status: profileStatus, data: { detail: [errorMessage] } }
        } else {
          err.response = { status: profileStatus }
        }
        throw err
      }
      return {
        data: mockProfileResponse
      }
    }

    // Ratings
    if (url.endsWith('/movies/profiles/test/ratings/')) {
      if (ratingsStatus !== 200) {
        const err = new Error('Not found')
        if (errorMessage) {
          err.response = { status: ratingsStatus, data: { detail: [errorMessage] } }
        } else {
          err.response = { status: ratingsStatus }
        }
        throw err
      }
      if (hasRatedMovies) {
        return {
          data: mockRatingsResponse
        }
      } else {
        return {data: []}
      }
    }

    return { data: {} }
  })

  const wrapper = mount(ProfileView, {
    props: { username: username },
    global: {
      stubs: {
        'router-link': { template: '<a><slot /></a>' }
      }
    }
  })

  await flushPromises()
  return wrapper
}

const mockProfileResponse = {
  username: 'test',
  bio: 'A test biography.',
  photo: '/avatar.jpg',
  average_rating: 8.5
}

const mockRatingsResponse = [
  {
    id: 1,
    movie_info: {
      tconst: 'tt001',
      primary_title: 'Movie 1',
      start_year: 2000,
      poster_path: '/movie1.jpg'
    },
    overall_score: 7.5,
    soundtrack: 6,
    acting: 8,
    cinematography: 9,
    plot: 7,
    comment: 'A test comment'
  },
  {
    id: 2,
    movie_info: {
      tconst: 'tt002',
      primary_title: 'Movie 2',
      start_year: 2000,
      poster_path: '/movie2.jpg'
    },
    overall_score: 9,
    soundtrack: 9,
    acting: 9,
    cinematography: 9,
    plot: 9,
    comment: 'A test comment'
  }
]

describe('ProfileView', () => {
  it('carga correctamente el perfil y muestra los datos', async () => {
    const wrapper = await mountProfileView({})

    await flushPromises()

    expect(wrapper.text()).toContain('test')
    expect(wrapper.text()).toContain('A test biography.')
    expect(wrapper.text()).toContain('Rating average: 8.5')
  })

  it('muestra listado de películas valoradas', async () => {
    const wrapper = await mountProfileView({})

    await flushPromises()

    // Debería existir un rating card por cada rating
    const cards = wrapper.findAllComponents({ name: 'RatingCard' })
    expect(cards.length).toBe(2)
  })

  it('muestra mensaje si no hay películas valoradas', async () => {
    const wrapper = await mountProfileView({
      hasRatedMovies: false
    })

    await flushPromises()

    expect(wrapper.text()).toContain('This user has not yet rated a movie.')
  })

  it('muestra error si la petición falla', async () => {
    const wrapper = await mountProfileView({
      profileStatus: 400,
      username: 'invalid'
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Test error.')
  })

  it('muestra error genérico si axios no devuelve detail', async () => {
    const wrapper = await mountProfileView({
      profileStatus: 400,
      errorMessage: '',
      username: 'invalid'
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Error loading profile.')
  })
})
