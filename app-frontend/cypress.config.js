// cypress.config.js
import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173", // Vite por defecto
    video: false,
    setupNodeEvents(on, config) {
      // Aquí podrías añadir hooks de Cypress si los necesitas
      return config;
    },
  },
});
