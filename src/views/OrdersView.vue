<template>
  <MainLayout>
    <!-- Toolbar -->
    <div class="bg-white border-bottom px-3 px-lg-4 pb-3 pt-1" style="margin-top: -1px">
      <div
        class="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3"
      >
        <div class="d-flex align-items-center mb-3 mb-lg-0">
          <!-- Sidebar toggle handled by MainLayout usually, but adding button here for mobile if needed -->
          <h4 class="mb-0 fw-normal">{{ showArchived ? 'Архив' : 'Заказы' }}</h4>
        </div>

        <div class="d-flex align-items-center justify-content-center flex-grow-1 mb-3 mb-lg-0">
          <button
            class="btn d-flex align-items-center justify-content-center me-1"
            :class="showArchived ? 'btn-secondary' : 'btn-danger'"
            style="width: 38px; height: 38px"
            @click="toggleArchive"
            :title="showArchived ? 'К активным заказам' : 'В архив'"
          >
            <i class="fas" :class="showArchived ? 'fa-box-open' : 'fa-lock'"></i>
          </button>
          <button
            class="btn btn-success d-flex align-items-center justify-content-center"
            style="width: 38px; height: 38px"
            @click="startNewOrder"
            v-if="!isCreating"
          >
            <i class="fas fa-plus"></i>
          </button>
        </div>

        <div class="d-flex search-form-container" style="max-width: 400px">
          <input
            type="text"
            class="form-control me-2"
            placeholder="Поиск"
            v-model="searchQuery"
            @input="fetchOrders"
          />
          <button class="btn btn-outline-success flex-shrink-0" @click="fetchOrders">Поиск</button>
        </div>
      </div>
    </div>

    <div class="p-3 p-lg-4 flex-grow-1 orders-container">
      <!-- New Order Form -->
      <div v-if="isCreating" class="mb-4">
        <OrderCard
          :isNew="isNewOrder"
          :order="newOrderData"
          :clients="clients"
          :db="db"
          @save="onOrderSaved"
          @cancel="cancelNewOrder"
        />
      </div>

      <!-- Orders List -->
      <div v-for="order in orders" :key="order.id" class="order-card mb-3">
        <div
          class="order-header"
          :style="{ backgroundColor: order.urgency ? '#dc3545' : '#343a40' }"
        >
          <span class="fs-5">Заказ № {{ order.id }} от {{ formatDate(order.created_at) }}</span>
          <div class="header-actions">
            <button
              class="btn"
              @click="archiveOrder(order)"
              :title="showArchived ? 'Восстановить' : 'Закрыть/архивировать заказ'"
            >
              <i
                class="fas"
                :class="showArchived ? 'fa-box-open text-success' : 'fa-lock icon-lock'"
              ></i>
            </button>
            <button class="btn" @click="printOrder(order)" title="Печать заказа">
              <i class="fas fa-print icon-print"></i>
            </button>
            <button class="btn" @click="editOrder(order)">
              <i class="fas fa-pencil icon-edit"></i>
            </button>
          </div>
        </div>
        <div class="order-body">
          <div class="client-title">{{ order.client_name }} // тел: {{ order.client_phone }}</div>
          <div class="mb-1 fw-bold">{{ getRepairType(order.repair_type) }}</div>
          <div class="mb-1">
            {{ order.brand }} {{ order.device_type }} {{ order.model }} S/N:{{
              order.serial_number
            }}
          </div>
          <div class="text-muted small">
            {{ order.malfunctions }}
          </div>
        </div>
      </div>

      <div v-if="orders.length === 0 && !isCreating" class="text-center text-muted mt-5">
        Заказов пока нет.
      </div>
    </div>
  </MainLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import MainLayout from '../components/MainLayout.vue'
import OrderCard from '../components/OrderCard.vue'
import initSqlJs from 'sql.js'
import { loadDBFromIndexedDB, saveDBToIndexedDB } from '../utils/db'

const db = ref(null)
const orders = ref([])
const clients = ref([])
const isCreating = ref(false)
const newOrderData = ref({})
const searchQuery = ref('')
const isNewOrder = ref(true)
const showArchived = ref(false)

const initDB = async () => {
  try {
    const dbData = await loadDBFromIndexedDB()
    if (dbData) {
      const SQL = await initSqlJs({
        locateFile: (file) => `${import.meta.env.BASE_URL}sql-wasm.wasm`,
      })
      db.value = new SQL.Database(dbData)
      fetchClients()
      fetchOrders()
    }
  } catch (e) {
    console.error(e)
  }
}

