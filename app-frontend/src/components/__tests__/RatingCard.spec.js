// tests/helpers/mountAppHeader.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import RatingCard from '@/components/RatingCard.vue'

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

const mountRatingCard = ({ 
    hasToken = false,
    hasProfile = false,
    rating = mockRating
} = {}) => {
  // Reset mocks y localStorage
  axios.get.mockReset()
  localStorage.clear()

  // Si queremos simular usuario logueado
  if (hasToken) {
    localStorage.setItem('access', 'fake-token')
    localStorage.setItem('refresh', 'fake-token')
  }

  // Si queremos simular que ya hay datos en localStorage
  if (hasProfile) {
    localStorage.setItem('username', 'test')
    localStorage.setItem('avatarUrl', 'avatar.png')
  }

  const wrapper = mount(RatingCard, {
    props: { rating: rating },
    global: {
      stubs: {
        'router-link': RouterLinkStub
      }
    }
  })

  return wrapper
}

const mockRating = {
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
}

const mockRatingNoComment = {
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
  comment: ''
}

const mockRatingNoPoster = {
  id: 1,
  movie_info: {
      tconst: 'tt001',
      primary_title: 'Movie 1',
      start_year: 2000,
      poster_path: ''
  },
  overall_score: 7.5,
  soundtrack: 6,
  acting: 8,
  cinematography: 9,
  plot: 7,
  comment: 'A test comment'
}

describe('RatingCard.vue', () => {
  it('renderiza título, año, puntuación', () => {
    const wrapper = mountRatingCard()

    expect(wrapper.text()).toContain('Movie 1 (2000)')
    expect(wrapper.text()).toContain('Rating: 7.5')
  })

  it('muestra el comentario si existe', () => {
    const wrapper = mountRatingCard()

    expect(wrapper.text()).toContain('A test comment')
  })

  it('no muestra comentario si no existe', () => {
    const wrapper = mountRatingCard({
      rating: mockRatingNoComment
    })

    expect(wrapper.text()).not.toContain('"')  // No debería haber cita ni comentario
  })

  it('muestra un <img> cuando hay poster_path', () => {
    const wrapper = mountRatingCard()

    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('http://api.test/movie1.jpg')
  })

  it('muestra placeholder cuando NO hay poster_path', () => {
    const wrapper = mountRatingCard({
      rating: mockRatingNoPoster
    })

    const placeholder = wrapper.find('.poster-placeholder')
    expect(placeholder.exists()).toBe(true)
    expect(placeholder.text()).toContain('No image')
  })

  it('router-link apunta al movie-info con tconst', () => {
    const wrapper = mountRatingCard()

    const link = wrapper.findComponent(RouterLinkStub)
    expect(link.exists()).toBe(true)
    expect(link.props('to')).toEqual({ 
      name: 'movie-info', 
      params: { tconst: 'tt001' } 
    })
  })
})