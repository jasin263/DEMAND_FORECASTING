from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from models import SKUItem, SKUDetail
from data import m5_data

router = APIRouter()

@router.get("/api/tenants/nestle-fmcg-demo/skus")
def get_skus(
    page: int = Query(1, ge=1),
    pageSize: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    sortBy: Optional[str] = None,
    sortOrder: Optional[str] = Query(None, pattern="^(asc|desc)$"),
    category: Optional[str] = None,
    location: Optional[str] = None,
    pattern: Optional[str] = None,
):
    results = list(m5_data.get_all_skus())
    if category:
        results = [s for s in results if s["category"].lower() == category.lower()]
    if location:
        results = [s for s in results if location.lower() in s["location"].lower()]
    if pattern:
        results = [s for s in results if s["pattern"].lower() == pattern.lower()]
    if search:
        sl = search.lower()
        results = [s for s in results if sl in s["name"].lower() or sl in s["skuId"].lower() or sl in s["category"].lower()]
    if sortBy and sortBy in ("mape", "p50Forecast", "bias", "name", "category"):
        reverse = sortOrder == "desc"
        results.sort(key=lambda x: x.get(sortBy, "") if isinstance(x.get(sortBy), str) else x.get(sortBy, 0), reverse=reverse)
    total = len(results)
    total_pages = max(1, (total + pageSize - 1) // pageSize)
    start = (page - 1) * pageSize
    end = start + pageSize
    return {"items": results[start:end], "total": total, "page": page, "pageSize": pageSize, "totalPages": total_pages}

@router.get("/api/tenants/nestle-fmcg-demo/skus/{sku_id}")
def get_sku_detail_route(sku_id: str):
    detail = m5_data.get_sku_detail(sku_id)
    if not detail:
        raise HTTPException(status_code=404, detail=f"SKU {sku_id} not found")
    return detail