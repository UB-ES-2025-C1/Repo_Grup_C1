<template>
  <AppHeader />

  <div class="container">
    <!-- Filtros -->
    <section class="filters-section">
      <ForumFilter
        @applyFilters="applyFilters"
      />
    </section>

    <!-- Mensajes de carga o error -->
    <div v-if="loading" class="empty">Loading forums...</div>
    <div v-else-if="error" class="empty">⚠️ {{ error }}</div>

    <!-- Lista de foros -->
    <template v-else>
      <div class="forums-header">
        <h2>Forums</h2>
        <button class="create-forum" @click="openCreateForumModal">
          + Create Forum
        </button>
      </div>

      <!-- Forums -->
      <div v-if="filteredForums.length">
        <div class="grid">
          <ForumCard
            v-for="forum in paginatedForums"
            :key="forum.id"
            :forum="forum"
          />
        </div>
      </div>

      <div v-if="!filteredForums.length" class="empty">
        No results found.
      </div>

      <!-- Controles de paginación -->
      <div class="pagination-controls">
        <button @click="prevPage" :disabled="page === 1" class="ghost">Prev</button>
        <span>
          Page {{ page }} / {{ totalPages }} &middot;
          Showing {{ fromIndex }}–{{ toIndex }} of {{ filteredForums.length }}
        </span>
        <button @click="nextPage" :disabled="page === totalPages">Next</button>
      </div>

    </template>
  </div>

</template>

<script setup>
import AppHeader from '@/components/AppHeader.vue'
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { withApiBase } from '@/utils/api'
import ForumCard from '@/components/ForumCard.vue'
import ForumFilter from '@/components/ForumFilter.vue'

// --- ESTADO ---
const allForums = ref([]);
const loading = ref(true);
const error = ref(null);
const page = ref(1);
const pageSize = ref(10);
const searchQuery = ref('');
const selectedFilters = ref({
  sortBy: 'popularity',
  order: 'desc'
})

// --- CARGAR DATOS ---
onMounted(async () => {
  try {
    const forumsRes = await axios.get(withApiBase('/movies/forums/'));
    allForums.value = Array.isArray(forumsRes.data) ? forumsRes.data : [];
  } catch (err) {
    console.error('Error loading forums:', err);
    error.value = 'Failed to load forums. Please try again later.';
    allForums.value = [];
  } finally {
    loading.value = false;
  }
});

// --- FILTRADO ---
const filteredForums = computed(() => {
  if (!Array.isArray(allForums.value)) {
    return [];
  }
  let result = allForums.value;

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(f => f?.title?.toLowerCase().includes(q));
  }

  if (selectedFilters.value.sortBy === 'title') {
    result = [...result].sort((a, b) => {
      const tA = a.title?.toLowerCase() || '';
      const tB = b.title?.toLowerCase() || '';
      return selectedFilters.value.order === 'asc' ? tA.localeCompare(tB) : tB.localeCompare(tA);
    });
  } else if (selectedFilters.value.sortBy === 'popularity') {
    result = [...result].sort((a, b) => {
      const valA = a.posts_count || 0;
      const valB = b.posts_count || 0;
      return selectedFilters.value.order === 'asc' ? valA - valB : valB - valA;
    });
  } else if (selectedFilters.value.sortBy === 'creation') {
    result = [...result].sort((a, b) => {
      const valA = a.created_at || 0;
      const valB = b.created_at || 0;
      return selectedFilters.value.order === 'asc' ? tA.localeCompare(tB) : tB.localeCompare(tA);
    });
  }

  return result;
});

// --- APLICAR FILTROS ---
function applyFilters(filters) {
  selectedFilters.value = filters
  page.value = 1
}

// --- PAGINACIÓN ---
const totalPages = computed(() => Math.ceil(filteredForums.value.length / pageSize.value));

const paginatedForums = computed(() => {
  const startIndex = (page.value - 1) * pageSize.value;
  const endIndex = startIndex + pageSize.value;
  return filteredForums.value.slice(startIndex, endIndex);
});

const fromIndex = computed(() => (page.value - 1) * pageSize.value + 1);
const toIndex = computed(() => Math.min(page.value * pageSize.value, filteredForums.value.length));

const nextPage = () => {
  if (page.value < totalPages.value) page.value++;
};
const prevPage = () => {
  if (page.value > 1) page.value--;
};

// --- CREAR UN NUEVO FORO ---
const openCreateForumModal = () => {

};
</script>

<style scoped>
.container {
  width: 100%;
  margin: 0 auto;
  padding: 1rem;
}

/* 🔹 Filters */
.filters-section {
  width: 100%;
}

/* 🔹 Forum header */
.forums-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.create-forum {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  background: #3b82f6;
  color: white;
  font-weight: 600;
  cursor: pointer;
}

/* 🔹 Paginación */
.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
  color: var(--muted);
}

.empty {
  text-align: center;
  margin-top: 3rem;
}

</style>