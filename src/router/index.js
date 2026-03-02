import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from '../components/LoginPage.vue'
import LandingView from '../components/LandingView.vue'
import OrdersView from '../views/OrdersView.vue'
import UserProfileView from '../views/UserProfileView.vue'
import ClientsView from '../views/ClientsView.vue'
import StocksView from '../views/StocksView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Landing',
      component: LandingView,
    },
    {
      path: '/login',
      name: 'login',
      component: LoginPage,
    },
    {
      path: '/orders',
      name: 'orders',
      component: OrdersView,
      meta: { requiresAuth: true },
    },
    {
      path: '/profile',
      name: 'profile',
      component: UserProfileView,
      meta: { requiresAuth: true },
    },
    {
      path: '/clients',
      name: 'clients',
      component: ClientsView,
      meta: { requiresAuth: true },
    },
    {
      path: '/stocks',
      name: 'stocks',
      component: StocksView,
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true'
  // Если пользователь не аутентифицирован и пытается зайти на защищенный роут
  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'login' })
  }
  // Если пользователь аутентифицирован и пытается зайти на страницу входа или лендинг
  else if (isAuthenticated && (to.name === 'login' || to.name === 'Landing')) {
    next({ name: 'orders' }) // перенаправляем на основную страницу приложения
  } else {
    next()
  }
})

export default router
