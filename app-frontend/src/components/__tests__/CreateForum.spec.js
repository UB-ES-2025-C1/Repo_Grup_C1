// app-frontend/src/components/__tests__/CreateForum.spec.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import CreateForum from '@/components/CreateForum.vue'

// Mock de axios y del helper withApiBase
vi.mock('axios', () => ({
  default: {
    post: vi.fn()
  }
}))

vi.mock('@/utils/api', () => ({
  withApiBase: (path) => `/api${path}` // no nos importa el valor real, solo que se use
}))

const push = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: push
  })
}))

import axios from 'axios'

// Helper para montar el componente con mocks/stubs
const mountComponent = async () => {
  const wrapper = mount(CreateForum, {
    global: {
      mocks: {
        $router: {
          push,
        },
      },
    },
  })

  await flushPromises()
  return wrapper
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('CreateForum', () => {
  it('renderiza el popup correctamente', async () => {
    const wrapper = await mountComponent()
    const text = wrapper.text()

    expect(text).toContain('Create Forum')
    expect(text).toContain('Title')
    expect(text).toContain('Description')
  })

  it('emite close al hacer click en el overlay', async () => {
    const wrapper = await mountComponent()

    await wrapper.find('.modal-overlay').trigger('click')

    expect(wrapper.emitted().close).toBeTruthy()
  })

  it('emite close al presionar Cancel', async () => {
    const wrapper = await mountComponent()

    await wrapper.find('button.cancel').trigger('click')

    expect(wrapper.emitted().close).toBeTruthy()
  })

  it('envía el formulario y redirige al foro creado', async () => {
    axios.post.mockResolvedValue({
      data: { id: 55 }
    })

    const wrapper = await mountComponent()

    await wrapper.find('input').setValue('Forum title')
    await wrapper.find('textarea').setValue('Description text')

    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(axios.post).toHaveBeenCalledWith(
      '/api/movies/forums/',
      {
        title: 'Forum title',
        description: 'Description text'
      }
    )

    expect(push).toHaveBeenCalledWith('/forums/55')
  })

  it('muestra el error devuelto por la API', async () => {
    axios.post.mockRejectedValue({
      response: {
        data: {
          detail: ['Title already exists']
        }
      }
    })

    const wrapper = await mountComponent()

    await wrapper.find('input').setValue('Duplicate')
    await wrapper.find('textarea').setValue('desc')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('Title already exists')
  })

  it('muestra un error genérico si falla sin detail', async () => {
    axios.post.mockRejectedValue({})

    const wrapper = await mountComponent()

    await wrapper.find('input').setValue('Test')
    await wrapper.find('textarea').setValue('desc')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('Failed to create forum.')
  })

  it('desactiva los botones mientras loading está activo', async () => {
    axios.post.mockImplementation(
      () => new Promise(() => {})
    )

    const wrapper = await mountComponent()

    await wrapper.find('input').setValue('Text')
    await wrapper.find('textarea').setValue('Desc')
    await wrapper.find('form').trigger('submit.prevent')

    const cancel = wrapper.find('button.cancel')
    const create = wrapper.find('button.create')

    expect(cancel.attributes('disabled')).toBeDefined()
    expect(create.attributes('disabled')).toBeDefined()
  })
})