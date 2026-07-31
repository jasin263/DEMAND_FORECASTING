"""7. Collaboration layer — annotations, overrides, comments on forecasts."""
import logging
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query
from data import m5_data

logger = logging.getLogger(__name__)
router = APIRouter()

ANNOTATIONS = []
OVERRIDES = []
THREADS = []

@router.get("/api/tenants/nestle-fmcg-demo/collaboration")
async def get_collaboration():
    m5_data._lazy_init()
    return {"annotations": ANNOTATIONS[-100:], "overrides": OVERRIDES[-50:],
            "threads": THREADS[-50:], "pendingApprovals": sum(1 for o in OVERRIDES if o.get('approved') is None)}

@router.get("/api/tenants/nestle-fmcg-demo/collaboration/sku/{sku_id}")
async def get_sku_collaboration(sku_id: str):
    return {"annotations": [a for a in ANNOTATIONS if a['skuId'] == sku_id],
            "overrides": [o for o in OVERRIDES if o['skuId'] == sku_id],
            "threads": [t for t in THREADS if t['skuId'] == sku_id]}

@router.post("/api/tenants/nestle-fmcg-demo/collaboration/annotations")
async def create_annotation(body: dict):
    m5_data._lazy_init()
    ann = {"id": str(uuid.uuid4())[:8], "skuId": body['skuId'], "week": body.get('week', ''),
           "author": body.get('author', 'Planner'), "role": body.get('role', 'Demand Planner'),
           "text": body['text'], "type": body.get('type', 'comment'),
           "originalValue": body.get('originalValue'), "adjustedValue": body.get('adjustedValue'),
           "createdAt": datetime.now(timezone.utc).isoformat(),
           "updatedAt": datetime.now(timezone.utc).isoformat(), "resolved": False}
    ANNOTATIONS.append(ann)
    return ann

@router.post("/api/tenants/nestle-fmcg-demo/collaboration/overrides")
async def create_override(body: dict):
    m5_data._lazy_init()
    ovr = {"id": str(uuid.uuid4())[:8], "skuId": body['skuId'], "week": body.get('week', ''),
           "author": body.get('author', 'Senior Planner'), "role": body.get('role', 'Senior Planner'),
           "reason": body['reason'], "originalP50": body['originalP50'], "adjustedP50": body['adjustedP50'],
           "originalP10": body.get('originalP10', 0), "originalP90": body.get('originalP90', 0),
           "adjustedP10": body.get('adjustedP10', 0), "adjustedP90": body.get('adjustedP90', 0),
           "createdAt": datetime.now(timezone.utc).isoformat(), "approved": None}
    OVERRIDES.append(ovr)
    return ovr

@router.post("/api/tenants/nestle-fmcg-demo/collaboration/overrides/{override_id}/approve")
async def approve_override(override_id: str, body: dict):
    for o in OVERRIDES:
        if o['id'] == override_id:
            o['approved'] = body.get('approved', True)
            return o
    raise HTTPException(404, "Override not found")

@router.post("/api/tenants/nestle-fmcg-demo/collaboration/threads")
async def create_thread(body: dict):
    m5_data._lazy_init()
    msg = {"id": str(uuid.uuid4())[:8], "skuId": body['skuId'], "week": body.get('week', ''),
           "author": body.get('author', 'Planner'), "role": body.get('role', 'Demand Planner'),
           "text": body['text'], "type": "comment", "createdAt": datetime.now(timezone.utc).isoformat(),
           "updatedAt": datetime.now(timezone.utc).isoformat(), "resolved": False}
    thread = {"id": str(uuid.uuid4())[:8], "skuId": body['skuId'],
              "subject": body.get('subject', 'Forecast Discussion'),
              "messages": [msg], "status": "open",
              "createdAt": datetime.now(timezone.utc).isoformat()}
    THREADS.append(thread)
    return thread

@router.post("/api/tenants/nestle-fmcg-demo/collaboration/threads/{thread_id}/messages")
async def add_thread_message(thread_id: str, body: dict):
    for t in THREADS:
        if t['id'] == thread_id:
            msg = {"id": str(uuid.uuid4())[:8], "skuId": t['skuId'], "week": body.get('week', ''),
                   "author": body.get('author', 'Planner'), "role": body.get('role', 'Demand Planner'),
                   "text": body['text'], "type": "comment",
                   "createdAt": datetime.now(timezone.utc).isoformat(),
                   "updatedAt": datetime.now(timezone.utc).isoformat(), "resolved": False}
            t['messages'].append(msg)
            return t
    raise HTTPException(404, "Thread not found")

@router.post("/api/tenants/nestle-fmcg-demo/collaboration/threads/{thread_id}/resolve")
async def resolve_thread(thread_id: str):
    for t in THREADS:
        if t['id'] == thread_id:
            t['status'] = 'resolved'
            return t
    raise HTTPException(404, "Thread not found")
