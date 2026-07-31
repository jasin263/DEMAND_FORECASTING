from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from datetime import datetime, timezone
from models import ExceptionItem, ExceptionActionRequest
from data import m5_data

router = APIRouter()

@router.get("/api/tenants/nestle-fmcg-demo/exceptions", response_model=list[ExceptionItem])
async def get_exceptions(
    severity: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
):
    results = list(m5_data.get_exceptions())
    if severity:
        results = [e for e in results if e.get("severity", "").lower() == severity.lower()]
    if type:
        results = [e for e in results if e.get("type", "").lower() == type.lower()]
    if status:
        results = [e for e in results if e.get("status", "").lower() == status.lower()]
    return results[:limit]


@router.patch("/api/tenants/nestle-fmcg-demo/exceptions/{exc_id}")
async def update_exception(exc_id: str, body: ExceptionActionRequest):
    """Resolve, acknowledge, or dismiss an exception."""
    updated = m5_data.update_exception(exc_id, body.action, body.note)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Exception {exc_id} not found")
    return updated


@router.post("/api/tenants/nestle-fmcg-demo/exceptions/export")
async def export_exceptions():
    """Export all exceptions as a downloadable report."""
    exc = m5_data.get_exceptions()
    return {
        "status": "success",
        "message": f"Export generated with {len(exc)} exceptions",
        "count": len(exc),
        "format": "CSV",
        "exportedAt": datetime.now(timezone.utc).isoformat(),
    }
