<template>
  <section class="filter-section">
    <h2>Filter</h2>

    <div class="filters">
      <!-- Genre -->
      <div class="filter-group">
        <label for="genre">Genre</label>
        <select id="genre" v-model="selected.genre">
          <option value="">All</option>
          <option v-for="g in genres" :key="g" :value="g">{{ g }}</option>
        </select>
      </div>

      <!-- Year -->
      <div class="filter-group">
        <label for="year">Year</label>
        <select id="year" v-model="selected.year">
          <option value="">All</option>
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>

      <!-- Director -->
      <div class="filter-group">
        <label for="director">Director</label>
        <input
          id="director"
          type="text"
          v-model="selected.director"
          placeholder="Type or select director"
        />
      </div>

      <!-- Actor -->
      <div class="filter-group">
        <label for="actor">Actor</label>
        <input
          id="actor"
          type="text"
          v-model="selected.actor"
          placeholder="Type or select actor"
        />
      </div>

      <!-- Sort -->
      <div class="filter-group">
        <label for="sort">Sort by</label>
        <select id="sort" v-model="selected.sortBy">
          <option value="rating">Rating</option>
          <option value="title">Alphabetically</option>
          <option value="popularity">Popularity</option>
        </select>
      </div>

      <!-- Order -->
      <div class="filter-group">
        <label for="order">Order</label>
        <select id="order" v-model="selected.order">
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </div>
    </div>

    <!-- Buttons -->
    <div class="buttons">
      <button class="apply">Apply Filters</button>
      <button class="clear" @click="resetFilters">Clear Filters</button>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'

// Opciones de ejemplo (más adelante vendrán del backend)
const genres = ['Action', 'Comedy', 'Drama', 'Thriller']
const years = Array.from({ length: 20 }, (_, i) => 2024 - i)

// Estado de los filtros seleccionados
const selected = ref({
  genre: '',
  year: '',
  director: '',
  actor: '',
  sortBy: 'rating',
  order: 'desc'
})

// Reinicia todos los filtros
function resetFilters() {
  selected.value = {
    genre: '',
    year: '',
    director: '',
    actor: '',
    sortBy: 'rating',
    order: 'desc'
  }
}
</script>

<style scoped>
.filter-section {
  max-width: 900px;
  margin: 2rem auto;
  padding: 1.5rem;
  background-color: #111820;
  border-radius: 12px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.25);
  color: #eaeaea;
}

h2 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.filter-group {
  display: flex;
  flex-direction: column;
}

label {
  margin-bottom: 0.25rem;
  font-weight: 500;
  color: #b0b8c1;
}

select,
input {
  padding: 0.5rem;
  border-radius: 6px;
  border: 1px solid #333;
  background-color: #1f2937;
  color: #eaeaea;
}

select:focus,
input:focus {
  outline: 2px solid #3b82f6;
}

.buttons {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}

button {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-weight: 600;
}

button.apply {
  background-color: #3b82f6;
  color: white;
}

button.apply:hover {
  background-color: #2563eb;
}

button.clear {
  background-color: #374151;
  color: #e5e7eb;
}

button.clear:hover {
  background-color: #4b5563;
}
</style>