const fetchClients = () => {
  if (!db.value) return
  const stmt = db.value.prepare('SELECT * FROM clients ORDER BY name')
  const res = []
  while (stmt.step()) {
    const client = stmt.getAsObject()
    const phoneStmt = db.value.prepare(
      'SELECT phone FROM client_phones WHERE client_id = ? LIMIT 1',
    )
    phoneStmt.bind([client.id])
    if (phoneStmt.step()) {
      client.phone = phoneStmt.getAsObject().phone
    }
    phoneStmt.free()
    res.push(client)
  }
  stmt.free()
  clients.value = res
}

const fetchOrders = () => {
  if (!db.value) return
  const archiveStatus = showArchived.value ? 1 : 0
  let query = `
    SELECT
      o.id, o.created_at, o.repair_type, o.urgency, o.client_id,
      c.name as client_name,
      (SELECT phone FROM client_phones WHERE client_id = o.client_id LIMIT 1) as client_phone,
      sn.name as serial_number,
      d.model,
      b.name as brand,
      dt.name as device_type
    FROM orders o
    LEFT JOIN clients c ON o.client_id = c.id
    LEFT JOIN serial_numbers sn ON o.serial_number_id = sn.id
    LEFT JOIN devices d ON sn.devise_id = d.id
    LEFT JOIN brands b ON d.brands_id = b.id
    LEFT JOIN device_types dt ON d.devices_type_id = dt.id
    WHERE o.archive = ${archiveStatus}
  `
  const params = []
  if (searchQuery.value) {
    query += ` AND (c.name LIKE ? OR sn.name LIKE ?)`
    params.push(`%${searchQuery.value}%`, `%${searchQuery.value}%`)
  }
  query += ' ORDER BY o.created_at DESC'

  const stmt = db.value.prepare(query)
  stmt.bind(params)
  const res = []
  while (stmt.step()) {
    const order = stmt.getAsObject()
    const malStmt = db.value.prepare(`
      SELECT cm.name
      FROM orders_claimed_malfunctions ocm
      JOIN claimed_malfunctions cm ON ocm.claimed_malfunction_id = cm.id
      WHERE ocm.order_id = ?
    `)
    malStmt.bind([order.id])
    const mals = []
    while (malStmt.step()) mals.push(malStmt.getAsObject().name)
    malStmt.free()
    order.malfunctions = mals.join(', ')
    res.push(order)
  }
  stmt.free()
  orders.value = res
}

const toggleArchive = () => {
  showArchived.value = !showArchived.value
  fetchOrders()
}

const startNewOrder = () => {
  newOrderData.value = {
    malfunctions: [],
    repair_type: null,
    urgency: false,
  }
  isNewOrder.value = true
  isCreating.value = true
}

const editOrder = async (orderSummary) => {
  const fullOrder = await getFullOrderDetails(orderSummary.id, true)
  if (!fullOrder) {
    alert('Не удалось загрузить данные заказа для редактирования.')
    return
  }
  newOrderData.value = fullOrder
  isNewOrder.value = false
  isCreating.value = true
}

const archiveOrder = async (order) => {
  if (!db.value) return
  const action = showArchived.value ? 'восстановить' : 'закрыть и архивировать'
  const newStatus = showArchived.value ? 0 : 1
  if (confirm(`Вы уверены, что хотите ${action} заказ № ${order.id}?`)) {
    try {
      const stmt = db.value.prepare('UPDATE orders SET archive = ?, updated_at = ? WHERE id = ?')
      stmt.run([newStatus, Date.now(), order.id])
      stmt.free()

      await saveDBToIndexedDB(db.value)
      fetchOrders() // Refresh the list
    } catch (e) {
      console.error(e)
      alert('Ошибка при архивации заказа: ' + e.message)
    }
  }
}

