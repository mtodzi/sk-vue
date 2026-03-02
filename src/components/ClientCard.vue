<template>
  <div class="card shadow-sm mb-3">
    <div
      class="card-header text-white d-flex justify-content-between align-items-center"
      style="background-color: #343a40"
    >
      <span class="fs-5">{{
        isEditing ? (isNew ? 'Новый клиент' : 'Карточка клиента') : 'Карточка клиента'
      }}</span>
      <div v-if="isEditing">
        <button class="btn btn-light btn-sm me-2" @click="cancelEdit">
          <i class="fas fa-reply text-danger"></i>
        </button>
        <button class="btn btn-light btn-sm" @click="saveClient">
          <i class="fas fa-check text-success"></i>
        </button>
      </div>
      <div v-else>
        <button class="btn btn-light btn-sm" @click="startEdit">
          <i class="fas fa-pencil-alt text-success"></i>
        </button>
      </div>
    </div>

    <div class="card-body">
      <div v-if="isEditing">
        <!-- Edit Mode -->
        <div class="mb-3 input-group">
          <span class="input-group-text"><i class="fas fa-user-tie"></i></span>
          <input
            type="text"
            class="form-control"
            v-model="form.name"
            placeholder="*Введите ФИО клиента"
          />
        </div>

        <div v-for="(phone, index) in form.phones" :key="index" class="mb-2 input-group">
          <span class="input-group-text"><i class="fas fa-mobile-alt"></i></span>
          <input
            type="text"
            class="form-control"
            v-model="phone.number"
            placeholder="*Введите номер телефона"
          />
          <button class="btn btn-dark" @click="removePhone(index)">Удалить телефон</button>
        </div>

        <div class="mb-3">
          <button class="btn btn-dark btn-sm" @click="addPhone">
            <i class="fas fa-plus text-success"></i>
          </button>
        </div>

        <div class="mb-3 input-group">
          <span class="input-group-text"><i class="fas fa-at"></i></span>
          <input
            type="text"
            class="form-control"
            v-model="form.email"
            placeholder="Введите адрес электронной почты"
          />
        </div>

        <div class="mb-3 input-group">
          <span class="input-group-text"><i class="fas fa-home"></i></span>
          <input
            type="text"
            class="form-control"
            v-model="form.address"
            placeholder="Введите домашний адрес"
          />
        </div>
      </div>

      <div v-else>
        <!-- View Mode -->
        <h5 class="card-title fw-bold mb-2">{{ client.name }}</h5>
        <div v-if="client.email" class="mb-1"><i class="fas fa-at me-2"></i>{{ client.email }}</div>
        <div v-for="phone in client.phones" :key="phone.id" class="mb-1">
          <i class="fas fa-mobile-alt me-2"></i>{{ phone.number }}
        </div>
        <div v-if="client.address" class="mb-1">
          <i class="fas fa-home me-2"></i>{{ client.address }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  client: {
    type: Object,
    default: () => ({ phones: [] }),
  },
  isNew: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['save', 'cancel', 'update:isEditing'])

const isEditing = ref(props.isNew)
const form = ref({
  name: '',
  email: '',
  address: '',
  phones: [],
})

const initForm = () => {
  form.value = {
    name: props.client.name || '',
    email: props.client.email || '',
    address: props.client.address || '',
    phones: props.client.phones ? props.client.phones.map((p) => ({ ...p })) : [],
  }
  if (props.isNew && form.value.phones.length === 0) {
    form.value.phones.push({ number: '' })
  }
}

watch(() => props.client, initForm, { immediate: true })

const startEdit = () => {
  initForm()
  isEditing.value = true
  emit('update:isEditing', true)
}

const cancelEdit = () => {
  if (props.isNew) {
    emit('cancel')
  } else {
    isEditing.value = false
    emit('update:isEditing', false)
  }
}

const addPhone = () => {
  form.value.phones.push({ number: '' })
}

const removePhone = (index) => {
  form.value.phones.splice(index, 1)
}

const saveClient = () => {
  if (!form.value.name || !form.value.name.trim()) {
    alert('ФИО обязательно для заполнения')
    return
  }
  emit('save', { ...props.client, ...form.value })
  if (!props.isNew) {
    isEditing.value = false
    emit('update:isEditing', false)
  }
}
</script>
