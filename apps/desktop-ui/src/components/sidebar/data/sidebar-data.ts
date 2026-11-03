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
  IconBraces,
  IconVariable,
  IconBrandVscode,
  IconChartDots3,
  IconServer,
  IconBucket,
  IconTerminal2,
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
      title: 'Developer',
      icon: IconTerminal2,
      items: [
        {
          title: 'Terminal',
          url: '/app/terminal',
          icon: IconTerminal2,
          description: 'Terminals by project with tabs, split panes and a Needs you inbox for Claude Code.',
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
        {
          title: 'API Keys',
          url: '/app/api-keys',
          icon: IconKey,
          description: 'Encrypted API keys and secrets per environment (dev / staging / prod).',
        },
      ],
    },
    {
      title: 'Security',
      icon: IconShield,
      items: [
        {
          title: 'Email Validator',
          url: '/app/email-validator',
          icon: IconMailCheck,
          description: 'Verify and validate email addresses.',
        },
        {
          title: 'Environment Manager',
          url: '/app/environment-manager',
          icon: IconVariable,
          description: 'Encrypted .env sets per project and environment, with tags.',
        },
        {
          title: 'Password Manager',
          url: '/app/password-manager',
          icon: IconLock,
          description: 'Securely store and manage your passwords.',
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
      title: 'Formatters',
      icon: IconBraces,
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
      title: 'Database',
      icon: IconServer,
      items: [
        {
          title: 'S3 Drive',
          url: '/app/s3-drive',
          icon: IconBucket,
          description: 'Manage AWS S3 and DigitalOcean Spaces buckets. Browse, upload, and delete files with encrypted credentials.',
        },
        {
          title: 'Data Explorer',
          url: '/app/data-explorer',
          icon: IconDatabase,
          description: 'One workspace for PostgreSQL, MySQL, MongoDB, Redis, Firestore, and Elasticsearch. Browse, query, and edit with an encrypted credential store.',
        },
      ],
    },
  ],
}