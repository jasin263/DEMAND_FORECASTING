from fastapi import APIRouter, HTTPException
from typing import Literal
from datetime import datetime, timezone
from models import DataSource, DataSourceCreate

router = APIRouter()

DATA_SOURCES_STORE = [
    {"id": "ds-001", "name": "SAP ERP (Production)", "status": "Connected", "freshness": "2 min ago", "type": "ERP", "lastSync": "2026-07-23T05:45:00Z"},
    {"id": "ds-002", "name": "POS Feed (CA Stores)", "status": "Connected", "freshness": "15 min ago", "type": "POS", "lastSync": "2026-07-23T05:32:00Z"},
    {"id": "ds-003", "name": "Supplier Portal (Tier 1)", "status": "Syncing", "freshness": "Syncing now", "type": "Supplier", "lastSync": "2026-07-23T05:40:00Z"},
    {"id": "ds-004", "name": "Demand Sensing API", "status": "Connected", "freshness": "1 min ago", "type": "API", "lastSync": "2026-07-23T05:46:00Z"},
    {"id": "ds-005", "name": "Warehouse WMS", "status": "Error", "freshness": "3 hours ago", "type": "ERP", "lastSync": "2026-07-23T02:15:00Z"},
    {"id": "ds-006", "name": "Promotion Calendar (XLSX)", "status": "Disconnected", "freshness": "2 days ago", "type": "Manual", "lastSync": "2026-07-21T08:00:00Z"},
]


@router.get("/api/tenants/nestle-fmcg-demo/data-sources", response_model=list[DataSource])
async def get_data_sources():
    return list(DATA_SOURCES_STORE)


@router.post("/api/tenants/nestle-fmcg-demo/data-sources", response_model=DataSource)
async def create_data_source(body: DataSourceCreate):
    new_id = f"ds-{len(DATA_SOURCES_STORE) + 1:03d}"
    now = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
    new_source = {
        "id": new_id,
        "name": body.name,
        "status": "Connected",
        "freshness": "Just now",
        "type": body.type,
        "lastSync": now,
    }
    DATA_SOURCES_STORE.append(new_source)
    return new_source


@router.post("/api/tenants/nestle-fmcg-demo/data-sources/{source_id}/refresh")
async def refresh_data_source(source_id: str):
    now = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
    for s in DATA_SOURCES_STORE:
        if s["id"] == source_id:
            s["status"] = "Syncing"
            s["lastSync"] = now
            s["freshness"] = "Just now"
            return {"status": "success", "message": f"Refresh triggered for {s['name']}"}
    raise HTTPException(status_code=404, detail="Data source not found")


@router.delete("/api/tenants/nestle-fmcg-demo/data-sources/{source_id}")
async def delete_data_source(source_id: str):
    for i, s in enumerate(DATA_SOURCES_STORE):
        if s["id"] == source_id:
            DATA_SOURCES_STORE.pop(i)
            return {"status": "success", "message": "Data source removed"}
    raise HTTPException(status_code=404, detail="Data source not found")
