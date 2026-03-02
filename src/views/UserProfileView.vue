<template>
  <MainLayout ref="layout">
    <div class="bg-white border-bottom px-3 px-lg-4 pb-3 pt-1" style="margin-top: -1px">
      <div class="d-flex align-items-center">
        <span class="fs-5">Настройки пользователя</span>
      </div>
    </div>

    <div class="container-fluid p-4">
      <!-- Форма смены логина -->
      <div class="card shadow-sm mb-4" style="max-width: 600px">
        <div class="card-body">
          <h5 class="card-title mb-4">Смена логина</h5>
          <form @submit.prevent="saveLogin">
            <div class="mb-3">
              <label class="form-label">Логин</label>
              <input type="text" class="form-control" v-model="form.login" required />
            </div>
            <button type="submit" class="btn btn-primary">Сохранить логин</button>
          </form>
        </div>
      </div>

      <!-- Форма смены пароля -->
      <div class="card shadow-sm" style="max-width: 600px">
        <div class="card-body">
          <h5 class="card-title mb-4">Смена пароля</h5>
          <form @submit.prevent="changePassword">
            <div class="mb-3">
              <label class="form-label">Старый пароль</label>
              <input type="password" class="form-control" v-model="form.oldPassword" required />
            </div>
            <div class="mb-3">
              <label class="form-label">Новый пароль</label>
              <input
                type="password"
                class="form-control"
                v-model="form.newPassword"
                required
                autocomplete="new-password"
              />
            </div>
            <div class="mb-3">
              <label class="form-label">Подтверждение нового пароля</label>
              <input type="password" class="form-control" v-model="form.confirmPassword" required />
            </div>
            <button type="submit" class="btn btn-primary">Сменить пароль</button>
          </form>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import MainLayout from '../components/MainLayout.vue'
import initSqlJs from 'sql.js'
import { loadDBFromIndexedDB, saveDBToIndexedDB } from '../utils/db'

const layout = ref(null)
const form = ref({
  login: '',
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

onMounted(() => {
  form.value.login = localStorage.getItem('username') || ''
})

const saveLogin = async () => {
  const newLogin = form.value.login.trim()
  const currentUsername = localStorage.getItem('username')

  if (newLogin === currentUsername) {
    alert('Новый логин совпадает с текущим.')
    return
  }
  if (!newLogin) {
    alert('Логин не может быть пустым.')
    return
  }

  try {
    const dbData = await loadDBFromIndexedDB()
    if (!dbData) {
      alert('База данных не найдена.')
      return
    }

    const SQL = await initSqlJs({
      locateFile: (file) => `${import.meta.env.BASE_URL}sql-wasm.wasm`,
    })
    const db = new SQL.Database(dbData)

    // Проверяем, не занят ли новый логин
    const checkStmt = db.prepare('SELECT id FROM users WHERE login = ?')
    checkStmt.bind([newLogin])
    if (checkStmt.step()) {
      checkStmt.free()
      alert('Этот логин уже занят.')
      return
    }
    checkStmt.free()

    // Обновляем логин
    const updateStmt = db.prepare('UPDATE users SET login = ? WHERE login = ?')
    updateStmt.run([newLogin, currentUsername])
    updateStmt.free()

    await saveDBToIndexedDB(db)
    localStorage.setItem('username', newLogin)
    layout.value?.updateUsername()
    alert('Логин успешно обновлен!')
  } catch (e) {
    console.error(e)
    alert('Ошибка при сохранении логина: ' + e.message)
  }
}

const changePassword = async () => {
  if (form.value.newPassword !== form.value.confirmPassword) {
    alert('Пароли не совпадают!')
    return
  }
  if (!form.value.oldPassword || !form.value.newPassword) {
    alert('Все поля паролей должны быть заполнены.')
    return
  }

  try {
    const dbData = await loadDBFromIndexedDB()
    if (!dbData) {
      alert('База данных не найдена.')
      return
    }

    const SQL = await initSqlJs({
      locateFile: (file) => `${import.meta.env.BASE_URL}sql-wasm.wasm`,
    })
    const db = new SQL.Database(dbData)
    const currentUsername = localStorage.getItem('username')

    // Хешируем старый пароль для проверки
    const msgBuffer = new TextEncoder().encode(form.value.oldPassword)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const oldHashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

    const stmt = db.prepare('SELECT * FROM users WHERE login = ? AND password_hash = ?')
    stmt.bind([currentUsername, oldHashHex])

    if (stmt.step()) {
      const user = stmt.getAsObject()
      stmt.free()

      // Хешируем новый пароль
      const newMsgBuffer = new TextEncoder().encode(form.value.newPassword)
      const newHashBuffer = await crypto.subtle.digest('SHA-256', newMsgBuffer)
      const newHashArray = Array.from(new Uint8Array(newHashBuffer))
      const newHashHex = newHashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

      const updateStmt = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      updateStmt.run([newHashHex, user.id])
      updateStmt.free()

      await saveDBToIndexedDB(db)
      alert('Пароль успешно обновлен!')

      // Очистка полей паролей
      form.value.oldPassword = ''
      form.value.newPassword = ''
      form.value.confirmPassword = ''
    } else {
      alert('Неверный старый пароль')
      stmt.free()
    }
  } catch (e) {
    console.error(e)
    alert('Ошибка при смене пароля: ' + e.message)
  }
}
</script>
