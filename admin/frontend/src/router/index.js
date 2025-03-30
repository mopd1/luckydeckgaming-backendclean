// admin/frontend/src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

// Import Views
import Login from '../views/Login.vue'
import Dashboard from '../views/Dashboard.vue'
import UserList from '../views/Users/UserList.vue'
import UserDetail from '../views/Users/UserDetail.vue'
import DatabaseTables from '../views/Database/DatabaseTables.vue'
import TableDetail from '../views/Database/TableDetail.vue'
import SqlQuery from '../views/Database/SqlQuery.vue'
import GameConfig from '../views/Config/GameConfig.vue'
import NotFound from '../views/NotFound.vue'
import Economy from '../views/Economy.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard,
    meta: { requiresAuth: true }
  },
  {
    path: '/users',
    name: 'UserList',
    component: UserList,
    meta: { requiresAuth: true, permission: 'view_users' }
  },
  {
    path: '/users/:id',
    name: 'UserDetail',
    component: UserDetail,
    meta: { requiresAuth: true, permission: 'view_users' }
  },
  {
    path: '/database',
    name: 'DatabaseTables',
    component: DatabaseTables,
    meta: { requiresAuth: true, permission: 'view_database' }
  },
  {
    path: '/database/:table',
    name: 'TableDetail',
    component: TableDetail,
    meta: { requiresAuth: true, permission: 'view_database' }
  },
  {
    path: '/database/sql-query',
    name: 'SqlQuery',
    component: SqlQuery,
    meta: { requiresAuth: true, permission: 'execute_sql' }
  },
  {
    path: '/config',
    name: 'GameConfig',
    component: GameConfig,
    meta: { requiresAuth: true, permission: 'view_config' }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFound
  },
  {
    path: '/economy',
    name: 'Economy',
    component: Economy,
    meta: { requiresAuth: true }
  },
  {
    path: '/daily-tasks',
    name: 'DailyTasks',
    component: () => import('../views/DailyTasks/Index.vue'),
    meta: { requiresAuth: true, permission: 'view_config' }
  },
  {
    path: '/season-pass',
    name: 'SeasonPass',
    component: () => import('../views/SeasonPass/Index.vue'),
    meta: { requiresAuth: true, permission: 'view_config' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const isAuthenticated = authStore.isAuthenticated
  const userPermissions = authStore.permissions || []
  
  // Check if route requires authentication
  if (to.meta.requiresAuth && !isAuthenticated) {
    return next('/login')
  }
  
  // Check if route requires permission
  if (to.meta.permission && !userPermissions.includes(to.meta.permission)) {
    return next('/')
  }
  
  // If trying to access login page while authenticated, redirect to dashboard
  if (to.name === 'Login' && isAuthenticated) {
    return next('/')
  }
  
  next()
})

export default router
