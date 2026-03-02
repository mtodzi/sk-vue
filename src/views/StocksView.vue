<template>
  <MainLayout>
    <!-- Toolbar -->
    <div class="bg-white border-bottom px-3 px-lg-4 pb-3 pt-1" style="margin-top: -1px">
      <div
        class="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3"
      >
        <!-- Left: Title (Handled by MainLayout, but we add specific controls here) -->
        <div class="d-flex align-items-center gap-2 flex-wrap">
          <span class="fs-5 me-2 d-none d-lg-block">Склады</span>

          <!-- Stock Controls -->
          <button class="btn btn-dark btn-sm" @click="openStockModal(true)" title="Добавить склад">
            <i class="fas fa-plus text-primary"></i>
          </button>
          <button
            class="btn btn-dark btn-sm"
            @click="openStockModal(false)"
            :disabled="!currentStockId"
            title="Отредактировать склад"
          >
            <i class="fas fa-pencil-alt text-primary"></i>
          </button>

          <select
            class="form-select form-select-sm w-auto"
            v-model="currentStockId"
            @change="fetchProducts"
          >
            <option :value="null" disabled>Выберите склад</option>
            <option v-for="stock in stocks" :key="stock.id" :value="stock.id">
              {{ stock.name }}
            </option>
          </select>

          <button
            class="btn btn-dark btn-sm"
            @click="openProductModal(true)"
            :disabled="!currentStockId"
            title="Добавить продукт на склад"
          >
            <i class="fas fa-box-open text-primary"></i>
          </button>
        </div>

        <!-- Right: Search -->
        <div class="d-flex search-form-container" style="max-width: 400px">
          <input type="text" class="form-control me-2" placeholder="Поиск" v-model="searchQuery" />
          <button class="btn btn-outline-success flex-shrink-0" @click="fetchProducts">
            Поиск
          </button>
        </div>
      </div>
    </div>

    <div class="container-fluid p-4">
      <div v-if="!currentStockId && stocks.length === 0" class="text-center text-muted mt-5">
        Складов нет. Создайте первый склад.
      </div>
      <div v-else-if="!currentStockId" class="text-center text-muted mt-5">
        Выберите склад для просмотра.
      </div>
      <div v-else>
        <!-- Product List -->
        <div v-for="product in products" :key="product.id" class="card shadow-sm mb-3">
          <div
            class="card-header text-white d-flex justify-content-between align-items-center"
            style="background-color: #343a40"
          >
            <span>Карточка продукта на складе</span>
            <div class="d-flex gap-2">
              <button class="btn btn-light btn-sm" @click="openProductModal(false, product)">
                <i class="fas fa-pencil-alt text-success"></i>
              </button>
              <button
                class="btn btn-light btn-sm"
                @click="deleteProductFromStock(product)"
                title="Удалить со склада"
              >
                <i class="fas fa-trash text-danger"></i>
              </button>
            </div>
          </div>
          <div class="card-body">
            <h5 class="card-title fw-bold">Серийный номер продукта -{{ product.serial_number }}</h5>
            <div class="mb-1">Бренд продукта -{{ product.brand }}</div>
            <div class="mb-1">Тип устройства -{{ product.type }}</div>
            <div class="mb-1">Модель устройства -{{ product.model }}</div>
          </div>
        </div>
        <div v-if="products.length === 0" class="text-center text-muted mt-3">
          На этом складе нет продуктов.
        </div>
      </div>
    </div>

    <!-- Stock Modal (Add/Edit) -->
    <div
      v-if="showStockModal"
      class="modal-backdrop d-flex align-items-center justify-content-center"
      style="
        background-color: rgba(0, 0, 0, 0.5);
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1050;
      "
    >
      <div class="card shadow" style="width: 400px">
        <div
          class="card-header bg-dark text-white d-flex justify-content-between align-items-center"
        >
          <span>{{ isNewStock ? 'Добавить склад' : 'Редактировать склад' }}</span>
          <div class="d-flex gap-2">
            <button class="btn btn-light btn-sm" @click="closeStockModal">
              <i class="fas fa-reply text-danger"></i>
            </button>
            <button class="btn btn-light btn-sm" @click="saveStock">
              <i class="fas fa-check text-success"></i>
            </button>
          </div>
        </div>
        <div class="card-body">
          <input
            type="text"
            class="form-control"
            v-model="stockForm.name"
            placeholder="Название склада"
          />
        </div>
      </div>
    </div>

    <!-- Product Modal (Add/Edit) -->
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
        z-index: 1050;
        overflow-y: auto;
      "
    >
      <div class="card shadow" style="width: 600px; max-height: 90vh">
        <div
          class="card-header bg-dark text-white d-flex justify-content-between align-items-center"
        >
          <span>{{
            isNewProduct ? 'Добавить продукт на склад' : 'Карточка продукта на складе'
          }}</span>
          <button class="btn btn-light btn-sm" @click="closeProductModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="card-body">
          <ProductForm
            :db="db"
            :isNew="isNewProduct"
            :product="currentProduct"
            :modes="['one', 'range', 'multiple']"
            @save="onProductSaved"
            @cancel="closeProductModal"
          />
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import MainLayout from '../components/MainLayout.vue'
import initSqlJs from 'sql.js'
import Multiselect from 'vue-multiselect'
import ProductForm from '../components/ProductForm.vue'
import { loadDBFromIndexedDB, saveDBToIndexedDB } from '../utils/db'
import 'vue-multiselect/dist/vue-multiselect.css'

const db = ref(null)
const stocks = ref([])
const currentStockId = ref(null)
const products = ref([])
const searchQuery = ref('')

