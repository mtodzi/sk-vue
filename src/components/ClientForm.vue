<template>
  <div>
    <div class="mb-3 input-group">
      <span class="input-group-text"><i class="fas fa-user-tie"></i></span>
      <input
        type="text"
        class="form-control"
        :value="modelValue.name"
        @input="update('name', $event.target.value)"
        placeholder="*Введите ФИО клиента"
      />
    </div>
    <div v-for="(phone, index) in modelValue.phones" :key="index" class="mb-2 input-group">
      <span class="input-group-text"><i class="fas fa-mobile-alt"></i></span>
      <input
        type="text"
        class="form-control"
        :value="phone.number"
        @input="updatePhone(index, $event.target.value)"
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
        type="email"
        class="form-control"
        :value="modelValue.email"
        @input="update('email', $event.target.value)"
        placeholder="Введите адрес электронной почты"
      />
    </div>
    <div class="mb-3 input-group">
      <span class="input-group-text"><i class="fas fa-home"></i></span>
      <input
        type="text"
        class="form-control"
        :value="modelValue.address"
        @input="update('address', $event.target.value)"
        placeholder="Введите домашний адрес"
      />
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({ name: '', phones: [], email: '', address: '' }),
  },
})

const emit = defineEmits(['update:modelValue'])

const update = (field, value) => {
  emit('update:modelValue', { ...props.modelValue, [field]: value })
}

const updatePhone = (index, value) => {
  const newPhones = [...props.modelValue.phones]
  newPhones[index] = { ...newPhones[index], number: value }
  emit('update:modelValue', { ...props.modelValue, phones: newPhones })
}

const addPhone = () => {
  const newPhones = [...(props.modelValue.phones || []), { number: '' }]
  emit('update:modelValue', { ...props.modelValue, phones: newPhones })
}

const removePhone = (index) => {
  const newPhones = [...props.modelValue.phones]
  newPhones.splice(index, 1)
  emit('update:modelValue', { ...props.modelValue, phones: newPhones })
}
</script>
