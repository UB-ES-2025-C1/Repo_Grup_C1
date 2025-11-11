// src/components/__tests__/MovieFilter.spec.js
import { mount } from '@vue/test-utils'
import MovieFilter from '../MovieFilter.vue'

describe('MovieFilter', () => {
  it('renderiza las opciones de género y año pasadas por props', () => {
    const genres = ['Action', 'Drama', 'Comedy']
    const years = [2020, 2021]

    const wrapper = mount(MovieFilter, {
      props: { genres, years }
    })

    const genreOptions = wrapper.findAll('#genre option')
    const yearOptions = wrapper.findAll('#year option')

    // Primera opción es "All" + las de props
    expect(genreOptions.length).toBe(1 + genres.length)
    expect(yearOptions.length).toBe(1 + years.length)

    // Comprobamos que aparecen algunos valores concretos
    expect(genreOptions.map(o => o.text())).toContain('Action')
    expect(yearOptions.map(o => o.text())).toContain('2020')
  })

  it('emite applyFilters con los filtros seleccionados al pulsar "Apply Filters"', async () => {
    const wrapper = mount(MovieFilter, {
      props: {
        genres: ['Action', 'Drama'],
        years: [2000, 2001]
      }
    })

    // Rellenamos algunos campos
    await wrapper.find('#genre').setValue('Drama')
    await wrapper.find('#year').setValue('2001')
    await wrapper.find('#director').setValue('Nolan')
    await wrapper.find('#actor').setValue('DiCaprio')
    await wrapper.find('#sort').setValue('title')
    await wrapper.find('#order').setValue('asc')

    // Click en Apply Filters
    await wrapper.find('button.apply').trigger('click')

    const emitted = wrapper.emitted('applyFilters')
    expect(emitted).toBeTruthy()
    expect(emitted.length).toBe(1)

    const payload = emitted[0][0]
    expect(payload).toEqual({
    genre: 'Drama',
    year: 2001,      
    director: 'Nolan',
    actor: 'DiCaprio',
    sortBy: 'title',
    order: 'asc'
    })
  })

  it('resetea filtros y emite valores por defecto al pulsar "Clear Filters"', async () => {
    const wrapper = mount(MovieFilter, {
      props: {
        genres: ['Action'],
        years: [2020]
      }
    })

    // Cambiamos algunos valores primero
    await wrapper.find('#genre').setValue('Action')
    await wrapper.find('#year').setValue('2020')
    await wrapper.find('#director').setValue('Someone')
    await wrapper.find('#actor').setValue('Actor X')
    await wrapper.find('#sort').setValue('title')
    await wrapper.find('#order').setValue('asc')

    // Click en Clear Filters
    await wrapper.find('button.clear').trigger('click')

    const emitted = wrapper.emitted('applyFilters')
    expect(emitted).toBeTruthy()

    // El último emit debería ser el de reset
    const lastPayload = emitted[emitted.length - 1][0]
    expect(lastPayload).toEqual({
      genre: '',
      year: '',
      director: '',
      actor: '',
      sortBy: 'rating',
      order: 'desc'
    })

    // Además, el estado de los inputs debería volver a los valores por defecto
    expect(wrapper.find('#genre').element.value).toBe('')
    expect(wrapper.find('#year').element.value).toBe('')
    expect(wrapper.find('#director').element.value).toBe('')
    expect(wrapper.find('#actor').element.value).toBe('')
    expect(wrapper.find('#sort').element.value).toBe('rating')
    expect(wrapper.find('#order').element.value).toBe('desc')
  })
})
