"""Promotion & Price Modeling — computes price elasticity and promotion lift per SKU."""
from fastapi import APIRouter, HTTPException
import numpy as np
from data import m5_data

router = APIRouter()

@router.get("/api/tenants/nestle-fmcg-demo/promotion-impact")
async def get_promotion_impact():
    """Return promotion lift and price elasticity analysis for all SKUs."""
    from data.m5_data import get_sku_detail

    skus = m5_data.get_all_skus()
    results = []
    for sku in skus[:30]:
        detail = get_sku_detail(sku['id'])
        if not detail:
            continue
        price_history = detail.get('priceHistory', [])
        full_trend = detail.get('fullTrend', [])

        if not price_history or len(price_history) < 4 or len(full_trend) < 4:
            continue

        prices = np.array(price_history, dtype=float)
        sales = np.array(full_trend, dtype=float)
        n = min(len(prices), len(sales))
        prices = prices[:n]
        sales = sales[:n]

        # Price elasticity: % change in sales / % change in price
        price_changes = np.diff(prices) / prices[:-1]
        sales_changes = np.diff(sales) / sales[:-1]
        valid = (price_changes != 0) & (~np.isnan(price_changes)) & (~np.isnan(sales_changes))
        elasticities = sales_changes[valid] / price_changes[valid]
        elasticities = elasticities[~np.isinf(elasticities)]
        avg_elasticity = float(np.mean(elasticities)) if len(elasticities) > 0 else 0

        # Promotion detection: week-over-week price drop >5%
        promo_mask = np.diff(prices) < -0.05
        promo_indices = np.where(promo_mask)[0]
        promo_lifts = []
        for idx in promo_indices:
            pre_idx = max(0, idx - 3)
            post_idx = min(len(sales), idx + 4)
            if post_idx - idx >= 2:
                pre_avg = float(np.mean(sales[pre_idx:idx + 1]))
                post_avg = float(np.mean(sales[idx + 1:post_idx]))
                if pre_avg > 0:
                    promo_lifts.append((post_avg - pre_avg) / pre_avg * 100)

        avg_promo_lift = float(np.mean(promo_lifts)) if promo_lifts else 0
        promo_count = len(promo_lifts)

        # Price sweet spot
        sorted_idx = np.argsort(prices)
        if len(sorted_idx) >= 5:
            top_sales_idx = sorted_idx[-5:]
            sweet_spot_price = float(np.mean(prices[top_sales_idx])) if len(top_sales_idx) > 0 else float(prices[-1])
        else:
            sweet_spot_price = float(prices[-1])

        results.append({
            "skuId": sku['id'],
            "name": sku['name'],
            "category": sku['category'],
            "currentPrice": float(prices[-1]) if len(prices) > 0 else 0,
            "priceElasticity": round(avg_elasticity, 2) if not np.isnan(avg_elasticity) else 0,
            "avgPromoLift": round(avg_promo_lift, 1),
            "promoCount": promo_count,
            "sweetSpotPrice": round(sweet_spot_price, 2),
            "promoRevenueImpact": round(float(np.sum(sales[promo_indices + 1]) - np.sum(sales[promo_indices])), 1) if len(promo_indices) > 0 else 0,
        })

    return {"skus": results, "total": len(results)}

@router.get("/api/tenants/nestle-fmcg-demo/promotion-impact/{sku_id}")
async def get_sku_promotion_impact(sku_id: str):
    """Return promotion impact for a single SKU."""
    from data.m5_data import get_sku_detail

    detail = get_sku_detail(sku_id)
    if not detail:
        raise HTTPException(status_code=404, detail=f"SKU {sku_id} not found")

    price_history = detail.get('priceHistory', [])
    full_trend = detail.get('fullTrend', [])

    if not price_history or len(price_history) < 4:
        return {
            "skuId": sku_id,
            "name": detail.get('name', ''),
            "error": "Insufficient price history",
        }

    prices = np.array(price_history, dtype=float)
    sales = np.array(full_trend, dtype=float)
    n = min(len(prices), len(sales))
    prices = prices[:n]
    sales = sales[:n]

    price_changes = np.diff(prices) / prices[:-1]
    sales_changes = np.diff(sales) / sales[:-1]
    valid = (price_changes != 0) & (~np.isnan(price_changes)) & (~np.isnan(sales_changes))
    elasticities = sales_changes[valid] / price_changes[valid]
    elasticities = elasticities[~np.isinf(elasticities)]
    avg_elasticity = float(np.mean(elasticities)) if len(elasticities) > 0 else 0

    # Weekly promotion impact detail
    promo_mask = np.diff(prices) < -0.05
    promo_indices = np.where(promo_mask)[0]
    promo_details = []
    for idx in promo_indices:
        pre_avg = float(np.mean(sales[max(0, idx - 3):idx + 1]))
        post_avg = float(np.mean(sales[idx + 1:min(len(sales), idx + 5)]))
        lift = ((post_avg - pre_avg) / pre_avg * 100) if pre_avg > 0 else 0
        promo_details.append({
            "week": f"W{idx}",
            "priceBefore": float(prices[idx]),
            "priceDuring": float(prices[min(idx + 1, len(prices) - 1)]),
            "discountPct": round((1 - prices[min(idx + 1, len(prices) - 1)] / prices[idx]) * 100, 1),
            "salesBefore": round(pre_avg, 1),
            "salesAfter": round(post_avg, 1),
            "promoLiftPct": round(lift, 1),
        })

    return {
        "skuId": sku_id,
        "name": detail.get('name', ''),
        "currentPrice": float(prices[-1]) if len(prices) > 0 else 0,
        "priceElasticity": round(avg_elasticity, 2) if not np.isnan(avg_elasticity) else 0,
        "avgPromoLift": round(float(np.mean([d['promoLiftPct'] for d in promo_details])), 1) if promo_details else 0,
        "promoDetails": promo_details,
    }
