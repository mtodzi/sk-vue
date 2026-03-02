<template>
  <div>
    <!-- Device Info -->
    <div class="mb-3">
      <multiselect
        v-model="form.brand"
        :options="brandOptions"
        :taggable="true"
        @tag="addBrand"
        placeholder="Бренд"
        tag-placeholder="Добавить этот бренд"
        class="mb-2"
      ></multiselect>
      <multiselect
        v-model="form.type"
        :options="typeOptions"
        :taggable="true"
        @tag="addType"
        placeholder="Тип устройства"
        tag-placeholder="Добавить этот тип"
        class="mb-2"
      ></multiselect>
      <multiselect
        v-model="form.model"
        :options="modelOptions"
        :taggable="true"
        @tag="addModel"
        placeholder="Модель устройства"
        tag-placeholder="Добавить эту модель"
        class="mb-2"
      ></multiselect>
    </div>

    <!-- Mode Selection -->
    <div v-if="isNew && modes.length > 1" class="mb-3">
      <div class="form-check form-check-inline" v-if="modes.includes('one')">
        <input class="form-check-input" type="radio" id="modeOne" value="one" v-model="mode" />
        <label class="form-check-label" for="modeOne">один продукт</label>
      </div>
      <div class="form-check form-check-inline" v-if="modes.includes('range')">
        <input class="form-check-input" type="radio" id="modeRange" value="range" v-model="mode" />
        <label class="form-check-label" for="modeRange">диапазон продуктов</label>
      </div>
      <div class="form-check form-check-inline" v-if="modes.includes('multiple')">
        <input
          class="form-check-input"
          type="radio"
          id="modeMulti"
          value="multiple"
          v-model="mode"
        />
        <label class="form-check-label" for="modeMulti">несколько продуктов</label>
      </div>
    </div>

    <!-- Serial Number Inputs -->
    <div v-if="mode === 'range' && isNew" class="row g-2">
      <div class="col-6">
        <input type="text" class="form-control" v-model="form.common" placeholder="Общая часть" />
      </div>
      <div class="col-3">
        <input type="number" class="form-control" v-model="form.start" placeholder="начало" />
      </div>
      <div class="col-3">
        <input type="number" class="form-control" v-model="form.end" placeholder="конец" />
      </div>
    </div>
    <div v-else>
      <multiselect
        v-model="form.serial"
        :options="serialSuggestions"
        :taggable="true"
        @tag="addSerial"
        @select="onSerialSelect"
        placeholder="Серийный номер"
        tag-placeholder="Добавить новый серийный номер"
        class="mb-2"
      >
      </multiselect>
    </div>

    <div class="d-flex justify-content-end gap-2 mt-3">
      <button class="btn btn-light btn-sm" @click="$emit('cancel')">
        <i class="fas fa-reply text-danger"></i> Отмена
      </button>
      <button class="btn btn-light btn-sm" @click="save(false)">
        <i class="fas fa-check text-success"></i> Сохранить
      </button>
      <button
        v-if="mode === 'multiple' && isNew"
        class="btn btn-success btn-sm"
        @click="save(true)"
      >
        <i class="fas fa-plus"></i> Добавить и продолжить
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import Multiselect from 'vue-multiselect'
import 'vue-multiselect/dist/vue-multiselect.css'
import { saveDBToIndexedDB } from '../utils/db'

const props = defineProps({
  db: Object,
  isNew: {
    type: Boolean,
    default: true,
  },
  product: {
    type: Object,
    default: () => null,
  },
  modes: {
    type: Array,
    default: () => ['one', 'range', 'multiple'],
  },
})

const emit = defineEmits(['save', 'cancel'])

const mode = ref('one')
const form = ref({
  id: null,
  brand: '',
  type: '',
  model: '',
  serial: '',
  common: '',
  start: '',
  end: '',
})

const brandOptions = ref([])
const typeOptions = ref([])
const modelOptions = ref([])
const serialSuggestions = ref([])
const serialCache = ref([])

const fetchBrands = () => {
  if (!props.db) return
  const stmt = props.db.prepare('SELECT name FROM brands ORDER BY name')
  const res = []
  while (stmt.step()) {
    const name = stmt.getAsObject().name
    if (name) res.push(name)
  }
  stmt.free()
  brandOptions.value = res
}

const fetchTypes = () => {
  if (!props.db) return
  const stmt = props.db.prepare('SELECT name FROM device_types ORDER BY name')
  const res = []
  while (stmt.step()) {
    const name = stmt.getAsObject().name
    if (name) res.push(name)
  }
  stmt.free()
  typeOptions.value = res
}

const fetchModels = () => {
  if (!props.db) return
  const stmt = props.db.prepare('SELECT DISTINCT model as name FROM devices ORDER BY name')
  const res = []
  while (stmt.step()) {
    const name = stmt.getAsObject().name
    if (name) res.push(name)
  }
  stmt.free()
  modelOptions.value = res
}

