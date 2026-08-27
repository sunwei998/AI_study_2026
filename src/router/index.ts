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
      meta: { requiresAuth: true, requiresManager: true },
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
          path: 'hot-words',
          name: 'admin-hot-words',
          component: () => import('@/components/admin/AdminHotWords.vue')
        },
        {
          path: 'settings',
          component: () => import('@/components/admin/AdminSettingsLayout.vue'),
          children: [
            { path: '', redirect: '/admin/settings/base' },
            {
              path: 'base',
              name: 'admin-settings-base',
              component: () => import('@/components/admin/AdminSettingsBase.vue')
            },
            {
              path: 'search',
              name: 'admin-settings-search',
              component: () => import('@/components/admin/AdminSettingsSearch.vue')
            }
          ]
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

  if (to.meta.requiresManager && !auth.isManager) {
    return { path: '/chat' }
  }

  if ((to.name === 'login' || to.name === 'register') && auth.isLoggedIn) {
    return { path: '/chat' }
  }

  return true
})

export default router