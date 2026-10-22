from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.db.init_db import init_db
from app.api.v1.catalog import router as catalog_router
from app.api.v1.cart import router as cart_router
from app.api.v1.checkout import router as checkout_router
from app.api.v1.customer import router as customer_router
from app.api.v1.loyalty import router as loyalty_router
from app.api.v1.staff import router as staff_router
from app.api.v1.admin import router as admin_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables and seed data if empty
    try:
        init_db()
        print("Database initialized and verified.")
    except Exception as e:
        print(f"Error initializing database: {e}")
    yield

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Production-ready API for The HUB retail shopping application featuring "
        "the HUBKLUB Loyalty Membership Module. Connected to real persistent SQLite database."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Enable CORS for mobile app (Expo web / native), Vercel admin portal, and local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
        "https://thehub-six-xi.vercel.app",
        "*",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global middleware to attach demo-mode indicator header to every response
@app.middleware("http")
async def add_demo_mode_header(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-TheHub-Demo-Mode"] = "true" if settings.DEMO_MODE else "false"
    response.headers["X-TheHub-Shopify-Adapter"] = settings.SHOPIFY_INTEGRATION_MODE
    response.headers["X-TheHub-Loyalty-Adapter"] = settings.HUBKLUB_INTEGRATION_MODE
    return response

# Mount API v1 routers
app.include_router(catalog_router, prefix=settings.API_V1_PREFIX)
app.include_router(cart_router, prefix=settings.API_V1_PREFIX)
app.include_router(checkout_router, prefix=settings.API_V1_PREFIX)
app.include_router(customer_router, prefix=settings.API_V1_PREFIX)
app.include_router(loyalty_router, prefix=settings.API_V1_PREFIX)
app.include_router(staff_router, prefix=settings.API_V1_PREFIX)
app.include_router(admin_router, prefix=settings.API_V1_PREFIX)

@app.get("/", tags=["Health & Status"])
def root_status():
    return {
        "status": "online",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "mode": "Live Persistent Database (SQLite hubklub_app.db)" if settings.HUBKLUB_INTEGRATION_MODE == "db" else "Demo Prototype",
        "database": "SQLite (hubklub_app.db)",
        "demo_mode": settings.DEMO_MODE,
        "shopify_adapter": settings.SHOPIFY_INTEGRATION_MODE,
        "hubklub_adapter": settings.HUBKLUB_INTEGRATION_MODE,
        "docs_url": "/docs",
        "api_v1": settings.API_V1_PREFIX,
    }

from fastapi.responses import JSONResponse, RedirectResponse, HTMLResponse
from app.api.v1.staff import StaffLoginRequest, StaffSession, staff_login

@app.get("/health", tags=["Health & Status"])
def health_check():
    return {"status": "healthy", "timestamp": "2026-10-17T11:00:00Z"}

@app.get("/admin", tags=["Admin Portal"])
@app.get("/admin/login", tags=["Admin Portal"])
@app.get("/staff", tags=["Admin Portal"])
@app.get("/staff/login", tags=["Admin Portal"])
def redirect_to_admin_portal():
    html_content = """
    <!DOCTYPE html>
    <html>
      <head>
        <meta http-equiv="refresh" content="0; url=http://localhost:5173" />
        <title>Redirecting to The HUB Admin Portal</title>
        <style>
          body { font-family: sans-serif; text-align: center; padding: 50px; background: #0a0a0a; color: #fff; }
          a { color: #d4af37; text-decoration: none; font-weight: bold; }
        </style>
      </head>
      <body>
        <h2>The HUB — Admin & POS Billing Counter</h2>
        <p>Redirecting to dashboard on <a href="http://localhost:5173">http://localhost:5173</a>...</p>
      </body>
    </html>
    """
    return HTMLResponse(content=html_content)

@app.post("/admin/login", response_model=StaffSession, tags=["Admin Portal"])
@app.post("/admin/auth/login", response_model=StaffSession, tags=["Admin Portal"])
@app.post("/auth/login", response_model=StaffSession, tags=["Admin Portal"])
@app.post("/staff/login", response_model=StaffSession, tags=["Admin Portal"])
def root_admin_login(req: StaffLoginRequest):
    return staff_login(req)

# The HUB Luxury Menswear Catalog reloaded

