import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: () => {
        const auth = useAuthStore()
        return auth.isLoggedIn ? '/chat' : '/login'
      }
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/components/auth/AuthPage.vue'),
      props: { mode: 'login' }
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/components/auth/AuthPage.vue'),
      props: { mode: 'register' }
    },
    {
      path: '/chat',
      name: 'chat',
      component: () => import('@/components/chat/ChatWindow.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/admin',
      component: () => import('@/components/admin/AdminConsole.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
      children: [
        { path: '', redirect: '/admin/overview' },
        {
          path: 'overview',
          name: 'admin-overview',
          component: () => import('@/components/admin/AdminOverview.vue')
        },
        {
          path: 'models',
          name: 'admin-models',
          component: () => import('@/components/admin/ModelManage.vue')
        },
        {
          path: 'users',
          name: 'admin-users',
          component: () => import('@/components/admin/AdminUsers.vue')
        },
        {
          path: 'map',
          name: 'admin-map',
          component: () => import('@/components/admin/AdminMap.vue')
        },
        {
          path: 'usage',
          name: 'admin-usage',
          component: () => import('@/components/admin/AdminUsage.vue')
        },
        {
          path: 'suggestions',
          name: 'admin-suggestions',
          component: () => import('@/components/admin/AdminSuggestions.vue')
        },
        {
          path: 'settings',
          name: 'admin-settings',
          component: () => import('@/components/admin/AdminSettings.vue')
        }
      ]
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.init()

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return {
      path: '/login',
      query: { redirect: to.fullPath }
    }
  }

  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return { path: '/chat' }
  }

  if ((to.name === 'login' || to.name === 'register') && auth.isLoggedIn) {
    return { path: '/chat' }
  }

  return true
})

export default router