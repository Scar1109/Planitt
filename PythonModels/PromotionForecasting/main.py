import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from src.api.routes import router

app = FastAPI(
    title="Enterprise AI Promotion Engine",
    description="Agentic System for Demand Forecasting & Promotion Optimization",
    version="1.0.0"
)

# CORS (Allow Node.js Backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from src.api.scenario_routes import scenario_router

app.include_router(router, prefix="/api/v1")
app.include_router(scenario_router, prefix="/api/v1")

# Serve UI
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_root():
    return FileResponse('static/index.html')

@app.get("/health")
def health_check():
    return {"status": "active", "council": "ready"}

if __name__ == "__main__":
    # In production, use standard port (e.g. 8000)
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
