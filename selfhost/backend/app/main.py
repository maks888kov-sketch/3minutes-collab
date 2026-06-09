import contextlib

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.errors import ApiError
from app.realtime import hub
from app.routers import auth, entities, files, functions, integrations, public, ws
from app.storage import ensure_storage


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    with contextlib.suppress(Exception):
        ensure_storage()
    await hub.start()
    try:
        yield
    finally:
        await hub.stop()


app = FastAPI(title="3Minutes self-hosted backend", lifespan=lifespan)

# Same-origin in production (via nginx); permissive CORS helps direct debugging.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ApiError)
async def api_error_handler(request: Request, exc: ApiError):
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": exc.message, "detail": exc.message, "code": exc.code},
    )


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


app.include_router(public.router)
app.include_router(auth.router)
app.include_router(entities.router)
app.include_router(integrations.router)
app.include_router(functions.router)
app.include_router(files.router)
app.include_router(ws.router)
