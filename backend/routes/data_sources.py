from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
from models import DataSource, DataSourceCreate
from data import m5_data
from generic_dataset import DATASET_PROFILE, PENDING_USER_DATASET

router = APIRouter()

# Real connectors derived from the loaded dataset; user-added sources
# (created/removed from the UI) are appended to the same store.
DATA_SOURCES_STORE: list[dict] = []
_SOURCE_SEEDED = False


def _last_run_time() -> str:
    m5_data._lazy_init()
    history = m5_data.ACCURACY_HISTORY
    if history:
        return history[-1].get('date', '')
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def _seed_real_sources():
    global _SOURCE_SEEDED
    if _SOURCE_SEEDED:
        return
    if DATASET_PROFILE:
        name = DATASET_PROFILE.get('filename', 'Uploaded dataset')
        rows = int(DATASET_PROFILE.get('rows', 0))
        n_weeks = int(DATASET_PROFILE.get('n_weeks', 0))
        DATA_SOURCES_STORE.append({
            "id": "ds-001",
            "name": name,
            "status": "Connected",
            "freshness": f"{rows:,} rows · {n_weeks} weeks",
            "type": "Manual",
            "lastSync": _last_run_time(),
        })
    pending = PENDING_USER_DATASET
    if pending.get('file_bytes'):
        DATA_SOURCES_STORE.append({
            "id": "ds-002",
            "name": f"{pending.get('filename', 'upload')} (staged)",
            "status": "Syncing",
            "freshness": "Staged — applied on next forecast run",
            "type": "Manual",
            "lastSync": datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        })
    _SOURCE_SEEDED = True


@router.get("/api/tenants/nestle-fmcg-demo/data-sources", response_model=list[DataSource])
def get_data_sources():
    _seed_real_sources()
    return list(DATA_SOURCES_STORE)


@router.post("/api/tenants/nestle-fmcg-demo/data-sources", response_model=DataSource)
def create_data_source(body: DataSourceCreate):
    _seed_real_sources()
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
def refresh_data_source(source_id: str):
    now = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
    for s in DATA_SOURCES_STORE:
        if s["id"] == source_id:
            s["status"] = "Syncing"
            s["lastSync"] = now
            s["freshness"] = "Just now"
            return {"status": "success", "message": f"Refresh triggered for {s['name']}"}
    raise HTTPException(status_code=404, detail="Data source not found")


@router.delete("/api/tenants/nestle-fmcg-demo/data-sources/{source_id}")
def delete_data_source(source_id: str):
    for i, s in enumerate(DATA_SOURCES_STORE):
        if s["id"] == source_id:
            DATA_SOURCES_STORE.pop(i)
            return {"status": "success", "message": "Data source removed"}
    raise HTTPException(status_code=404, detail="Data source not found")
