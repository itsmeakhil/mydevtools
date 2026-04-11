import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('to-do')

export default function ToDoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
