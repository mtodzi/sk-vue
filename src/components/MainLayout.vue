<template>
  <div
    class="layout-wrapper"
    :class="{
      'sidebar-mobile-show': isMobileMenuOpen,
      'sidebar-desktop-hidden': isDesktopMenuHidden,
    }"
  >
    <!-- Боковая панель -->
    <Sidebar @close-sidebar="closeSidebar" @logout="logout" />

    <!-- Основная область -->
    <div class="main-wrapper">
      <!-- Верхняя панель -->
      <div class="bg-white border-bottom sticky-top">
        <!-- Строка информации о пользователе -->
        <div class="d-flex justify-content-end px-3 px-lg-4 py-1 text-muted small">
          Выполнен вход: {{ username }}
        </div>

        <!-- Панель инструментов-->
        <div class="d-flex flex-column flex-lg-row align-items-lg-center px-3 px-lg-4 pb-3 pt-1">
          <div class="d-flex align-items-center mb-3 mb-lg-0">
            <button class="btn me-3" id="sidebar-toggle" @click="toggleSidebar">
              <i class="fas fa-bars fs-5"></i>
            </button>
          </div>
          <ToolbarActions v-if="!isProfilePage && !isClientsPage && !isStocksPage" />
        </div>
      </div>

      <!-- Контент -->
      <slot />

      <!-- Футер -->
      <footer class="bg-light text-end py-2 px-4 border-top text-muted small mt-auto">
        &copy; Service Keeper 2026 <i class="fas fa-leaf text-success ms-1"></i>
      </footer>
    </div>

    <!-- Оверлей для мобильного меню -->
    <div class="sidebar-overlay" @click="closeSidebar"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { loadDBFromIndexedDB } from '../utils/db'
import Sidebar from './Sidebar.vue'
import ToolbarActions from './ToolbarActions.vue'

const router = useRouter()
const route = useRoute()
const isMobileMenuOpen = ref(false)
const isDesktopMenuHidden = ref(false)
const username = ref('Пользователь')
const isProfilePage = computed(() => route.name === 'profile')
const isClientsPage = computed(() => route.name === 'clients')
const isStocksPage = computed(() => route.name === 'stocks')
const pageTitle = computed(() => {
  if (isProfilePage.value) return 'Профиль'
  if (isClientsPage.value) return 'Клиенты'
  if (isStocksPage.value) return 'Склады'
  return 'Заказы'
})

const updateUsername = () => {
  const storedUsername = localStorage.getItem('username')
  if (storedUsername) {
    username.value = storedUsername
  }
}

onMounted(updateUsername)

defineExpose({ updateUsername })
const toggleSidebar = () => {
  if (window.innerWidth < 992) {
    isMobileMenuOpen.value = !isMobileMenuOpen.value
  } else {
    isDesktopMenuHidden.value = !isDesktopMenuHidden.value
  }
}

const closeSidebar = () => {
  if (window.innerWidth < 992) {
    isMobileMenuOpen.value = false
  } else {
    isDesktopMenuHidden.value = true
  }
}

const logout = async () => {
  try {
    const dbData = await loadDBFromIndexedDB()
    if (dbData) {
      const blob = new Blob([dbData], { type: 'application/x-sqlite3' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'database.sqlite'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    }
  } catch (e) {
    console.error('Ошибка при экспорте БД:', e)
  }
  localStorage.removeItem('isAuthenticated')
  localStorage.removeItem('username')
  router.push('/login')
}
</script>

<style>
/* Стили боковой панели */
.sidebar {
  width: 50px;
  background-color: #343a40;
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 10px;
  transition: transform 0.3s ease;
}

.main-wrapper {
  margin-left: 50px;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  transition: margin-left 0.3s ease;
}

.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1040;
  display: none;
}

/* Адаптивность */
@media (min-width: 992px) {
  .layout-wrapper.sidebar-desktop-hidden .sidebar {
    display: none;
  }

  .layout-wrapper.sidebar-desktop-hidden .main-wrapper {
    margin-left: 0;
  }

  #sidebar-toggle {
    display: none;
  }
  .layout-wrapper.sidebar-desktop-hidden #sidebar-toggle {
    display: inline-block;
  }
}

@media (max-width: 991.98px) {
  .sidebar {
    transform: translateX(-100%);
    z-index: 1045;
  }
  .main-wrapper {
    margin-left: 0;
  }
  .layout-wrapper.sidebar-mobile-show .sidebar {
    transform: translateX(0);
  }
  .layout-wrapper.sidebar-mobile-show .sidebar-overlay {
    display: block;
  }
  .layout-wrapper.sidebar-mobile-show #sidebar-toggle {
    display: none;
  }
}
</style>
