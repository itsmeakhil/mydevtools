import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Task Manager',
  description: 'Organize daily tasks, set priorities, and track your productivity.',
}

export default function ToDoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
