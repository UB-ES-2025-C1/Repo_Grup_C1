// tests/helpers/mountAppHeader.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import AppHeader from '@/components/AppHeader.vue'

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

const mountAppHeader = async ({ 
    hasToken = false,
    hasProfile = false,
    hasProfileAvatar = true,
    profileStatus = 200
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

  // Mock de axios.get según URL
  axios.get.mockImplementation(async (url) => {
    // Perfil
    if (url.endsWith('/movies/profiles/me/')) {
      if (profileStatus !== 200) {
        const err = new Error('Not found')
        err.response = { status: profileStatus }
        throw err
      }
      if (hasProfileAvatar) {
        return {
            data: mockProfileResponse
        }
      } else {
        return  {
            data: mockProfileResponseNoAvatar
        }
      }
    }
  })

  const wrapper = mount(AppHeader, {
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

const mockProfileResponse = {
  username: 'test',
  bio: 'A test biography.',
  photo: '/avatar.jpg',
  average_rating: 8.5
}

const mockProfileResponseNoAvatar = {
  username: 'test',
  bio: 'A test biography.',
  average_rating: 8.5
}

describe('AppHeader', () => {

  it('muestra Log in y Sign up si el usuario NO está logueado', async () => {
    const wrapper = await mountAppHeader({ 
        hasToken: false
    })

    expect(wrapper.text()).toContain('Log in')
    expect(wrapper.text()).toContain('Sign up')
    expect(wrapper.text()).not.toContain('Log out')
    expect(wrapper.text()).not.toContain('test')
  })

  it('muestra Log out y perfil si el usuario está logueado', async () => {
    const wrapper = await mountAppHeader({ 
        hasToken: true, 
        hasProfile: true 
    })

    expect(wrapper.text()).toContain('Log out')
    expect(wrapper.text()).toContain('test')
  })

  it('hace llamada a la API para cargar perfil si falta username o avatar', async () => {
    const wrapper = await mountAppHeader({ 
        hasToken: true,
        hasProfile: false
    })

    await flushPromises()

    expect(axios.get).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Log out')
    expect(wrapper.text()).toContain('test')
  })

  it('NO hace llamada axios si username y avatar existen en localStorage', async () => {
    const wrapper = await mountAppHeader({ 
        hasToken: true,
        hasProfile: true
    })

    await flushPromises()

    expect(axios.get).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Log out')
    expect(wrapper.text()).toContain('test')
  })

  it('muestra el avatar por defecto si la API no devuelve foto', async () => {
    const wrapper = await mountAppHeader({ 
        hasToken: true,
        hasProfile: false,
        hasProfileAvatar: false
    })

    await flushPromises()

    const img = wrapper.find('img.avatar')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toContain('default-avatar')
  })
})