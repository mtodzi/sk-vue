<template>
  <div class="card shadow-sm mb-3">
    <div
      class="card-header text-white d-flex justify-content-between align-items-center"
      :style="{ backgroundColor: order.urgency ? '#dc3545' : '#343a40' }"
    >
      <span class="fs-5">{{
        isNew ? 'Новый заказ' : `Заказ № ${order.id} от ${formatDate(order.created_at)}`
      }}</span>
      <div>
        <button
          v-if="!isNew"
          class="btn btn-light btn-sm me-2"
          @click="archiveCurrentOrder"
          title="Закрыть/архивировать заказ"
        >
          <i class="fas fa-lock text-info"></i>
        </button>
        <button class="btn btn-light btn-sm me-2" @click="$emit('cancel')">
          <i class="fas fa-reply text-danger"></i>
        </button>
        <button class="btn btn-light btn-sm" @click="saveOrder">
          <i class="fas fa-check text-success"></i>
        </button>
      </div>
    </div>
    <div class="card-body">
      <!-- Client Selection -->
      <div class="mb-3">
        <label class="form-label">Клиент</label>
        <div class="d-flex gap-2">
          <div class="flex-grow-1">
            <Multiselect
              v-model="order.client"
              :options="clients"
              label="name"
              track-by="id"
              placeholder="Выберите клиента"
              selectLabel="Нажмите Enter для выбора"
              selectedLabel="Выбрано"
              deselectLabel="Нажмите Enter для удаления"
            >
              <template #singleLabel="{ option }">
                {{ option.name }}
                <span v-if="option.phone" class="text-muted">({{ option.phone }})</span>
              </template>
              <template #option="{ option }">
                {{ option.name }}
                <span v-if="option.phone" class="text-muted">({{ option.phone }})</span>
              </template>
            </Multiselect>
          </div>
          <button
            class="btn btn-outline-secondary"
            @click="$emit('openClientModal')"
            title="Добавить клиента"
          >
            <i class="fas fa-user-plus"></i>
          </button>
        </div>
      </div>

      <!-- Product Selection -->
      <div class="mb-3">
        <label class="form-label">Продукт (Устройство)</label>
        <div class="d-flex gap-2">
          <div class="flex-grow-1">
            <Multiselect
              v-model="selectedProduct"
              :options="productOptions"
              label="name"
              track-by="id"
              placeholder="Выберите продукт"
              :loading="isLoadingProducts"
            >
              <template #singleLabel="{ option }">
                {{ option.name }} - {{ option.model }} ({{ option.brand }})
              </template>
              <template #option="{ option }">
                <div class="d-flex justify-content-between">
                  <span>{{ option.name }}</span>
                  <span class="text-muted small">{{ option.brand }} {{ option.model }}</span>
                </div>
              </template>
            </Multiselect>
          </div>
          <button
            class="btn btn-outline-secondary"
            @click="openProductModal"
            title="Добавить продукт"
          >
            <i class="fas fa-plus"></i>
          </button>
        </div>
      </div>

      <!-- Malfunctions Selection -->
      <div class="mb-3">
        <label class="form-label">Заявленные неисправности</label>
        <Multiselect
          v-model="order.malfunctions"
          :options="malfunctionOptions"
          :multiple="true"
          :taggable="true"
          @tag="addMalfunction"
          label="name"
          track-by="id"
          placeholder="Выберите или добавьте неисправность"
          tag-placeholder="Добавить неисправность"
        >
        </Multiselect>
      </div>

      <!-- Service Type -->
      <div class="mb-3">
        <label class="form-label">Тип работ</label>
        <div class="d-flex gap-3">
          <div class="form-check">
            <input
              class="form-check-input"
              type="checkbox"
              id="checkDiagnostics"
              v-model="is_diagnostics"
            />
            <label class="form-check-label" for="checkDiagnostics"> Диагностика </label>
          </div>
          <div class="form-check">
            <input class="form-check-input" type="checkbox" id="checkRepair" v-model="is_repair" />
            <label class="form-check-label" for="checkRepair"> Ремонт </label>
          </div>
        </div>
      </div>

      <!-- Appearance -->
      <div class="mb-3">
        <label class="form-label">Внешний вид</label>
        <input
          type="text"
          class="form-control"
          v-model="order.appearance"
          placeholder="Царапины, потертости..."
        />
      </div>

      <!-- Urgency -->
      <div class="mb-3 form-check">
        <input class="form-check-input" type="checkbox" id="checkUrgency" v-model="order.urgency" />
        <label class="form-check-label" for="checkUrgency"> Срочно </label>
      </div>

      <!-- Special Notes -->
      <div class="mb-3">
        <label class="form-label">Особенные заметки</label>
        <textarea class="form-control" v-model="order.special_notes" rows="3"></textarea>
      </div>
    </div>

    <!-- New Product Modal -->
    <div
      v-if="showProductModal"
      class="modal-backdrop d-flex align-items-center justify-content-center"
      style="
        background-color: rgba(0, 0, 0, 0.5);
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1060;
      "
    >
      <div class="card shadow" style="width: 500px">
        <div
          class="card-header bg-dark text-white d-flex justify-content-between align-items-center"
        >
          <span>Добавить продукт</span>
          <button class="btn btn-light btn-sm" @click="closeProductModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="card-body">
          <ProductForm
            :db="db"
            :isNew="true"
            :modes="['one']"
            @save="onProductCreated"
            @cancel="closeProductModal"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import Multiselect from 'vue-multiselect'
