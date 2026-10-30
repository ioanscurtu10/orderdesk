/* eslint-disable react-refresh/only-export-components -- this module exports the router object, not components */
import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router'
import { AppShell } from '@/components/AppShell'
import { PageSkeleton } from '@/components/PageSkeleton'
import { RedirectIfAuthenticated, RequireAdmin, RequireAuth } from '@/routes/guards'

// Route-level code splitting: each page is its own chunk.
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const OrdersPage = lazy(() => import('@/pages/OrdersPage'))
const OrderDetailPage = lazy(() => import('@/pages/OrderDetailPage'))
const OrderFormPage = lazy(() => import('@/pages/OrderFormPage'))
const ImportPage = lazy(() => import('@/pages/ImportPage'))
const ForbiddenPage = lazy(() => import('@/pages/ForbiddenPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

function withSuspense(node: ReactNode) {
  return <Suspense fallback={<PageSkeleton />}>{node}</Suspense>
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <RedirectIfAuthenticated>{withSuspense(<LoginPage />)}</RedirectIfAuthenticated>,
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard', element: withSuspense(<DashboardPage />) },
          { path: 'orders', element: withSuspense(<OrdersPage />) },
          { path: 'orders/:id', element: withSuspense(<OrderDetailPage />) },
          { path: 'forbidden', element: withSuspense(<ForbiddenPage />) },
          {
            element: <RequireAdmin />,
            children: [
              { path: 'orders/new', element: withSuspense(<OrderFormPage />) },
              { path: 'orders/:id/edit', element: withSuspense(<OrderFormPage />) },
              { path: 'import', element: withSuspense(<ImportPage />) },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: withSuspense(<NotFoundPage />) },
])
