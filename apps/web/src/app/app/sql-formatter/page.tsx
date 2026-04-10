import { SqlFormatterLayout } from '@/components/sql-formatter/sql-formatter-layout'

export const metadata = {
  title: 'SQL Formatter | MyDevTools',
  description:
    'Format SQL for MySQL, PostgreSQL, and SQLite with keyword casing and indentation options in the browser.',
}

export default function SqlFormatterPage() {
  return (
    <div className="h-full w-full min-h-0 p-4">
      <SqlFormatterLayout />
    </div>
  )
}
