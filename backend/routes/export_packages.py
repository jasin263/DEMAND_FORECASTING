from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
from models import ExportPackage, ExportPackagesResponse

router = APIRouter()

PACKAGES_STORE = [
    {"id": "pkg-001", "name": "Forecast Export - Weekly", "format": "CSV", "status": "ready", "updatedAt": "2026-07-23T05:00:00Z", "size": "2.4 MB"},
    {"id": "pkg-002", "name": "Backtest Results - Q2 2026", "format": "XLSX", "status": "ready", "updatedAt": "2026-07-22T14:30:00Z", "size": "1.1 MB"},
    {"id": "pkg-003", "name": "Model Comparison Report", "format": "JSON", "status": "generating", "updatedAt": "2026-07-23T05:45:00Z", "size": "—"},
    {"id": "pkg-004", "name": "Exception Log - Last 30 Days", "format": "CSV", "status": "ready", "updatedAt": "2026-07-21T08:00:00Z", "size": "856 KB"},
    {"id": "pkg-005", "name": "Promotion Impact Analysis", "format": "XLSX", "status": "failed", "updatedAt": "2026-07-20T16:00:00Z", "size": "—"},
]

INTEGRATIONS_STORE = [
    {"name": "SAP Analytics Cloud", "status": "Connected", "icon": "BarChart3"},
    {"name": "Power BI", "status": "Connected", "icon": "BarChart3"},
    {"name": "Snowflake", "status": "Available", "icon": "Database"},
    {"name": "Google Sheets", "status": "Connected", "icon": "FileText"},
    {"name": "Tableau", "status": "Available", "icon": "BarChart3"},
]


@router.get("/api/tenants/nestle-fmcg-demo/export-packages", response_model=ExportPackagesResponse)
async def get_export_packages():
    return {"packages": PACKAGES_STORE, "integrations": INTEGRATIONS_STORE}


@router.post("/api/tenants/nestle-fmcg-demo/export-packages", response_model=ExportPackage)
async def create_export_package(body: ExportPackage):
    now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    new_id = f"pkg-{len(PACKAGES_STORE) + 1:03d}"
    entry = {
        "id": new_id,
        "name": body.name,
        "format": body.format,
        "status": "generating",
        "updatedAt": now,
        "size": "—",
    }
    PACKAGES_STORE.append(entry)
    return entry


@router.get("/api/tenants/nestle-fmcg-demo/export-packages/{package_id}/download")
async def download_export_package(package_id: str):
    for p in PACKAGES_STORE:
        if p["id"] == package_id:
            if p["status"] != "ready":
                raise HTTPException(status_code=400, detail="Package not ready for download")
            return {"status": "success", "message": f"Download URL for {p['name']} ({p['format']})", "size": p["size"]}
    raise HTTPException(status_code=404, detail="Package not found")
