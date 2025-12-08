// src/views/__tests__/ForumHomeView.spec.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ForumHomeView from '@/views/ForumHomeView.vue'
import axios from 'axios'

vi.mock('axios')

function mountComponent() {
  return mount(ForumHomeView, {
    global: {
      stubs: ['AppHeader', 'ForumCard', 'ForumFilter', 'CreateForum']
    }
  })
}

describe('ForumHomeView', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('carga y muestra los foros correctamente', async () => {
    axios.get.mockResolvedValue({
      data: [
        { id: 1, title: 'Alpha Forum', posts_count: 20 },
        { id: 2, title: 'Beta Forum', posts_count: 10 }
      ]
    })

    const wrapper = mountComponent()

    // Loading visible inicialmente
    expect(wrapper.text()).toContain('Loading forums...')

    await flushPromises()

    // Loading desaparece
    expect(wrapper.text()).not.toContain('Loading forums...')

    // Renderiza los ForumCard (stub)
    expect(wrapper.findAllComponents({ name: 'ForumCard' }).length).toBe(2)
  })

  it('muestra un mensaje de error si la API falla', async () => {
    axios.get.mockRejectedValue({
      response: { data: { detail: ['Server error message'] } }
    })

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.text()).toContain('⚠️ Server error message')
  })

  it('aplica filtros y reinicia la página a 1', async () => {
    axios.get.mockResolvedValue({
      data: [
        { id: 1, title: 'Alpha', posts_count: 10 },
        { id: 2, title: 'Beta', posts_count: 5 }
      ]
    })

    const wrapper = mountComponent()
    await flushPromises()

    // Emitir evento del componente ForumFilter
    const filterComponent = wrapper.findComponent({ name: 'ForumFilter' })
    filterComponent.vm.$emit('applyFilters', {
      searchQuery: 'Alpha',
      sortBy: 'title',
      order: 'asc'
    })

    await wrapper.vm.$nextTick()

    // Página reseteada
    expect(wrapper.vm.page).toBe(1)

    // Solo 1 coincide
    expect(wrapper.findAllComponents({ name: 'ForumCard' }).length).toBe(1)
  })

  it('paginación funciona correctamente', async () => {
    const forums = Array.from({ length: 25 }).map((_, i) => ({
        id: i + 1,
        title: `Forum ${i + 1}`,
        posts_count: i
    }))

    axios.get.mockResolvedValue({ data: forums })

    const wrapper = mountComponent()
    await flushPromises()

    // Page 1 → 10 elementos
    expect(wrapper.vm.page).toBe(1)
    expect(wrapper.findAllComponents({ name: 'ForumCard' }).length).toBe(12)

    // Helper para buscar por texto
    const getButton = (text) =>
        wrapper.findAll('button').find(btn => btn.text() === text)

    // Next page
    await getButton('Next').trigger('click')
    expect(wrapper.vm.page).toBe(2)
    expect(wrapper.findAllComponents({ name: 'ForumCard' }).length).toBe(12)

    // Next page
    await getButton('Next').trigger('click')
    expect(wrapper.vm.page).toBe(3)
    expect(wrapper.findAllComponents({ name: 'ForumCard' }).length).toBe(1)

    // Prev page
    await getButton('Prev').trigger('click')
    expect(wrapper.vm.page).toBe(2)
  })

  it('muestra "No results found" si el filtrado queda vacío', async () => {
    axios.get.mockResolvedValue({
      data: [{ id: 1, title: 'Alpha', posts_count: 10 }]
    })

    const wrapper = mountComponent()
    await flushPromises()

    // Emitir filtros que vacían la lista
    wrapper.findComponent({ name: 'ForumFilter' }).vm.$emit('applyFilters', {
      searchQuery: 'zzz',
      sortBy: 'title',
      order: 'asc'
    })

    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('No results found.')
  })

  it('abre y cierra el modal de crear foro', async () => {
    axios.get.mockResolvedValue({ data: [] })

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.findComponent({ name: 'CreateForum' }).exists()).toBe(false)

    // Abrir
    await wrapper.find('button.create-forum').trigger('click')
    expect(wrapper.findComponent({ name: 'CreateForum' }).exists()).toBe(true)

    // Emitir cierre
    wrapper.findComponent({ name: 'CreateForum' }).vm.$emit('close')
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent({ name: 'CreateForum' }).exists()).toBe(false)
  })
})