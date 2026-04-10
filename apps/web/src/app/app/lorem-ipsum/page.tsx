import { LoremIpsumLayout } from '@/components/lorem-ipsum/lorem-ipsum-layout'

export const metadata = {
  title: 'Lorem Ipsum Generator | MyDevTools',
  description:
    'Generate classical Lorem Ipsum by paragraphs, sentences, words, or bullet lists. Plain text or HTML.',
}

export default function LoremIpsumPage() {
  return (
    <div className="h-full w-full min-h-0 p-4">
      <LoremIpsumLayout />
    </div>
  )
}
