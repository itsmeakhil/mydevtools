import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const title = searchParams.get('title') || 'MyDevTools'
    const description = searchParams.get('description') || 'Essential Tools for Developers'

    return new ImageResponse(
        (
            <div
                style={{
                    width: '1200px',
                    height: '630px',
                    background: '#0a0a0a',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '64px',
                    fontFamily: 'monospace',
                }}
            >
                {/* Top: brand */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                        style={{
                            background: '#18181b',
                            border: '1px solid #27272a',
                            borderRadius: '8px',
                            padding: '6px 14px',
                            color: '#a1a1aa',
                            fontSize: '15px',
                            letterSpacing: '0.05em',
                            display: 'flex',
                        }}
                    >
                        mydevtools.tech
                    </div>
                </div>

                {/* Middle: title + description */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div
                        style={{
                            color: '#fafafa',
                            fontSize: title.length > 30 ? '52px' : '64px',
                            fontWeight: 700,
                            lineHeight: 1.1,
                            letterSpacing: '-0.02em',
                            display: 'flex',
                        }}
                    >
                        {title}
                    </div>
                    <div
                        style={{
                            color: '#71717a',
                            fontSize: '26px',
                            lineHeight: 1.4,
                            maxWidth: '860px',
                            display: 'flex',
                        }}
                    >
                        {description}
                    </div>
                </div>

                {/* Bottom: tagline */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#52525b',
                        fontSize: '16px',
                    }}
                >
                    <div
                        style={{
                            width: '24px',
                            height: '2px',
                            background: '#52525b',
                            display: 'flex',
                        }}
                    />
                    Online developer tools — runs in your browser
                </div>
            </div>
        ),
        {
            width: 1200,
            height: 630,
        }
    )
}
