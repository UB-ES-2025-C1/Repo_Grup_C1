<template>
  <section class="filter-section">
    <!-- Barra de búsqueda -->
    <div class="search-bar">
      <label for="search">Name</label>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search forums..."
        class="search-input"
      />
    </div>

    <!-- Filtros -->
    <div class="filters">
      <!-- Sort -->
      <div class="filter-group">
        <label for="sort">Sort by</label>
        <select id="sort" v-model="selected.sortBy">
          <option value="title">Alphabetically</option>
          <option value="popularity">Popularity</option>
          <option value="creation">Creation</option>
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
      <button class="apply" @click="applyFilters">Apply Filters</button>
      <button class="clear" @click="resetFilters">Clear Filters</button>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'

// Emite los filtros seleccionados al padre
const emit = defineEmits(['applyFilters']);

const selected = ref({
  sortBy: 'popularity',
  order: 'desc'
});

function applyFilters() {
  emit('applyFilters', { ...selected.value });
}

function resetFilters() {
  selected.value = {
    sortBy: 'rating',
    order: 'desc'
  }
  emit('applyFilters', { ...selected.value });
}
</script>

<style scoped>
.filter-section {
  width: max-content;
  display: flex;
  padding: 0.5rem;
  background-color: #111820;
  border-radius: 12px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.25);
  color: #eaeaea;
  gap: 1rem;
}

.search-bar {
  width: 40rem;
  display: flex;
  flex-direction: column;
}

.search-input {
  flex: 1;
  width: 100%;
  padding: 0.5rem;
  border-radius: 6px;
  border: 1px solid #333;
  background-color: #1f2937;
  color: #eaeaea;
  font-size: 1rem;
}

.search-input::placeholder {
  color: #9ca3af;
}

.search-input:focus {
  outline: 2px solid #3b82f6;
}

.filters {
  display: flex;
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