const getFullOrderDetails = async (orderId, forEditing = false) => {
  if (!db.value) return null

  // 1. Get raw order
  const stmt = db.value.prepare('SELECT * FROM orders WHERE id = ?')
  stmt.bind([orderId])
  if (!stmt.step()) {
    stmt.free()
    return null
  }
  const rawOrder = stmt.getAsObject()
  stmt.free()

  // 2. Get client
  let client = null
  if (rawOrder.client_id) {
    const cStmt = db.value.prepare(`
      SELECT c.id, c.name, c.email, c.address,
             (SELECT phone FROM client_phones WHERE client_id = c.id LIMIT 1) as phone
      FROM clients c
      WHERE c.id = ?
    `)
    cStmt.bind([rawOrder.client_id])
    if (cStmt.step()) {
      client = cStmt.getAsObject()
    }
    cStmt.free()
  }

  // 3. Get device (for printing)
  let device = null
  if (!forEditing && rawOrder.serial_number_id) {
    const dStmt = db.value.prepare(`
      SELECT sn.name as serial_number, d.model, b.name as brand, dt.name as device_type
      FROM serial_numbers sn
      JOIN devices d ON sn.devise_id = d.id
      JOIN brands b ON d.brands_id = b.id
      JOIN device_types dt ON d.devices_type_id = dt.id
      WHERE sn.id = ?
    `)
    dStmt.bind([rawOrder.serial_number_id])
    if (dStmt.step()) {
      device = dStmt.getAsObject()
    }
    dStmt.free()
  }

  // 4. Get malfunctions
  const mStmt = db.value.prepare(`
    SELECT cm.id, cm.name
    FROM orders_claimed_malfunctions ocm
    JOIN claimed_malfunctions cm ON ocm.claimed_malfunction_id = cm.id
    WHERE ocm.order_id = ?
  `)
  mStmt.bind([rawOrder.id])
  const malfunctions = []
  while (mStmt.step()) malfunctions.push(mStmt.getAsObject())
  mStmt.free()

  const result = {
    ...rawOrder,
    client,
    malfunctions: forEditing ? malfunctions : malfunctions.map((m) => m.name).join(', '),
    urgency: !!rawOrder.urgency,
  }

  if (device) {
    result.device = device
  }

  return result
}

const printOrder = async (orderSummary) => {
  const order = await getFullOrderDetails(orderSummary.id, false)
  if (!order) {
    alert('Не удалось загрузить данные для печати.')
    return
  }

  const repairType = getRepairType(order.repair_type)
  const orderDate = formatDate(order.created_at)

  const printHtml = `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <title>Печать заказа № ${order.id}</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
      <style>
        body { font-size: 12pt; }
        .receipt-container { max-width: 800px; margin: 20px auto; padding: 20px; }
        h1 { text-align: center; margin-bottom: 20px; font-size: 16pt; }
        .section { margin-bottom: 15px; }
        .section h5 { font-size: 13pt; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 10px; }
        .signatures { margin-top: 50px; }
        .signatures .line { border-top: 1px dotted #000; margin-top: 40px; }
        .signatures .label { font-size: 10pt; color: #555; }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <h1>Квитанция на прием в ремонт № ${order.id} от ${orderDate}</h1>
        <div class="section"><h5>Данные клиента</h5><p><strong>ФИО:</strong> ${order.client?.name || 'Не указан'}</p><p><strong>Телефон:</strong> ${order.client?.phone || 'Не указан'}</p></div>
        <div class="section"><h5>Информация об устройстве</h5><p><strong>Устройство:</strong> ${order.device?.device_type || ''} ${order.device?.brand || ''} ${order.device?.model || ''}</p><p><strong>Серийный номер:</strong> ${order.device?.serial_number || 'Не указан'}</p><p><strong>Внешний вид:</strong> ${order.appearance || 'Без видимых повреждений'}</p></div>
        <div class="section"><h5>Информация о ремонте</h5><p><strong>Заявленные неисправности:</strong> ${order.malfunctions || 'Не указаны'}</p><p><strong>Тип работ:</strong> ${repairType}</p>${order.special_notes ? `<p><strong>Особые заметки:</strong> ${order.special_notes}</p>` : ''}${order.urgency ? `<p><strong>Срочность:</strong> Срочный заказ</p>` : ''}</div>
        <div class="section"><p class="small text-muted">Настоящим подтверждаю, что устройство с указанными неисправностями и внешним видом сдано в ремонт. С условиями диагностики и ремонта ознакомлен и согласен.</p></div>
        <div class="signatures row"><div class="col-6"><div class="line"></div><div class="label text-center">(Подпись клиента)</div></div><div class="col-6"><div class="line"></div><div class="label text-center">(Подпись сотрудника)</div></div></div>
      </div>
    </body>
    </html>
  `

  const printWindow = window.open('', '_blank', 'width=800,height=600')
  printWindow.document.write(printHtml)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => {
    printWindow.print()
    printWindow.close()
  }, 250)
}

const cancelNewOrder = () => {
  isCreating.value = false
}

const onOrderSaved = () => {
  isCreating.value = false
  fetchOrders()
}

const formatDate = (ts) => {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('ru-RU')
}

const getRepairType = (type) => {
  if (type === 0) return 'Диагностика'
  if (type === 1) return 'Ремонт'
  if (type === 2) return 'Диагностика и ремонт'
  return 'Не указано'
}

onMounted(initDB)
</script>
