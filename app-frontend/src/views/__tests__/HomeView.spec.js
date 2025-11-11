// src/views/__tests__/HomeView.spec.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import HomeView from '@/views/HomeView.vue'

// Mock de axios y del helper withApiBase
vi.mock('axios', () => ({
  default: {
    get: vi.fn()
  }
}))

vi.mock('@/utils/api', () => ({
  withApiBase: (path) => `/api${path}` // no nos importa el valor real, solo que se use
}))

import axios from 'axios'

// Dataset de ejemplo para los tests
const sampleMovies = [
  {
    tconst: 'tt1',
    primaryTitle: 'Alpha Movie',
    startYear: '2001',
    genres: ['Drama'],
    average_rating: 7.5,
    numVotes: 100,
    director: 'Nolan',
    actors: ['Actor One']
  },
  {
    tconst: 'tt2',
    primaryTitle: 'Bravo Film',
    startYear: '2005',
    genres: ['Action', 'Drama'],
    average_rating: 9.0,
    numVotes: 500,
    director: 'Other Director',
    actors: ['Actor Two']
  },
  {
    tconst: 'tt3',
    primaryTitle: 'Charlie Comedy',
    startYear: '1999',
    genres: ['Comedy'],
    average_rating: 6.0,
    numVotes: 50,
    director: 'Nolan',
    actors: ['Actor One', 'Actor Three']
  }
]

// Helper para montar el componente con mocks/stubs
const mountHome = async (movies = sampleMovies) => {
  axios.get.mockResolvedValueOnce({ data: movies })

  const wrapper = mount(HomeView, {
    global: {
      stubs: {
        // No necesitamos el comportamiento real, solo algo que acepte la prop "movie"
        MovieCard: {
          template: '<div class="movie-card-stub">{{ movie.primaryTitle }}</div>',
          props: ['movie']
        },
        MovieFilter: true,
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

describe('HomeView', () => {
  it('muestra la marca CINEMA UB y los botones de Log in / Sign up', async () => {
    const wrapper = await mountHome([])

    const text = wrapper.text()
    expect(text).toContain('CINEMA UB')
    expect(text).toContain('Log in')
    expect(text).toContain('Sign up')
  })

  it('carga películas desde la API y las muestra en la rejilla', async () => {
    const wrapper = await mountHome(sampleMovies)

    // Se llama a la API con la ruta construida por withApiBase
    expect(axios.get).toHaveBeenCalledTimes(1)
    expect(axios.get).toHaveBeenCalledWith('/api/movies/')

    // Se renderizan las tarjetas (stubs)
    const cards = wrapper.findAll('.movie-card-stub')
    expect(cards.length).toBe(sampleMovies.length)
    expect(cards[0].text()).toContain('Bravo Film') // por defecto, ordenado por rating desc
  })

  it('filtra por texto en la barra de búsqueda', async () => {
    const wrapper = await mountHome(sampleMovies)

    const searchInput = wrapper.get('input.search-input')
    await searchInput.setValue('charlie')

    // Esperamos a que se actualicen computeds y DOM
    await flushPromises()

    const cards = wrapper.findAll('.movie-card-stub')
    expect(cards.length).toBe(1)
    expect(cards[0].text()).toContain('Charlie Comedy')
  })

  it('aplica filtros (por género) y resetea la página a 1', async () => {
    const wrapper = await mountHome(sampleMovies)

    // Forzamos que la página actual sea 2 para comprobar que se resetea
    wrapper.vm.page = 2
    expect(wrapper.vm.page).toBe(2)

    // Llamamos directamente al método applyFilters con un filtro de género
    wrapper.vm.applyFilters({
      genre: 'Drama',
      year: '',
      director: '',
      actor: '',
      sortBy: 'rating',
      order: 'desc'
    })

    await flushPromises()

    // La página debe volver a 1
    expect(wrapper.vm.page).toBe(1)

    // Todas las películas filtradas deberían ser de género "Drama"
    const filtered = wrapper.vm.filteredMovies
    expect(filtered.length).toBe(2)
    filtered.forEach(m => {
      expect(m.genres).toContain('Drama')
    })
  })

  it('calcula correctamente los géneros y años disponibles', async () => {
    const wrapper = await mountHome(sampleMovies)

    const genres = wrapper.vm.availableGenres
    expect(genres).toEqual(['Action', 'Comedy', 'Drama']) // orden alfabético

    const years = wrapper.vm.availableYears
    // Los años van de max a min: 2005..1999
    expect(years[0]).toBe(2005)
    expect(years[years.length - 1]).toBe(1999)
    expect(years).toContain(2001)
  })

  it('gestiona la paginación y el estado de los botones Prev/Next', async () => {
    // Creamos 15 películas para tener 2 páginas (pageSize = 10)
    const manyMovies = Array.from({ length: 15 }).map((_, i) => ({
      tconst: `tt${i}`,
      primaryTitle: `Movie ${i}`,
      startYear: '2000',
      genres: ['Drama'],
      average_rating: 5 + i,
      numVotes: 10 * i
    }))

    const wrapper = await mountHome(manyMovies)

    expect(wrapper.vm.totalPages).toBe(2)

    const buttons = wrapper.findAll('.pagination-controls button')
    const prevButton = buttons[0]
    const nextButton = buttons[1]

    // En la página 1: Prev deshabilitado, Next habilitado
    expect(wrapper.vm.page).toBe(1)
    expect(prevButton.attributes('disabled')).toBeDefined()
    expect(nextButton.attributes('disabled')).toBeUndefined()

    // Pasamos a la página 2
    await nextButton.trigger('click')
    await flushPromises()

    expect(wrapper.vm.page).toBe(2)
    // Ahora Prev habilitado, Next deshabilitado
    expect(prevButton.attributes('disabled')).toBeUndefined()
    expect(nextButton.attributes('disabled')).toBeDefined()
  })
})
