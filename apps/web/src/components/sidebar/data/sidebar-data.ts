import {
  IconChecklist,
  IconNetwork,
  IconJson,
  IconLock,
  IconNotes,
  IconDatabase,
  IconBookmark,
  IconMailCheck,
  IconRocket,
  IconShield,
  IconCode,
  IconTransform,
} from '@tabler/icons-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'User',
    email: 'User@gmail.com',
    avatar: '/avatars/shadcn.jpg',
  },
  navGroups: [
    {
      title: 'Productivity',
      icon: IconRocket,
      items: [
        {
          title: 'Tasks',
          url: '/app/to-do',
          icon: IconChecklist,
          description: 'Manage your to-do lists efficiently.',
        },
        {
          title: 'Notes',
          url: '/app/notes',
          icon: IconNotes,
          description: 'Capture ideas and organize your thoughts.',
        },
        {
          title: 'Bookmarks',
          url: '/app/bookmarks',
          icon: IconBookmark,
          description: 'Manage and organize your bookmarks.',
        },
      ],
    },
    {
      title: 'Security',
      icon: IconShield,
      items: [
        {
          title: 'Password Manager',
          url: '/app/password-manager',
          icon: IconLock,
          description: 'Securely store and manage your passwords.',
        },
        {
          title: 'Email Validator',
          url: '/app/email-validator',
          icon: IconMailCheck,
          description: 'Verify and validate email addresses.',
        },
      ],
    },
    {
      title: 'Development',
      icon: IconCode,
      items: [
        {
          title: 'JSON Formatter',
          url: '/app/json-formatter',
          icon: IconJson,
          description: 'Format, validate, and edit JSON data.',
        },
        {
          title: 'Base64 Encoder',
          url: '/app/base64',
          icon: IconTransform,
          description: 'Encode and decode Base64 strings.',
        },
        {
          title: 'API Client',
          url: '/app/api-client',
          icon: IconNetwork,
          description: 'Test and debug HTTP requests.',
          hiddenOnMobile: true,
        },
        {
          title: 'NoSQL Explorer',
          url: '/app/nosql-explorer',
          icon: IconDatabase,
          description: 'Explore MongoDB databases.',
          hiddenOnMobile: true,
        },
      ],
    },
  ],
}