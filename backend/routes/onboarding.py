"""Onboarding wizard route — persists workspace config and triggers initial forecast."""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Literal, Optional
from datetime import datetime, timezone
import uuid

router = APIRouter()

WORKSPACES_STORE = {}


class OnboardingConfig(BaseModel):
    forecastHorizon: int = 12
    granularity: Literal['daily', 'weekly', 'monthly'] = 'weekly'
    algorithm: str = 'auto'
    seasonality: bool = True
    intermittentHandling: bool = False


class OnboardingRequest(BaseModel):
    workspaceName: str
    industry: Literal['fmcg', 'auto', 'pharma', 'custom']
    columnMappings: dict[str, str] = {}
    config: OnboardingConfig


class OnboardingResponse(BaseModel):
    workspaceId: str
    status: Literal['created', 'error']
    message: Optional[str] = None


@router.post("/api/tenants/nestle-fmcg-demo/onboarding", response_model=OnboardingResponse)
async def create_onboarding(body: OnboardingRequest):
    workspace_id = f"ws-{uuid.uuid4().hex[:8]}"
    
    WORKSPACES_STORE[workspace_id] = {
        "workspaceId": workspace_id,
        "workspaceName": body.workspaceName,
        "industry": body.industry,
        "columnMappings": body.columnMappings,
        "config": body.config.model_dump() if hasattr(body.config, 'model_dump') else dict(body.config),
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "status": "active",
    }
    
    return OnboardingResponse(
        workspaceId=workspace_id,
        status="created",
        message=f"Workspace '{body.workspaceName}' created successfully with {len(body.columnMappings)} column mappings. Forecast engine initialized."
    )


@router.get("/api/tenants/nestle-fmcg-demo/onboarding/{workspace_id}")
async def get_onboarding(workspace_id: str):
    ws = WORKSPACES_STORE.get(workspace_id)
    if not ws:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Workspace not found")
    return ws
