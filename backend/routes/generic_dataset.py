from fastapi import APIRouter, File, UploadFile, Form
from fastapi.responses import JSONResponse

from generic_dataset import (profile_dataset, forecast_from_mapping, load_user_dataset_into_m5,
                             PENDING_USER_DATASET, _light_profile, persist_pending_dataset)

router = APIRouter()


@router.post('/api/tenants/nestle-fmcg-demo/generic-dataset/profile')
def profile_generic_dataset(file: UploadFile = File(...)):
    try:
        contents = file.file.read()
        return profile_dataset(contents, file.filename or 'dataset.csv')
    except Exception as exc:  # pragma: no cover - defensive path
        return JSONResponse(status_code=400, content={'error': str(exc)})


@router.post('/api/tenants/nestle-fmcg-demo/generic-dataset/save')
def save_generic_dataset(file: UploadFile = File(...), mapping: str = Form(...)):
    try:
        import json
        contents = file.file.read()
        mapping_data = json.loads(mapping)
        PENDING_USER_DATASET['file_bytes'] = contents
        PENDING_USER_DATASET['filename'] = file.filename or 'dataset.csv'
        PENDING_USER_DATASET['mapping'] = mapping_data
        PENDING_USER_DATASET['light_profile'] = _light_profile(contents, file.filename or 'dataset.csv', mapping_data)
        persist_pending_dataset(contents, file.filename or 'dataset.csv', mapping_data)
        return {'status': 'saved', 'message': 'Dataset stored, will be used on next forecast run'}
    except Exception as exc:
        return JSONResponse(status_code=400, content={'error': str(exc)})


@router.post('/api/tenants/nestle-fmcg-demo/generic-dataset/forecast')
def forecast_generic_dataset(file: UploadFile = File(...), mapping: str = Form(...)):
    try:
        import json

        contents = file.file.read()
        mapping_data = json.loads(mapping)
        return forecast_from_mapping(contents, file.filename or 'dataset.csv', mapping_data)
    except Exception as exc:  # pragma: no cover - defensive path
        return JSONResponse(status_code=400, content={'error': str(exc)})
