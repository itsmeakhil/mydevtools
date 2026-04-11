import { generateToolMetadata } from '@/lib/metadata'
import NotesClientLayout from './notes-client-layout'

export const metadata = generateToolMetadata('notes')

export default function NotesLayout({ children }: { children: React.ReactNode }) {
  return <NotesClientLayout>{children}</NotesClientLayout>
}
