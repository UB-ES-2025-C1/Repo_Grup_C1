// src/views/__tests__/RegisterView.spec.js
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import RegisterView from '@/views/RegisterView.vue'
import axios from 'axios'

// Mock de axios para NO llamar al backend real
vi.mock('axios', () => ({
  default: {
    post: vi.fn()
  }
}))

// Pequeño helper para montar el componente con router-link stub
const mountRegisterView = () =>
  mount(RegisterView, {
    global: {
      stubs: {
        'router-link': {
          template: '<a><slot /></a>'
        }
      }
    }
  })

describe('RegisterView', () => {
  it('muestra la marca CINEMA UB y el formulario de registro', () => {
    const wrapper = mountRegisterView()

    // Header
    expect(wrapper.text()).toContain('CINEMA UB')
    expect(wrapper.text()).toContain('Sign up')

    // Inputs del formulario
    const nameInput = wrapper.find('input[placeholder="Name"]')
    const emailInput = wrapper.find('input[placeholder="Email"]')
    const passwordInput = wrapper.find('input[placeholder="Password"]')
    const confirmPasswordInput = wrapper.find('input[placeholder="Confirm Password"]')

    expect(nameInput.exists()).toBe(true)
    expect(emailInput.exists()).toBe(true)
    expect(passwordInput.exists()).toBe(true)
    expect(confirmPasswordInput.exists()).toBe(true)

    // Botón principal
    const submitButton = wrapper.get('button[type="submit"]')
    expect(submitButton.text()).toContain('Create account')
  })

  it('muestra un error si las contraseñas no coinciden', async () => {
    const wrapper = mountRegisterView()

    // Rellenar formulario con contraseñas diferentes
    await wrapper.find('input[placeholder="Name"]').setValue('Christian')
    await wrapper.find('input[placeholder="Email"]').setValue('christian@example.com')
    await wrapper.find('input[placeholder="Password"]').setValue('password1')
    await wrapper.find('input[placeholder="Confirm Password"]').setValue('password2')

    // Enviar formulario
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    // axios NO debería ser llamado
    expect(axios.post).not.toHaveBeenCalled()

    // Mensaje de error del frontend mostrado
    expect(wrapper.text()).toContain('Les contrasenyes no coincideixen.')
  })

  it('llama a la API y muestra mensaje de éxito cuando el registro funciona', async () => {
    const wrapper = mountRegisterView()

    // Preparamos el mock de axios.post para que RESUELVA correctamente
    axios.post.mockResolvedValueOnce({
      status: 201,
      data: {}
    })

    // Rellenar el formulario
    await wrapper.find('input[placeholder="Name"]').setValue('Christian')
    await wrapper.find('input[placeholder="Email"]').setValue('christian@example.com')
    await wrapper.find('input[placeholder="Password"]').setValue('secret123')
    await wrapper.find('input[placeholder="Confirm Password"]').setValue('secret123')

    // Enviar formulario
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    // Comprobar que se llamó a axios.post con los datos correctos
    expect(axios.post).toHaveBeenCalledTimes(1)
    const [, payload] = axios.post.mock.calls[0]

    expect(payload).toEqual({
      username: 'Christian',
      email: 'christian@example.com',
      password: 'secret123'
    })

    // Mensaje de éxito mostrado
    expect(wrapper.text()).toContain('Compte creat correctament!')
  })

  it('muestra errores del backend cuando el registro falla', async () => {
    const wrapper = mountRegisterView()

    // Mock: el backend devuelve errores de validación
    axios.post.mockRejectedValueOnce({
      response: {
        data: {
          username: ['This username is already taken'],
          password: ['Password too short']
        }
      }
    })

    // Rellenar el formulario
    await wrapper.find('input[placeholder="Name"]').setValue('Christian')
    await wrapper.find('input[placeholder="Email"]').setValue('christian@example.com')
    await wrapper.find('input[placeholder="Password"]').setValue('123')
    await wrapper.find('input[placeholder="Confirm Password"]').setValue('123')

    // Enviar formulario
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    // Texto genérico de error
    expect(wrapper.text()).toContain('Error creating your account')

    // Mensajes específicos del backend
    expect(wrapper.text()).toContain('This username is already taken')
    expect(wrapper.text()).toContain('Password too short')
  })
})
