import { generateToolMetadata } from '@/lib/metadata'

export const metadata = generateToolMetadata('csv-excel-json')

export default function CsvExcelJsonLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
