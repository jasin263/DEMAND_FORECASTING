# Fix Issues - ForecastIQ

## Progress
- [x] Fix 1: Add `fullTrend`, `sellPrice`, `priceHistory`, `events` fields to `SKUItem` Pydantic model
- [x] Fix 2: Fix ExceptionItem severity case (backend: 'High'/'Medium'/'Low' → 'high'/'medium'/'low')
- [x] Fix 3: Fix backend imports in `m5_data.py` (absolute → relative)
- [x] Fix 4: Create `__init__.py` in `backend/data/`
- [x] Fix 5: Fix `PaginatedResponse` to use generic type parameter
- [x] Fix 6: Ensure `fullTrend` is included in `get_sku_detail()` response
