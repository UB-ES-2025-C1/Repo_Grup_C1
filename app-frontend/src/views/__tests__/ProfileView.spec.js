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
    errorMessage = 'Test error.',
    isEditProfile = false,
    newBio = '',
    newPhoto = '',
    removeAvatar = false
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
      if (!isEditProfile) {
        return {
          data: mockProfileResponse
        }
      }
        
      if (!removeAvatar) {
        return {
          data: {
            bio: newBio || mockProfileResponse.bio,
            photo: newPhoto || mockProfileResponse.photo
          }
        }
      }

      return {
        data: {
          bio: newBio || mockProfileResponse.bio,
          photo: ''
        }
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

const mockEditProfileResponse = {

}

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

  it('muestra el boton de editar perfil si es tu propio perfil', async () => {
    const wrapper = await mountProfileView({
      username: 'me'
    })

    expect(wrapper.text()).toContain("Edit profile")
  })

  it('no muestra el boton de editar perfil si es el perfil de otro usuario', async () => {
    const wrapper = await mountProfileView({
      username: 'other'
    })

    expect(wrapper.text()).not.toContain("Edit profile")
  })

  it('muestra el formulario para editar perfil al hacer clic en el boton de editar perfil', async () => {
    const wrapper = await mountProfileView({
      username: 'me'
    })

    await wrapper.find('#edit-profile-btn').trigger('click')

    expect(wrapper.text()).toContain('Edit profile')
    expect(wrapper.text()).toContain('Bio')
    expect(wrapper.text()).toContain('Remove Profile Bio')
    expect(wrapper.text()).toContain('Photo')
    expect(wrapper.text()).toContain('Remove Profile Photo')
    expect(wrapper.text()).toContain('Save')
    expect(wrapper.text()).toContain('Cancel')
  })

  it('elimina la bio al hacer clic en el boton para eliminar la bio', async () => {
    const wrapper = await mountProfileView({
      username: 'me'
    })

    await wrapper.find('#edit-profile-btn').trigger('click')

    const bioTextArea = wrapper.find('#bio-text-area')
    bioTextArea.setValue('Test bio')
    expect(wrapper.vm.newBio).toBe('Test bio')
    
    await wrapper.find('#remove-bio-btn').trigger('click')
    expect(wrapper.vm.newBio).toBe('')
  })

  test('al seleccionar archivo, se guarda, se muestra su nombre y aparece el boton para quitar la seleccion', async () => {
    const wrapper = await mountProfileView({
      username: 'me'
    })

    await wrapper.find('#edit-profile-btn').trigger('click')

    const file = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });

    await wrapper.vm.handleChangedAvatar({ target: { files: [file] } });

    expect(wrapper.vm.newAvatarFile.name).toBe('avatar.jpg')
    expect(wrapper.text()).toContain('avatar.jpg')
    expect(wrapper.text()).toContain('Clear Selection')
  })

  test('si removeAvatar=true, el botón de subir foto queda deshabilitado y se indica que se va a eliminar la foto de perfil', async () => {
    const wrapper = await mountProfileView({
      username: 'me'
    })

    await wrapper.find('#edit-profile-btn').trigger('click')
    wrapper.vm.$.setupState.removeAvatar = true
    await flushPromises()

    const button = wrapper.find('#photo-selector-btn')

    expect(button.exists()).toBe(true)
    expect(button.classes()).toContain('disabled')
    expect(wrapper.text()).toContain('Removing Profile Photo')
    expect(wrapper.text()).toContain('Cancel Remove Profile Photo')
    expect(wrapper.vm.newAvatarFile).toBe(null)
  })

  test('saveChanges envía formData con bio y foto', async () => {
    const file = new File(["avatar"], "avatar.jpg", { type: "image/jpeg" })
    axios.patch = vi.fn().mockResolvedValueOnce({
      data: { bio: 'New test bio', photo: '/photo.png' }
    })

    const wrapper = await mountProfileView({
      username: 'me'
    })

    await wrapper.find('#edit-profile-btn').trigger('click')

    await wrapper.find('#bio-text-area').setValue('New test bio')
    await wrapper.vm.handleChangedAvatar({ target: { files: [file] } });

    await wrapper.find('#save-btn').trigger('click')

    await flushPromises()

    expect(axios.patch).toHaveBeenCalledTimes(1)
    const [url, body, config] = axios.patch.mock.calls[0]

    expect(url).toContain('/movies/profiles/me')
    expect(body instanceof FormData).toBe(true)

    expect(body.get('bio')).toBe('New test bio')

    const sentFile = body.get('photo')
    expect(sentFile).toBeInstanceOf(File)
    expect(sentFile.name).toBe('avatar.jpg')
    expect(sentFile.type).toBe('image/jpeg')
  });
})
