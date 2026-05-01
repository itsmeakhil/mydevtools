import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tags = searchParams.get('tags');
  const getList = searchParams.get('list');

  try {
    if (getList === 'true') {
      const response = await fetch('https://www.toptal.com/developers/gitignore/api/list');
      if (!response.ok) throw new Error('Failed to fetch list');
      
      const text = await response.text();
      // the list is comma or newline separated
      const listArray = text
        .split(/[\n,]+/)
        .map(t => t.trim())
        .filter(t => t.length > 0);
        
      return NextResponse.json(listArray);
    }

    if (!tags) {
      return NextResponse.json({ error: 'Missing tags parameter' }, { status: 400 });
    }

    const response = await fetch(`https://www.toptal.com/developers/gitignore/api/${encodeURIComponent(tags)}`);
    if (!response.ok) throw new Error('Failed to fetch ignore template');

    const text = await response.text();
    return new NextResponse(text, {
      headers: {
        'Content-Type': 'text/plain',
      },
    });

  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch from gitignore.io API' }, { status: 500 });
  }
}
