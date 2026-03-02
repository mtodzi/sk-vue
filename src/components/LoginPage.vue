<template>
  <div class="login-container d-flex align-items-center justify-content-center">
    <div class="card shadow-sm p-4" style="max-width: 400px; width: 100%">
      <!-- Если БД не загружена: Форма создания -->
      <div v-if="!db">
        <h3 class="text-center mb-4">Создание базы данных</h3>
        <form @submit.prevent="createDB">
          <div class="mb-3">
            <label class="form-label">Логин нового пользователя</label>
            <input
              type="text"
              class="form-control"
              v-model="newUsername"
              required
              placeholder="Придумайте логин"
            />
          </div>
          <div class="mb-3">
            <label class="form-label">Пароль</label>
            <input
              type="password"
              class="form-control"
              v-model="newPassword"
              required
              placeholder="Придумайте пароль"
              autocomplete="new-password"
            />
          </div>
          <div class="mb-3">
            <label class="form-label">Повторите пароль</label>
            <input
              type="password"
              class="form-control"
              v-model="confirmPassword"
              required
              placeholder="Повторите пароль"
              autocomplete="new-password"
            />
          </div>
          <button type="submit" class="btn btn-success w-100 mb-3">Создать БД</button>
          <button type="button" class="btn btn-info w-100 mb-3" @click="createDemoDB">
            Создать Демо БД
          </button>
        </form>

        <div class="text-center border-top pt-3">
          <p class="small text-muted mb-2">Уже есть файл базы данных?</p>
          <label class="btn btn-outline-secondary">
            <i class="fas fa-upload me-2"></i> Загрузить БД из файла
            <input type="file" class="d-none" @change="loadDB" accept=".sqlite,.db,.sqlite3" />
          </label>
        </div>
      </div>

      <!-- Если БД загружена: Форма входа -->
      <div v-else>
        <h3 class="text-center mb-4">Вход в систему</h3>
        <form @submit.prevent="handleLogin">
          <div class="mb-3">
            <label class="form-label">Логин</label>
            <input
              type="text"
              class="form-control"
              v-model="username"
              placeholder="Введите логин"
              required
            />
          </div>
          <div class="mb-3">
            <label class="form-label">Пароль</label>
            <input
              type="password"
              class="form-control"
              v-model="password"
              placeholder="Введите пароль"
              required
            />
          </div>
          <button type="submit" class="btn btn-primary w-100 mb-3">Войти</button>
        </form>

        <div class="mt-4 pt-3 border-top">
          <h5 class="text-center mb-3 fs-6 text-muted">Управление базой данных</h5>
          <div class="d-grid gap-2">
            <button class="btn btn-outline-success" @click="exportDB">
              <i class="fas fa-download me-2"></i> Сохранить БД в файл
            </button>
            <button class="btn btn-outline-danger" @click="clearDB">
              <i class="fas fa-trash-alt me-2"></i> Очистить сохраненную БД
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import initSqlJs from 'sql.js'
import { saveDBToIndexedDB, loadDBFromIndexedDB, clearDBFromIndexedDB } from '../utils/db'

const router = useRouter()
const username = ref('')
const password = ref('')
const db = ref(null)

// Данные для создания новой БД
const newUsername = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

const handleLogin = async () => {
  if (!db.value) {
    alert('База данных не загружена. Пожалуйста, создайте или загрузите БД.')
    return
  }
  try {
    const msgBuffer = new TextEncoder().encode(password.value)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
    const stmt = db.value.prepare('SELECT * FROM users WHERE login = ? AND password_hash = ?')
    stmt.bind([username.value, hashHex])
    if (stmt.step()) {
      const row = stmt.getAsObject()
      localStorage.setItem('isAuthenticated', 'true')
      localStorage.setItem('username', row.login)
      router.push('/orders')
    } else {
      alert('Неверный логин или пароль')
    }
    stmt.free()
  } catch (e) {
    console.error(e)
    alert('Ошибка авторизации: ' + e.message)
  }
}

