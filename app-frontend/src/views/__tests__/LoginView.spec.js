// app-frontend/src/views/__tests__/LoginView.spec.js
import { mount } from '@vue/test-utils'
import LoginView from '@/views/LoginView.vue'

describe('LoginView', () => {
  const mountView = (overrides = {}) =>
    mount(LoginView, {
      global: {
        stubs: {
          'router-link': {
            template: '<a><slot /></a>',
          },
        },
        ...(overrides.global || {}),
      },
      ...(overrides || {}),
    })

  it('muestra la marca CINEMA UB en el header', () => {
    const wrapper = mountView()
    const headerText = wrapper.find('header').text()

    expect(headerText).toContain('CINEMA UB')
  })

  it('muestra un botón para volver a Home', () => {
    const wrapper = mountView()

    // Buscamos un botón que contenga "Home"
    const homeButton = wrapper
      .findAll('button')
      .find(b => b.text().toLowerCase().includes('home'))

    expect(homeButton).toBeTruthy()
  })

  it('renderiza un formulario de login con email, password y botón Log in', () => {
    const wrapper = mountView()

    const form = wrapper.find('form')
    expect(form.exists()).toBe(true)

    // Email
    const emailInput = wrapper.find('input[type="email"]')
    expect(emailInput.exists()).toBe(true)

    // Password
    const passwordInput = wrapper.find('input[type="password"]')
    expect(passwordInput.exists()).toBe(true)

    // Botón con texto "Log in"
    const loginButton = wrapper
      .findAll('button')
      .find(b => b.text().toLowerCase().includes('log in'))

    expect(loginButton).toBeTruthy()
  })

  it('permite enviar el formulario sin lanzar errores', async () => {
    const wrapper = mountView()

    const form = wrapper.find('form')
    expect(form.exists()).toBe(true)

    // Rellenamos valores básicos (por si el componente los usa)
    const emailInput = wrapper.find('input[type="email"]')
    const passwordInput = wrapper.find('input[type="password"]')

    if (emailInput.exists()) {
      await emailInput.setValue('test@example.com')
    }
    if (passwordInput.exists()) {
      await passwordInput.setValue('secret123')
    }

    // Disparamos el submit; el test pasará si no revienta
    await form.trigger('submit.prevent')
  })
})
