import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.api.router import api_router
from app.core.audit_middleware import AuditMiddleware
from app.core.config import get_settings
from app.core.limiter import limiter

settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        from app.core.indexes import ensure_indexes
        await ensure_indexes()
    except Exception as exc:
        logging.getLogger(__name__).warning("Index creation failed: %s", exc)

    from app.core.redis_client import open_redis, close_redis
    await open_redis()

    try:
        yield
    finally:
        await close_redis()


app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.APP_DEBUG,
    docs_url="/docs" if settings.APP_DEBUG else None,
    redoc_url="/redoc" if settings.APP_DEBUG else None,
    openapi_url="/openapi.json" if settings.APP_DEBUG else None,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(AuditMiddleware)


@app.middleware("http")
async def security_headers(request: Request, call_next) -> Response:
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    # M-5 fix: add Content-Security-Policy
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "font-src 'self' https://fonts.gstatic.com; "
        "connect-src 'self'"
    )
    if settings.APP_ENV == "production":
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    return response


app.include_router(api_router, prefix="/api/v1")


@app.get("/", tags=["root"], summary="Root endpoint")
def root() -> HTMLResponse:
    # Minimal "shadcn-like" black/white landing page (no frontend build required).
    # If you later want a full shadcn UI, we can host a Next.js page separately.
    app_name = settings.APP_NAME
    return HTMLResponse(
        f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>{app_name}</title>
    <style>
      :root {{
        --bg: #ffffff;
        --fg: #0a0a0a;
        --muted: rgba(10,10,10,0.65);
        --border: rgba(10,10,10,0.12);
        --card: rgba(0,0,0,0.03);
        --btn: #0a0a0a;
        --btn-fg: #ffffff;
      }}
      @media (prefers-color-scheme: dark) {{
        :root {{
          --bg: #000000;
          --fg: #ffffff;
          --muted: rgba(255,255,255,0.7);
          --border: rgba(255,255,255,0.14);
          --card: rgba(255,255,255,0.06);
          --btn: #ffffff;
          --btn-fg: #000000;
        }}
      }}
      html, body {{
        height: 100%;
        margin: 0;
        background: var(--bg);
        color: var(--fg);
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji";
      }}
      .wrap {{
        min-height: 100%;
        display: flex;
        flex-direction: column;
      }}
      header {{
        border-bottom: 1px solid var(--border);
        backdrop-filter: blur(10px);
      }}
      .container {{
        width: 100%;
        max-width: 900px;
        margin: 0 auto;
        padding: 24px 16px;
      }}
      .top {{
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }}
      .brand {{
        display: flex;
        flex-direction: column;
        gap: 4px;
      }}
      .title {{
        font-weight: 800;
        letter-spacing: -0.02em;
        font-size: 18px;
      }}
      .subtitle {{
        color: var(--muted);
        font-size: 13px;
      }}
      .grid {{
        display: grid;
        grid-template-columns: 1fr;
        gap: 12px;
        margin-top: 18px;
      }}
      @media (min-width: 640px) {{
        .grid {{ grid-template-columns: repeat(3, 1fr); }}
      }}
      .card {{
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 16px;
        background: var(--card);
      }}
      .card h3 {{
        margin: 0 0 8px 0;
        font-size: 14px;
      }}
      .card p {{
        margin: 0;
        color: var(--muted);
        font-size: 13px;
        line-height: 1.4;
      }}
      .hero {{
        padding-top: 28px;
        padding-bottom: 28px;
      }}
      .hero h1 {{
        font-size: 34px;
        margin: 0;
        letter-spacing: -0.03em;
        line-height: 1.1;
      }}
      .hero p {{
        color: var(--muted);
        margin: 10px 0 0 0;
        line-height: 1.5;
        max-width: 60ch;
      }}
      .actions {{
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 18px;
      }}
      .btn {{
        display: inline-flex;
        align-items: center;
        justify-content: center;
        height: 40px;
        padding: 0 14px;
        border-radius: 999px;
        border: 1px solid var(--border);
        text-decoration: none;
        font-weight: 600;
        font-size: 13px;
      }}
      .btn.primary {{
        background: var(--btn);
        color: var(--btn-fg);
        border-color: transparent;
      }}
      .btn.ghost {{
        background: transparent;
        color: var(--fg);
      }}
      footer {{
        margin-top: auto;
        border-top: 1px solid var(--border);
      }}
      .foot {{
        color: var(--muted);
        font-size: 12px;
        padding: 18px 16px;
      }}
    </style>
  </head>
  <body>
    <div class="wrap">
      <header>
        <div class="container top">
          <div class="brand">
            <div class="title">{app_name}</div>
            <div class="subtitle">FastAPI backend • Firebase auth + MongoDB template</div>
          </div>
          <div>
            <a class="btn ghost" href="/docs">API Docs</a>
          </div>
        </div>
      </header>

      <main class="container hero">
        <h1>Minimal, production-ready API starter.</h1>
        <p>
          This service exposes health and auth helpers and includes task/project/bookmark modules
          designed to mirror the existing Firebase payload shape in your web app.
        </p>

        <div class="actions">
          <a class="btn primary" href="/docs">Open Swagger</a>
          <a class="btn ghost" href="/api/v1/health">Health: /api/v1/health</a>
        </div>

        <div class="grid">
          <div class="card">
            <h3>Auth</h3>
            <p>Verify Firebase ID tokens and fetch current user profile.</p>
          </div>
          <div class="card">
            <h3>Tasks</h3>
            <p>Paginated list, status updates, and export/import parity.</p>
          </div>
          <div class="card">
            <h3>Bookmarks</h3>
            <p>Folders + bookmarks with upsert import and move/delete actions.</p>
          </div>
        </div>
      </main>

      <footer>
        <div class="foot container">© {app_name} • Deployed on Fastapi Cloud .</div>
      </footer>
    </div>
  </body>
</html>""",
        status_code=200,
    )
