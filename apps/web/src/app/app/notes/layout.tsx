import type { Metadata } from 'next'
import NotesClientLayout from './notes-client-layout'

export const metadata: Metadata = {
  title: 'Notes',
  description: 'Create and manage notes quickly. Simple note-taking app for developers.',
}

export default function NotesLayout({ children }: { children: React.ReactNode }) {
  return <NotesClientLayout>{children}</NotesClientLayout>
}
