import {
  IconChecklist,
  IconNetwork,
  IconJson,
  IconLock,
  IconLockSquareRounded,
  IconNotes,
  IconDatabase,
  IconMailCheck,
  IconRocket,
  IconShield,
  IconKey,
  IconVariable,
  IconBrandVscode,
  IconChartDots3,
  IconServer,
  IconBucket,
  IconTool,
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
      title: 'Network & API',
      icon: IconNetwork,
      items: [
        {
          title: 'API Client',
          url: '/app/api-client',
          icon: IconNetwork,
          description: 'Test and debug HTTP requests.',
        },
      ],
    },
    {
      title: 'Data & Storage',
      icon: IconServer,
      items: [
        {
          title: 'Data Explorer',
          url: '/app/data-explorer',
          icon: IconDatabase,
          description: 'One workspace for PostgreSQL, MySQL, MongoDB, Redis, Firestore, and Elasticsearch. Browse, query, and edit with an encrypted credential store.',
        },
        {
          title: 'S3 Drive',
          url: '/app/s3-drive',
          icon: IconBucket,
          description: 'Manage AWS S3 and DigitalOcean Spaces buckets. Browse, upload, and delete files with encrypted credentials.',
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
          title: 'API Keys',
          url: '/app/api-keys',
          icon: IconKey,
          description: 'Encrypted API keys and secrets per environment (dev / staging / prod).',
        },
        {
          title: 'Environment Manager',
          url: '/app/environment-manager',
          icon: IconVariable,
          description: 'Encrypted .env sets per project and environment, with tags.',
        },
        {
          title: 'Files',
          url: '/app/secure-files',
          icon: IconLockSquareRounded,
          description: 'Encrypt files and folders into masked .mydt objects stored wherever you choose.',
        },
      ],
    },
    {
      title: 'Productivity',
      icon: IconRocket,
      items: [
        {
          title: 'Notes',
          url: '/app/notes',
          icon: IconNotes,
          description: 'Capture ideas and organize your thoughts.',
        },
        {
          title: 'Code Snippets',
          url: '/app/snippet-manager',
          icon: IconBrandVscode,
          description: 'Save snippets with syntax highlighting, auto language, view and edit.',
        },
        {
          title: 'Tasks',
          url: '/app/to-do',
          icon: IconChecklist,
          description: 'Manage your to-do lists efficiently.',
        },
      ],
    },
    {
      title: 'JSON',
      icon: IconJson,
      items: [
        {
          title: 'JSON Formatter',
          url: '/app/json-formatter',
          icon: IconJson,
          description: 'Format, validate, and edit JSON data.',
        },
        {
          title: 'JSON Visualizer',
          url: '/app/json-visualizer',
          icon: IconChartDots3,
          description: 'Visualize JSON as an interactive node graph with search and image export.',
        },
      ],
    },
    {
      title: 'Utilities',
      icon: IconTool,
      items: [
        {
          title: 'Email Validator',
          url: '/app/email-validator',
          icon: IconMailCheck,
          description: 'Verify and validate email addresses.',
        },
      ],
    },
  ],
}
