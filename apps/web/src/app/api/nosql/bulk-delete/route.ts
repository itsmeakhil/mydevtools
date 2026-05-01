import { NextResponse } from 'next/server';

export const runtime = 'edge';

const notSupported = () =>
    NextResponse.json(
        { error: "NoSQL Client requires direct TCP connections unavailable on Cloudflare. Use the self-hosted deployment." },
        { status: 503 }
    );

export const DELETE = notSupported;
