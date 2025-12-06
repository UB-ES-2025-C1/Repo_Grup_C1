<template>
  <section class="filter-section">
    <!-- Barra de búsqueda -->
    <div class="search-bar">
      <label for="search">Name</label>
      <input
        v-model="selected.searchQuery"
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
          <option value="popularity">Popularity</option>
          <option value="title">Alphabetically</option>
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
      <button class="apply" @click="applyFilters">Apply Sorting</button>
      <button class="clear" @click="resetFilters">Clear Sorting</button>
    </div>
  </section>
</template>

<script setup>
import { ref, watch } from 'vue'

// Emite los filtros seleccionados al padre
const emit = defineEmits(['applyFilters']);

const selected = ref({
  searchQuery: '',
  sortBy: 'popularity',
  order: 'desc'
});

watch(
  () => selected.value.searchQuery,
  () => {
    applyFilters(); // Se ejecuta automáticamente al cambiar el input
  }
);

function applyFilters() {
  emit('applyFilters', { ...selected.value });
}

function resetFilters() {
  selected.value.sortBy = 'popularity';
  selected.value.order = 'desc';
  emit('applyFilters', { ...selected.value });
}
</script>

<style scoped>
.filter-section {
  width: 100%;
  max-width: 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  padding: 0.5rem;
  background-color: #111820;
  border-radius: 12px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.25);
  color: #eaeaea;
  gap: 1rem;
}

.search-bar {
  flex: 1;
  min-width: 16rem;
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
  height: 2.25rem;;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: auto;
}

button {
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
