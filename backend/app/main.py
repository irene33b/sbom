from datetime import timedelta

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel

from . import engine, reports
from .auth import authenticate_user, create_access_token, get_current_user, require_admin
from .data_store import store

app = FastAPI(title="SentryChain SBOM Analyzer API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class LoginRequest(BaseModel):
    username: str
    password: str


@app.post("/api/auth/login")
def login(form: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form.username, form.password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    token = create_access_token({"sub": user["username"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "username": user["username"],
            "name": user["name"],
            "role": user["role"],
            "access_level": user["access_level"],
        },
    }


@app.get("/api/auth/me")
def me(current_user=Depends(get_current_user)):
    return current_user


# ---------------------------------------------------------------------------
# Dashboard / summary
# ---------------------------------------------------------------------------

@app.get("/api/summary")
def get_summary(current_user=Depends(get_current_user)):
    return engine.get_org_summary()


@app.get("/api/applications")
def list_applications(current_user=Depends(get_current_user)):
    return engine.get_application_summaries()


@app.get("/api/applications/{app_id}")
def get_application(app_id: str, current_user=Depends(require_admin)):
    app_meta = store.applications_by_id.get(app_id)
    if not app_meta:
        raise HTTPException(status_code=404, detail="Application not found")
    risk = engine.compute_app_risk(app_id)
    return {**app_meta, **risk}


@app.get("/api/applications/{app_id}/dependencies")
def get_app_dependencies(app_id: str, current_user=Depends(require_admin)):
    if app_id not in store.applications_by_id:
        raise HTTPException(status_code=404, detail="Application not found")
    return engine.get_dependencies_for_app(app_id)


@app.get("/api/applications/{app_id}/graph")
def get_app_graph(app_id: str, current_user=Depends(require_admin)):
    if app_id not in store.applications_by_id:
        raise HTTPException(status_code=404, detail="Application not found")
    g = engine.build_dependency_graph(app_id)
    return engine.graph_to_json(g)


@app.get("/api/evaluation")
def get_evaluation(current_user=Depends(require_admin)):
    result = engine.compute_self_evaluation()
    if result is None:
        raise HTTPException(status_code=404, detail="No ground-truth labels available")
    return result


@app.get("/api/vulnerabilities")
def list_vulnerabilities(current_user=Depends(require_admin)):
    return store.vulnerability_db


@app.get("/api/license-rules")
def list_license_rules(current_user=Depends(require_admin)):
    return store.license_rules


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------

@app.get("/api/applications/{app_id}/report")
def download_app_report(app_id: str, current_user=Depends(require_admin)):
    if app_id not in store.applications_by_id:
        raise HTTPException(status_code=404, detail="Application not found")
    pdf_bytes = reports.generate_app_report(app_id)
    app_name = store.applications_by_id[app_id]["name"]
    filename = f"{app_name}_risk_report.pdf".replace(" ", "_")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/api/reports/organization")
def download_org_report(current_user=Depends(require_admin)):
    pdf_bytes = reports.generate_org_report()
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="org_supply_chain_risk_report.pdf"'},
    )


@app.get("/api/health")
def health():
    return {"status": "ok"}
