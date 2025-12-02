<template>
  <div class="modal-overlay" @click.self="close">
    <div class="modal">
      <h2>Create Forum</h2>

      <form @submit.prevent="createForum">
        <label>
          Title
          <input v-model="title" type="text" required />
        </label>
        
        <label>
          Description
          <textarea v-model="description" rows="3" required />
        </label>

        <div class="actions">
          <button type="button" class="cancel" @click="close" :disabled="loading">
            Cancel
          </button>
          <button type="submit" class="create" :disabled="loading">
            <span v-if="!loading">Create</span>
            <span v-else>Creating...</span>
          </button>
        </div>
      </form>

      <p v-if="error" style="color:red">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'
import { withApiBase } from '@/utils/api'
import { useRouter } from 'vue-router'

const emit = defineEmits(['close']); 

// --- ESTADO ---
const title = ref('');
const description = ref('');
const loading = ref(false);
const error = ref(null);
const router = useRouter(); 

// --- MÉTODOS (Acciones del usuario) ---
const close = () => emit('close');
  
const createForum = async () => {
  loading.value = true;
  error.value = null;

  try {
    const response = await axios.post(withApiBase('/movies/forums/'), {
      title: title.value,
      description: description.value
    });

    const id = response.data.id;

    router.push(`/forums/${id}`);
  } catch (err) {
    if (err.response?.data?.detail) {
      error.value = err.response.data.detail[0];
    } else {
      error.value = 'Failed to create forum.';
    }
  } finally {
    this.loading = false;
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
}

.modal {
  padding: 24px;
  border-radius: 12px;
  width: 360px;
  max-width: 90%;
  background-color: #1f2937;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2);
}

.modal h2 {
  margin: 0 0 16px;
  font-size: 20px;
}

label {
  display: block;
  margin-bottom: 14px;
  font-size: 14px;
  font-weight: 600;
}

input,
textarea {
  width: 100%;
  margin-top: 4px;
  padding: 8px;
  border-radius: 6px;
  border: 1px solid #ccc;
}

.actions {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

button {
  padding: 8px 14px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-weight: 600;
}

.cancel {
  background: #374151;
}

.cancel:hover {
  background-color: #4b5563;
}

.create {
  background: #4f8cff;
  color: white;
}

.create:hover {
  background-color: #2563eb;
}

button:disabled {
  opacity: 0.6;
  cursor: default;
}

.error {
  color: #ff3b3b;
  margin-top: 4px;
  font-size: 14px;
}
</style>