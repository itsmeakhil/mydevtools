import { generatePageMetadata } from '@/lib/metadata'
import DashboardClientLayout from './dashboard-client-layout'

export const metadata = generatePageMetadata({
  title: 'Dashboard',
  description: 'Access all your developer tools from one unified dashboard. Search, favorite, and launch any tool instantly.',
  path: '/dashboard',
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardClientLayout>{children}</DashboardClientLayout>
}