const schemaSQL = `
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    login VARCHAR(255),
    password_hash VARCHAR(255)
  );
  CREATE TABLE clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    address VARCHAR(255),
    archive INTEGER DEFAULT 0,
    created_at INTEGER,
    updated_at INTEGER
  );
  CREATE TABLE client_phones (
    client_id INTEGER,
    phone VARCHAR(255),
    FOREIGN KEY(client_id) REFERENCES clients(id)
  );
  CREATE TABLE stocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255)
  );
  CREATE TABLE brands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL
  );
  CREATE TABLE device_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255)
  );
  CREATE TABLE devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brands_id INTEGER,
    devices_type_id INTEGER,
    model VARCHAR(255),
    FOREIGN KEY(brands_id) REFERENCES brands(id),
    FOREIGN KEY(devices_type_id) REFERENCES device_types(id)
  );
  CREATE TABLE serial_numbers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255),
    devise_id INTEGER,
    FOREIGN KEY(devise_id) REFERENCES devices(id)
  );
  CREATE TABLE equipment_stock (
    stock_id INTEGER,
    serial_number_id INTEGER,
    FOREIGN KEY(stock_id) REFERENCES stocks(id),
    FOREIGN KEY(serial_number_id) REFERENCES serial_numbers(id)
  );
  CREATE TABLE claimed_malfunctions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255)
  );
  CREATE TABLE orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    serial_number_id INTEGER,
    repair_type INTEGER,
    urgency INTEGER,
    archive INTEGER DEFAULT 0,
    appearance VARCHAR(255),
    special_notes TEXT,
    created_at INTEGER,
    updated_at INTEGER,
    FOREIGN KEY(client_id) REFERENCES clients(id),
    FOREIGN KEY(serial_number_id) REFERENCES serial_numbers(id)
  );
  CREATE TABLE orders_claimed_malfunctions (
    order_id INTEGER,
    claimed_malfunction_id INTEGER,
    FOREIGN KEY(order_id) REFERENCES orders(id),
    FOREIGN KEY(claimed_malfunction_id) REFERENCES claimed_malfunctions(id)
  );
`

const createDB = async () => {
  if (!newUsername.value || !newPassword.value) {
    alert('Пожалуйста, заполните все поля')
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    alert('Пароли не совпадают')
    return
  }

  try {
    const SQL = await initSqlJs({
      locateFile: (file) => `${import.meta.env.BASE_URL}sql-wasm.wasm`,
    })
    db.value = new SQL.Database()
    db.value.run(schemaSQL)

    // Хеширование пароля (SHA-256) для нового пользователя
    const msgBuffer = new TextEncoder().encode(newPassword.value)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
    const insertStmt = db.value.prepare('INSERT INTO users (login, password_hash) VALUES (?, ?)')
    insertStmt.run([newUsername.value, hashHex])
    insertStmt.free()

    await saveDBToIndexedDB(db.value)
    // Автоматически подставляем логин для входа
    username.value = newUsername.value
    alert(
      `База данных успешно создана. Пользователь ${newUsername.value} добавлен. Теперь вы можете войти.`,
    )
  } catch (e) {
    console.error(e)
    alert('Ошибка создания БД: ' + e.message)
  }
}