// Stock Modal State
const showStockModal = ref(false)
const isNewStock = ref(true)
const stockForm = ref({ name: '' })

// Product Modal State
const showProductModal = ref(false)
const isNewProduct = ref(true)
const currentProduct = ref(null)

const initDB = async () => {
  try {
    const dbData = await loadDBFromIndexedDB()
    if (dbData) {
      const SQL = await initSqlJs({
        locateFile: (file) => `${import.meta.env.BASE_URL}sql-wasm.wasm`,
      })
      db.value = new SQL.Database(dbData)
      fetchStocks()
    }
  } catch (e) {
    console.error('Error loading DB:', e)
  }
}

const fetchStocks = () => {
  if (!db.value) return
  try {
    const stmt = db.value.prepare('SELECT id, name FROM stocks ORDER BY name')
    const res = []
    while (stmt.step()) res.push(stmt.getAsObject())
    stmt.free()
    stocks.value = res
    if (res.length > 0 && !currentStockId.value) {
      currentStockId.value = res[0].id
      fetchProducts()
    }
  } catch (e) {
    console.error('Error fetching stocks:', e)
  }
}

const fetchProducts = () => {
  if (!db.value || !currentStockId.value) {
    products.value = []
    return
  }
  let query = `
    SELECT sn.id, sn.name as serial_number, d.model, b.name as brand, dt.name as type
    FROM equipment_stock es
    JOIN serial_numbers sn ON es.serial_number_id = sn.id
    JOIN devices d ON sn.devise_id = d.id
    JOIN brands b ON d.brands_id = b.id
    JOIN device_types dt ON d.devices_type_id = dt.id
    WHERE es.stock_id = ?
  `
  const params = [currentStockId.value]
  console.log(currentStockId.value)
  if (searchQuery.value) {
    query += ` AND (sn.name LIKE ? OR d.model LIKE ? OR b.name LIKE ?)`
    const term = `%${searchQuery.value}%`
    params.push(term, term, term)
  }

  query += ` ORDER BY sn.id DESC`

  const stmt = db.value.prepare(query)
  stmt.bind(params)
  const res = []
  while (stmt.step()) {
    console.log(stmt.getAsObject())
    res.push(stmt.getAsObject())
  }
  stmt.free()
  products.value = res
}

// --- Stock Modal Logic ---
const openStockModal = (isNew) => {
  isNewStock.value = isNew
  if (isNew) {
    stockForm.value = { name: '' }
  } else {
    const stock = stocks.value.find((s) => s.id === currentStockId.value)
    stockForm.value = { name: stock ? stock.name : '' }
  }
  showStockModal.value = true
}

const closeStockModal = () => {
  showStockModal.value = false
}

const saveStock = async () => {
  if (!stockForm.value.name || !stockForm.value.name.trim()) return alert('Введите название склада')
  try {
    if (isNewStock.value) {
      //db.value.run('INSERT INTO stocks (name) VALUES (?)', [stockForm.value.name])
      const insertStocks = db.value.prepare('INSERT INTO stocks (name) VALUES (?)')
      insertStocks.bind([stockForm.value.name])
      insertStocks.step()
      insertStocks.free()
    } else {
      //db.value.run('UPDATE stocks SET name = ? WHERE id = ?', [
      // stockForm.value.name,
      //  currentStockId.value,
      //])
      const updateStocks = db.value.prepare('UPDATE stocks SET name = ? WHERE id = ?')
      updateStocks.bind([stockForm.value.name, currentStockId.value])
      updateStocks.step()
      updateStocks.free()
    }
    await saveDBToIndexedDB(db.value)
    fetchStocks()
    closeStockModal()
  } catch (e) {
    console.error(e)
    alert('Ошибка при сохранении склада')
  }
}

// --- Product Modal Logic ---
const openProductModal = (isNew, product = null) => {
  isNewProduct.value = isNew
  currentProduct.value = product
  showProductModal.value = true
}

const closeProductModal = () => {
  showProductModal.value = false
  currentProduct.value = null
}

const onProductSaved = async ({ ids, keepOpen }) => {
  try {
    if (isNewProduct.value) {
      // Link created serials to current stock
      for (const snId of ids) {
        const checkStock = db.value.prepare(
          'SELECT * FROM equipment_stock WHERE stock_id = ? AND serial_number_id = ?',
        )
        checkStock.bind([currentStockId.value, snId])
        if (!checkStock.step()) {
          const insertEquipmentStock = db.value.prepare(
            'INSERT INTO equipment_stock (stock_id, serial_number_id) VALUES (?, ?)',
          )
          insertEquipmentStock.bind([currentStockId.value, snId])
          insertEquipmentStock.step()
          insertEquipmentStock.free()
        }
        checkStock.free()
      }
      await saveDBToIndexedDB(db.value)
    }

    fetchProducts()

    if (!keepOpen) {
      closeProductModal()
    }
  } catch (e) {
    console.error(e)
    alert('Ошибка при сохранении продукта: ' + e.message)
  }
}

const deleteProductFromStock = async (product) => {
  if (!confirm(`Вы уверены, что хотите удалить продукт ${product.serial_number} со склада?`)) return

  try {
    const stmt = db.value.prepare(
      'DELETE FROM equipment_stock WHERE stock_id = ? AND serial_number_id = ?',
    )
    stmt.run([currentStockId.value, product.id])
    stmt.free()

    await saveDBToIndexedDB(db.value)
    fetchProducts()
  } catch (e) {
    console.error(e)
    alert('Ошибка при удалении продукта со склада: ' + e.message)
  }
}

onMounted(initDB)
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}
.modal-backdrop .card-body {
  /* overflow: visible; */ /* Может понадобиться, если выпадающий список multiselect обрезается */
}
</style>