import ProductForm from './ProductForm.vue'
import { saveDBToIndexedDB } from '../utils/db'
import 'vue-multiselect/dist/vue-multiselect.css'

const props = defineProps({
  order: {
    type: Object,
    default: () => ({}),
  },
  isNew: Boolean,
  clients: {
    type: Array,
    default: () => [],
  },
  db: Object,
})
const emit = defineEmits(['save', 'cancel', 'openClientModal'])

const is_diagnostics = ref(false)
const is_repair = ref(false)

// Sync repair_type from DB with local checkbox models
watch(
  () => props.order.repair_type,
  (val) => {
    is_diagnostics.value = val === 0 || val === 2
    is_repair.value = val === 1 || val === 2
  },
  { immediate: true },
)

// Sync local checkbox models with repair_type for saving
watch([is_diagnostics, is_repair], ([isDiag, isRepair]) => {
  let newRepairType = null
  if (isDiag && isRepair) {
    newRepairType = 2 // Диагностика и ремонт
  } else if (isRepair) {
    newRepairType = 1 // Ремонт
  } else if (isDiag) {
    newRepairType = 0 // Диагностика
  }
  props.order.repair_type = newRepairType
})

const saveOrder = async () => {
  if (!props.db) return
  if (!props.order.client) {
    alert('Выберите клиента')
    return
  }
  if (!props.order.serial_number_id) {
    alert('Выберите продукт')
    return
  }

  try {
    const now = Date.now()
    let orderId = props.order.id
    const urgencyInt = props.order.urgency ? 1 : 0

    if (props.isNew) {
      const stmt = props.db.prepare(`
        INSERT INTO orders (
          client_id, serial_number_id, repair_type, urgency,
          appearance, special_notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      stmt.run([
        props.order.client.id,
        props.order.serial_number_id,
        props.order.repair_type,
        urgencyInt,
        props.order.appearance || '',
        props.order.special_notes || '',
        now,
        now,
      ])
      stmt.free()

      const res = props.db.exec('SELECT last_insert_rowid() as id')
      orderId = res[0].values[0][0]
      props.order.id = orderId
      props.order.created_at = now
      props.order.updated_at = now
    } else {
      const stmt = props.db.prepare(`
        UPDATE orders SET
          client_id = ?, serial_number_id = ?, repair_type = ?, urgency = ?,
          appearance = ?, special_notes = ?, updated_at = ?
        WHERE id = ?
      `)
      stmt.run([
        props.order.client.id,
        props.order.serial_number_id,
        props.order.repair_type,
        urgencyInt,
        props.order.appearance || '',
        props.order.special_notes || '',
        now,
        orderId,
      ])
      stmt.free()

      // Clear existing malfunctions to re-insert
      const delStmt = props.db.prepare('DELETE FROM orders_claimed_malfunctions WHERE order_id = ?')
      delStmt.run([orderId])
      delStmt.free()
      props.order.updated_at = now
    }

    // Insert malfunctions
    if (props.order.malfunctions && props.order.malfunctions.length > 0) {
      const insertMal = props.db.prepare(
        'INSERT INTO orders_claimed_malfunctions (order_id, claimed_malfunction_id) VALUES (?, ?)',
      )
      for (const m of props.order.malfunctions) {
        insertMal.run([orderId, m.id])
      }
      insertMal.free()
    }

    await saveDBToIndexedDB(props.db)
    emit('save', orderId)
  } catch (e) {
    console.error(e)
    alert('Ошибка при сохранении заказа: ' + e.message)
  }
}

const archiveCurrentOrder = async () => {
  if (!props.db || props.isNew) return
  if (confirm(`Вы уверены, что хотите закрыть и архивировать заказ № ${props.order.id}?`)) {
    try {
      const stmt = props.db.prepare('UPDATE orders SET archive = 1, updated_at = ? WHERE id = ?')
      stmt.run([Date.now(), props.order.id])
      stmt.free()

      await saveDBToIndexedDB(props.db)
      emit('save', props.order.id) // Re-use save event to close form and refresh list
    } catch (e) {
      console.error(e)
      alert('Ошибка при архивации заказа: ' + e.message)
    }
  }
}

const selectedProduct = ref(null)
const productOptions = ref([])
const isLoadingProducts = ref(false)
const showProductModal = ref(false)
const malfunctionOptions = ref([])

if (props.isNew && !props.order.malfunctions) {
  props.order.malfunctions = []
}

watch(
  () => props.order.serial_number_id,
  (newVal) => {
    if (newVal && props.db) {
      // Fetch initial product if ID exists
      const stmt = props.db.prepare(`
      SELECT sn.id, sn.name, d.model, b.name as brand
      FROM serial_numbers sn
      LEFT JOIN devices d ON sn.devise_id = d.id
      LEFT JOIN brands b ON d.brands_id = b.id
      WHERE sn.id = ?
    `)
      stmt.bind([newVal])
      if (stmt.step()) {
        selectedProduct.value = stmt.getAsObject()
      }
      stmt.free()
    }
  },
  { immediate: true },
)

watch(selectedProduct, (val) => {
  if (val) {
    props.order.serial_number_id = val.id
  }
})

const fetchAllProducts = () => {
  if (!props.db) return
  isLoadingProducts.value = true
  try {
    const stmt = props.db.prepare(`
      SELECT sn.id, sn.name, d.model, b.name as brand
      FROM serial_numbers sn
      LEFT JOIN devices d ON sn.devise_id = d.id
      LEFT JOIN brands b ON d.brands_id = b.id
      ORDER BY sn.name
    `)
    const res = []
    while (stmt.step()) res.push(stmt.getAsObject())
    stmt.free()
    productOptions.value = res
  } finally {
    isLoadingProducts.value = false
  }
}

const fetchMalfunctions = () => {
  if (!props.db) return
  try {
    const stmt = props.db.prepare('SELECT id, name FROM claimed_malfunctions ORDER BY name')
    const res = []
    while (stmt.step()) res.push(stmt.getAsObject())
    stmt.free()
    malfunctionOptions.value = res
  } catch (e) {
    console.error('Error fetching malfunctions:', e)
  }
}

watch(
  () => props.db,
  () => {
    fetchAllProducts()
    fetchMalfunctions()
  },
  { immediate: true },
)

const addMalfunction = async (newTag) => {
  if (!props.db) return
  try {
    const existing = malfunctionOptions.value.find(
      (o) => o.name.toLowerCase() === newTag.toLowerCase(),
    )
    if (existing) {
      if (!props.order.malfunctions.find((m) => m.id === existing.id)) {
        props.order.malfunctions.push(existing)
      }
      return
    }

    const insertStmt = props.db.prepare('INSERT INTO claimed_malfunctions (name) VALUES (?)')
    insertStmt.run([newTag])
    insertStmt.free()

    const res = props.db.exec('SELECT last_insert_rowid() as id')
    const newId = res[0].values[0][0]
    const newMalfunction = { id: newId, name: newTag }

    malfunctionOptions.value.push(newMalfunction)
    props.order.malfunctions.push(newMalfunction)
    await saveDBToIndexedDB(props.db)
  } catch (e) {
    console.error('Error adding malfunction:', e)
    alert('Ошибка при добавлении неисправности')
  }
}

const openProductModal = () => {
  showProductModal.value = true
}
const closeProductModal = () => {
  showProductModal.value = false
}

const onProductCreated = ({ ids }) => {
  // When a new product is created, select it
  if (ids && ids.length > 0) {
    const newId = ids[0]
    fetchAllProducts()
    const prod = productOptions.value.find((p) => p.id === newId)
    if (prod) {
      selectedProduct.value = prod
    }
  }
  closeProductModal()
}

const formatDate = (ts) => {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('ru-RU')
}
</script>
