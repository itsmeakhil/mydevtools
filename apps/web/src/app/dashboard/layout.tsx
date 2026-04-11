import type { Metadata } from 'next'
import DashboardClientLayout from './dashboard-client-layout'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Access all your developer tools from one unified dashboard.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardClientLayout>{children}</DashboardClientLayout>
}