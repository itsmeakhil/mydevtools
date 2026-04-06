import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    try {
        const response = await fetch(
            `https://rapid-email-verifier.fly.dev/api/validate?email=${encodeURIComponent(email)}`,
            {
                headers: {
                    accept: 'application/json',
                },
            }
        );

        if (!response.ok) {
            return NextResponse.json(
                { error: 'Failed to validate email from external provider' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Email validation proxy error:', error);
        return NextResponse.json(
            { error: 'Internal server error while validating email' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { emails } = body;

        if (!emails || !Array.isArray(emails)) {
            return NextResponse.json({ error: 'Emails array is required' }, { status: 400 });
        }

        const response = await fetch(
            'https://rapid-email-verifier.fly.dev/api/validate/batch',
            {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ emails }),
            }
        );

        if (!response.ok) {
            return NextResponse.json(
                { error: 'Failed to validate emails in batch' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Email validation batch proxy error:', error);
        return NextResponse.json(
            { error: 'Internal server error while validating emails in batch' },
            { status: 500 }
        );
    }
}