function fetchSerials() {
  if (!props.db) return
  const stmt = props.db.prepare(`
    SELECT sn.name, d.model, b.name as brand, dt.name as type
    FROM serial_numbers sn
    LEFT JOIN devices d ON sn.devise_id = d.id
    LEFT JOIN brands b ON d.brands_id = b.id
    LEFT JOIN device_types dt ON d.devices_type_id = dt.id
    ORDER BY sn.name
  `)
  const results = []
  while (stmt.step()) results.push(stmt.getAsObject())
  stmt.free()
  serialCache.value = results
  serialSuggestions.value = results.map((r) => r.name).filter((n) => n)
}

function initData() {
  fetchBrands()
  fetchTypes()
  fetchModels()
  fetchSerials()

  if (props.product && !props.isNew) {
    form.value = {
      id: props.product.id,
      brand: props.product.brand,
      type: props.product.type,
      model: props.product.model,
      serial: props.product.serial_number || props.product.serial,
      common: '',
      start: '',
      end: '',
    }
  } else {
    form.value = {
      id: null,
      brand: '',
      type: '',
      model: '',
      serial: '',
      common: '',
      start: '',
      end: '',
    }
  }
}

onMounted(() => {
  if (props.modes.length > 0) mode.value = props.modes[0]
  initData()
})

watch(() => props.product, initData, { immediate: true })

const onSerialSelect = (selectedSerial) => {
  const productData = serialCache.value.find((p) => p.name === selectedSerial)
  if (productData) {
    form.value.brand = productData.brand
    form.value.type = productData.type
    form.value.model = productData.model
  }
}

const addBrand = (val) => {
  brandOptions.value.push(val)
  form.value.brand = val
}
const addType = (val) => {
  typeOptions.value.push(val)
  form.value.type = val
}
const addModel = (val) => {
  modelOptions.value.push(val)
  form.value.model = val
}
const addSerial = (val) => {
  serialSuggestions.value.push(val)
  form.value.serial = val
}

const getOrCreateId = (table, name) => {
  const stmt = props.db.prepare(`SELECT id FROM ${table} WHERE name = ?`)
  stmt.bind([name])
  if (stmt.step()) {
    const id = stmt.getAsObject().id
    stmt.free()
    return id
  }
  stmt.free()
  const insertStmt = props.db.prepare(`INSERT INTO ${table} (name) VALUES (?)`)
  insertStmt.run([name])
  insertStmt.free()
  const res = props.db.exec('SELECT last_insert_rowid() as id')
  return res[0].values[0][0]
}

const save = async (keepOpen = false) => {
  if (!form.value.brand || !form.value.type || !form.value.model) {
    return alert('Заполните Бренд, Тип и Модель')
  }

  try {
    const brandId = getOrCreateId('brands', form.value.brand)
    const typeId = getOrCreateId('device_types', form.value.type)

    // Get or Create Device
    let deviceId
    const devStmt = props.db.prepare(
      'SELECT id FROM devices WHERE brands_id = ? AND devices_type_id = ? AND model = ?',
    )
    devStmt.bind([brandId, typeId, form.value.model])
    if (devStmt.step()) {
      deviceId = devStmt.getAsObject().id
    } else {
      const insertDev = props.db.prepare(
        'INSERT INTO devices (brands_id, devices_type_id, model) VALUES (?, ?, ?)',
      )
      insertDev.run([brandId, typeId, form.value.model])
      insertDev.free()
      deviceId = props.db.exec('SELECT last_insert_rowid() as id')[0].values[0][0]
    }
    devStmt.free()

    const serialsToProcess = []
    if (mode.value === 'range' && props.isNew) {
      if (!form.value.common || !form.value.start || !form.value.end)
        return alert('Заполните диапазон')
      for (let i = parseInt(form.value.start); i <= parseInt(form.value.end); i++) {
        serialsToProcess.push(form.value.common + i)
      }
    } else {
      if (!form.value.serial) return alert('Введите серийный номер')
      serialsToProcess.push(form.value.serial)
    }

    const savedIds = []
    for (const sn of serialsToProcess) {
      let snId
      const checkStmt = props.db.prepare('SELECT id FROM serial_numbers WHERE name = ?')
      checkStmt.bind([sn])
      if (checkStmt.step()) {
        snId = checkStmt.getAsObject().id
        const updateSn = props.db.prepare('UPDATE serial_numbers SET devise_id = ? WHERE id = ?')
        updateSn.run([deviceId, snId])
        updateSn.free()
      } else {
        const insertSn = props.db.prepare(
          'INSERT INTO serial_numbers (name, devise_id) VALUES (?, ?)',
        )
        insertSn.run([sn, deviceId])
        insertSn.free()
        snId = props.db.exec('SELECT last_insert_rowid() as id')[0].values[0][0]
      }
      checkStmt.free()
      savedIds.push(snId)
    }

    await saveDBToIndexedDB(props.db)

    emit('save', { ids: savedIds, keepOpen })

    if (keepOpen) {
      form.value.serial = ''
    }
  } catch (e) {
    console.error(e)
    alert('Ошибка: ' + e.message)
  }
}
</script>
