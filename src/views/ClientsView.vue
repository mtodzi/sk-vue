<template>
  <MainLayout>
    <!-- Custom Toolbar for Clients Page -->
    <div class="bg-white border-bottom px-3 px-lg-4 pb-3 pt-1" style="margin-top: -1px">
      <div class="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between">
        <div class="d-flex align-items-center justify-content-center mb-3 mb-lg-0">
          <span class="fs-5 me-2">Клиенты</span>
          <button
            class="btn btn-success d-flex align-items-center justify-content-center"
            style="width: 38px; height: 38px"
            @click="showCreateForm"
          >
            <i class="fas fa-plus"></i>
          </button>
        </div>
        <div class="d-flex search-form-container" style="max-width: 400px">
          <input type="text" class="form-control me-2" placeholder="Поиск" v-model="searchQuery" />
          <button class="btn btn-outline-success flex-shrink-0" @click="fetchClients">Поиск</button>
        </div>
      </div>
    </div>

    <div class="container-fluid p-4">
      <!-- Create New Client Form -->
      <div v-if="isCreating" class="card shadow-sm mb-3">
        <div
          class="card-header text-white d-flex justify-content-between align-items-center"
          style="background-color: #343a40"
        >
          <span class="fs-5">Новый клиент</span>
          <div>
            <button class="btn btn-light btn-sm me-2" @click="isCreating = false">
              <i class="fas fa-reply text-danger"></i>
            </button>
            <button class="btn btn-light btn-sm" @click="saveNewClient">
              <i class="fas fa-check text-success"></i>
            </button>
          </div>
        </div>
        <div class="card-body">
          <ClientForm v-model="newClient" />
        </div>
      </div>

      <!-- Client List -->
      <div v-for="client in clients" :key="client.id">
        <ClientCard :client="client" @save="handleUpdate" />
      </div>

      <div v-if="clients.length === 0 && !isCreating" class="text-center text-muted mt-5">
        Клиенты не найдены
      </div>
    </div>
  </MainLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import MainLayout from '../components/MainLayout.vue'
import ClientCard from '../components/ClientCard.vue'
import ClientForm from '../components/ClientForm.vue'
import initSqlJs from 'sql.js'
import { loadDBFromIndexedDB, saveDBToIndexedDB } from '../utils/db'

const clients = ref([])
const isCreating = ref(false)
const searchQuery = ref('')
const newClient = ref({ name: '', phones: [{ number: '' }], email: '', address: '' })
let db = null

const initDB = async () => {
  try {
    const dbData = await loadDBFromIndexedDB()
    if (dbData) {
      const SQL = await initSqlJs({
        locateFile: (file) => `${import.meta.env.BASE_URL}sql-wasm.wasm`,
      })
      db = new SQL.Database(dbData)
      fetchClients()
    }
  } catch (e) {
    console.error('Error loading DB:', e)
  }
}

const fetchClients = () => {
  if (!db) return

  let query = `
    SELECT c.id, c.name, c.email, c.address
    FROM clients c
    WHERE c.archive = 0
  `
  const params = []

  if (searchQuery.value) {
    query += ` AND c.name LIKE ?`
    params.push(`%${searchQuery.value}%`)
  }

  query += ` ORDER BY c.id DESC`

  const stmt = db.prepare(query)
  stmt.bind(params)

  const result = []
  while (stmt.step()) {
    const row = stmt.getAsObject()
    // Fetch phones for this client
    const phonesStmt = db.prepare('SELECT phone as number FROM client_phones WHERE client_id = ?')
    phonesStmt.bind([row.id])
    const phones = []
    while (phonesStmt.step()) {
      phones.push(phonesStmt.getAsObject())
    }
    phonesStmt.free()

    result.push({ ...row, phones })
  }
  stmt.free()
  clients.value = result
}

const showCreateForm = () => {
  newClient.value = { name: '', phones: [{ number: '' }], email: '', address: '' }
  isCreating.value = true
}

const saveNewClient = () => {
  handleCreate(newClient.value)
}

const handleCreate = async (clientData) => {
  if (!db) return
  try {
    // Insert client

    const insertClient = db.prepare(
      'INSERT INTO clients (name, email, address, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    )
    insertClient.run([
      clientData.name,
      clientData.email,
      clientData.address,
      Date.now(),
      Date.now(),
    ])
    insertClient.free()

    // Get last ID (simplified)
    const res = db.exec('SELECT last_insert_rowid() as id')
    const clientId = res[0].values[0][0]

    // Insert phones
    if (clientData.phones && clientData.phones.length > 0) {
      const insertPhone = db.prepare('INSERT INTO client_phones (client_id, phone) VALUES (?, ?)')
      clientData.phones.forEach((p) => {
        if (p.number) insertPhone.run([clientId, p.number])
      })
      insertPhone.free()
    }

    await saveDBToIndexedDB(db)
    isCreating.value = false
    fetchClients()
  } catch (e) {
    console.error('Error creating client:', e)
    alert('Ошибка при создании клиента')
  }
}

const handleUpdate = async (clientData) => {
  console.log('Updating client:', clientData)
  if (!db) return
  try {
    // Update client info

    const updateClient = db.prepare(
      'UPDATE clients SET name = ?, email = ?, address = ?, updated_at = ? WHERE id = ?',
    )
    updateClient.run([
      clientData.name,
      clientData.email,
      clientData.address,
      Date.now(),
      clientData.id,
    ])

    // Update phones: simpler to delete all and re-insert for this prototype
    const deletePhone = db.prepare('DELETE FROM client_phones WHERE client_id = ?')
    deletePhone.run([clientData.id])
    deletePhone.free()

    if (clientData.phones && clientData.phones.length > 0) {
      const insertPhone = db.prepare('INSERT INTO client_phones (client_id, phone) VALUES (?, ?)')
      clientData.phones.forEach((p) => {
        if (p.number) insertPhone.run([clientData.id, p.number])
      })
      insertPhone.free()
    }

    await saveDBToIndexedDB(db)
    fetchClients()
  } catch (e) {
    console.error('Error updating client:', e)
    alert('Ошибка при обновлении клиента')
  }
}

onMounted(initDB)
</script>
