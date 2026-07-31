import json

from fastapi.testclient import TestClient

from backend.main import create_app


def test_health_and_ready_endpoints():
    client = TestClient(create_app())

    health = client.get('/api/health')
    assert health.status_code == 200
    assert health.json()['status'] == 'healthy'

    ready = client.get('/api/ready')
    assert ready.status_code == 200
    assert ready.json()['status'] in {'ready', 'starting'}


def test_validation_errors_are_structured():
    client = TestClient(create_app())

    response = client.get('/api/tenants/nestle-fmcg-demo/forecast-timeseries', params={'weeks': 0})

    assert response.status_code == 422
    body = response.json()
    assert 'error' in body
    assert body['error']['type'] == 'validation_error'


def test_generic_dataset_profile_suggests_target_and_date():
    client = TestClient(create_app())
    csv_bytes = b"date,product_id,region,units,price\n2024-01-01,P1,North,10,2.0\n2024-01-08,P1,North,12,2.1\n2024-01-15,P1,North,14,2.2\n2024-01-22,P2,South,8,1.9\n2024-01-29,P2,South,9,2.0\n"

    response = client.post(
        '/api/tenants/nestle-fmcg-demo/generic-dataset/profile',
        files={'file': ('demo.csv', csv_bytes, 'text/csv')},
    )

    assert response.status_code == 200
    body = response.json()
    assert body['suggestions']['target_column'] == 'units'
    assert body['suggestions']['date_column'] == 'date'
    assert body['suggestions']['entity_column'] == 'product_id'


def test_generic_dataset_forecast_applies_mapping():
    client = TestClient(create_app())
    csv_bytes = b"date,product_id,region,units,price\n2024-01-01,P1,North,10,2.0\n2024-01-08,P1,North,12,2.1\n2024-01-15,P1,North,14,2.2\n2024-01-22,P2,South,8,1.9\n2024-01-29,P2,South,9,2.0\n"
    mapping = {
        'date_column': 'date',
        'target_column': 'units',
        'entity_column': 'product_id',
        'frequency': 'W',
        'forecast_horizon': 2,
    }

    response = client.post(
        '/api/tenants/nestle-fmcg-demo/generic-dataset/forecast',
        files={'file': ('demo.csv', csv_bytes, 'text/csv')},
        data={'mapping': json.dumps(mapping)},
    )

    assert response.status_code == 200
    body = response.json()
    assert 'series' in body
    assert len(body['series']) > 0
    assert body['series'][0]['actual'] is not None