const createDemoDB = async () => {
  try {
    const SQL = await initSqlJs({
      locateFile: (file) => `${import.meta.env.BASE_URL}sql-wasm.wasm`,
    })
    db.value = new SQL.Database()
    db.value.run(schemaSQL)

    // Создание пользователя admin
    const msgBuffer = new TextEncoder().encode('123456')
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
    const insertStmt = db.value.prepare('INSERT INTO users (login, password_hash) VALUES (?, ?)')
    insertStmt.run(['admin', hashHex])
    insertStmt.free()

    // Заполнение тестовыми данными
    const now = Date.now()
    db.value.run(`
      INSERT INTO clients (name, email, address, created_at, updated_at) VALUES
      ('Иван Иванов', 'ivan@example.com', 'ул. Ленина, 1', ${now}, ${now}),
      ('Петр Петров', 'petr@example.com', 'ул. Гагарина, 5', ${now}, ${now});

      INSERT INTO client_phones (client_id, phone) VALUES
      (1, '+79001112233'),
      (2, '+79004445566');

      INSERT INTO stocks (name) VALUES ('Основной склад');

      INSERT INTO brands (name) VALUES ('Apple'), ('Samsung');

      INSERT INTO device_types (name) VALUES ('Смартфон'), ('Ноутбук');

      INSERT INTO devices (brands_id, devices_type_id, model) VALUES
      (1, 1, 'iPhone 13'),
      (2, 1, 'Galaxy S21'),
      (1, 2, 'MacBook Pro');

      INSERT INTO serial_numbers (name, devise_id) VALUES
      ('SN10001', 1), ('SN10002', 1), ('SN20001', 2), ('SN20002', 2), ('SN30001', 3);

      INSERT INTO equipment_stock (stock_id, serial_number_id) VALUES
      (1, 1), (1, 2), (1, 3), (1, 4), (1, 5);

      INSERT INTO claimed_malfunctions (name) VALUES
      ('Разбит экран'), ('Не включается'), ('Быстро разряжается');

      INSERT INTO orders (client_id, serial_number_id, repair_type, urgency, archive, appearance, special_notes, created_at, updated_at) VALUES
      (1, 1, 1, 1, 0, 'Царапины на корпусе', 'Позвонить перед ремонтом', ${now}, ${now}),
      (2, 3, 0, 0, 0, 'Без повреждений', '', ${now - 86400000}, ${now - 86400000}),
      (1, 2, 2, 2, 0, 'Вмятина на углу', 'Срочно', ${now - 172800000}, ${now - 172800000}),
      (2, 4, 1, 1, 0, 'Трещина на задней крышке', '', ${now - 259200000}, ${now - 259200000}),
      (1, 5, 1, 0, 0, 'Залипают клавиши', '', ${now - 345600000}, ${now - 345600000});

      INSERT INTO orders_claimed_malfunctions (order_id, claimed_malfunction_id) VALUES
      (1, 1), (2, 2), (3, 3), (4, 1), (5, 2);
    `)

    await saveDBToIndexedDB(db.value)
    // Автоматически подставляем логин для входа
    username.value = 'admin'
    password.value = '123456'
    alert('Демо база данных успешно создана. Пользователь admin (пароль 123456) добавлен.')
  } catch (e) {
    console.error(e)
    alert('Ошибка создания Демо БД: ' + e.message)
  }
}

const loadDB = (event) => {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async () => {
    try {
      const SQL = await initSqlJs({
        locateFile: (file) => `${import.meta.env.BASE_URL}sql-wasm.wasm`,
      })
      const Uints = new Uint8Array(reader.result)
      db.value = new SQL.Database(Uints)
      await saveDBToIndexedDB(db.value)
      alert('База данных успешно загружена и сохранена в локальном хранилище')
    } catch (e) {
      console.error(e)
      alert('Ошибка загрузки БД: ' + e.message)
    }
  }
  reader.readAsArrayBuffer(file)
}

const exportDB = () => {
  if (!db.value) return
  const binaryArray = db.value.export()
  const blob = new Blob([binaryArray], { type: 'application/x-sqlite3' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `service-keeper-db-${new Date().toISOString().slice(0, 10)}.sqlite`
  a.click()
  URL.revokeObjectURL(url)
}

const clearDB = async () => {
  if (confirm('Вы уверены, что хотите удалить базу данных из локального хранилища?')) {
    try {
      await clearDBFromIndexedDB()
      db.value = null
      username.value = ''
      password.value = ''
      alert('База данных удалена из локального хранилища.')
    } catch (e) {
      console.error(e)
      alert('Ошибка при удалении БД: ' + e.message)
    }
  }
}

onMounted(async () => {
  try {
    const dbData = await loadDBFromIndexedDB()
    if (dbData) {
      const SQL = await initSqlJs({
        locateFile: (file) => `${import.meta.env.BASE_URL}sql-wasm.wasm`,
      })
      db.value = new SQL.Database(dbData)
      alert('База данных загружена из локального хранилища.')
    }
  } catch (e) {
    console.error('Failed to load DB from IndexedDB on mount:', e)
  }
})
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  background-color: #f4f6f9;
}
</style>
