// app-frontend/src/components/__tests__/ForumFilter.spec.js
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ForumFilter from '@/components/ForumFilter.vue'

describe('ForumFilter', () => {
  // Helper para montar la tarjeta
  const mountComponent = (overrides = {}) =>
    mount(ForumFilter, {
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

  it('muestra el ordenamiento por defecto', () => {
    const wrapper = mountComponent()

    const selectSort = wrapper.find('select#sort')
    const selectOrder = wrapper.find('select#order')

    expect(selectSort.element.value).toBe('popularity')
    expect(selectOrder.element.value).toBe('desc')
  })

  it('actualiza los filtros seleccionados', async () => {
    const wrapper = mountComponent()

    const selectSort = wrapper.find('select#sort')
    const selectOrder = wrapper.find('select#order')

    await selectSort.setValue('title')
    await selectOrder.setValue('asc')

    expect(selectSort.element.value).toBe('title')
    expect(selectOrder.element.value).toBe('asc')
  })

  it('reset de los filtros seleccionados', async () => {
    const wrapper = mountComponent()

    // Cambiar valores antes de hacer reset
    await wrapper.find('select#sort').setValue('title')
    await wrapper.find('select#order').setValue('asc')

    // Ejecutar reset
    await wrapper.find('button.clear').trigger('click')

    const selectSort = wrapper.find('select#sort')
    const selectOrder = wrapper.find('select#order')

    expect(selectSort.element.value).toBe('popularity')
    expect(selectOrder.element.value).toBe('desc')
  })

  it('emite los filtros al aplicarlos', async () => {
    const wrapper = mountComponent()

    await wrapper.find('select#sort').setValue('title')
    await wrapper.find('select#order').setValue('asc')

    await wrapper.find('button.apply').trigger('click')

    expect(wrapper.emitted().applyFilters).toBeTruthy()
    expect(wrapper.emitted().applyFilters[0][0]).toEqual({
      searchQuery: '',
      sortBy: 'title',
      order: 'asc',
    })
  })

  it('emite los filtros al modificar la busqueda por nombre', async () => {
    const wrapper = mountComponent()

    const input = wrapper.find('input[type="text"]')

    await input.setValue('forum test')

    expect(wrapper.emitted().applyFilters).toBeTruthy()

    const lastEmission = wrapper.emitted().applyFilters.slice(-1)[0][0]

    expect(lastEmission).toEqual({
      searchQuery: 'forum test',
      sortBy: 'popularity',
      order: 'desc',
    })
  })

  it('emite los filtros al resetear los filtros seleccionados', async () => {
    const wrapper = mountComponent()

    // Cambiar valores antes del reset
    await wrapper.find('select#sort').setValue('title')
    await wrapper.find('select#order').setValue('asc')

    await wrapper.find('button.clear').trigger('click')

    expect(wrapper.emitted().applyFilters).toBeTruthy()

    const lastEmission = wrapper.emitted().applyFilters.slice(-1)[0][0]

    expect(lastEmission).toEqual({
      searchQuery: '',
      sortBy: 'popularity',
      order: 'desc',
    })
  })
})