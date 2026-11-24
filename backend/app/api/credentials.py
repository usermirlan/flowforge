from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import current_user
from ..engine.nodes import CREDENTIAL_TYPES
from ..models import Credential, User
from ..schemas import CredentialIn, CredentialOut
from ..security import decrypt_json, encrypt_json
from ..i18n import t

router = APIRouter(prefix="/api/credentials", tags=["credentials"])


def _preview(cred: Credential) -> dict[str, str]:
    data = decrypt_json(cred.data_encrypted)
    out = {}
    for f in CREDENTIAL_TYPES[cred.type]["fields"]:
        v = data.get(f["name"], "")
        out[f["name"]] = ("•" * 6 + v[-4:]) if f["secret"] and v else v
    return out


def _out(cred: Credential) -> dict:
    return {"id": cred.id, "name": cred.name, "type": cred.type, "preview": _preview(cred), "created_at": cred.created_at}


@router.get("", response_model=list[CredentialOut])
def list_credentials(user: User = Depends(current_user), db: Session = Depends(get_db)):
    creds = db.scalars(select(Credential).where(Credential.user_id == user.id).order_by(Credential.created_at)).all()
    return [_out(c) for c in creds]


@router.post("", response_model=CredentialOut, status_code=201)
def create_credential(data: CredentialIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    spec = CREDENTIAL_TYPES.get(data.type)
    if spec is None:
        raise HTTPException(422, t("Белгисиз түр: {type}", type=data.type))
    clean = {}
    for f in spec["fields"]:
        v = (data.data.get(f["name"]) or f.get("default") or "").strip()
        if f["secret"] and not v:
            raise HTTPException(422, t("{label} талап кылынат", label=f["label"]))
        clean[f["name"]] = v
    cred = Credential(user_id=user.id, name=data.name, type=data.type, data_encrypted=encrypt_json(clean))
    db.add(cred)
    db.commit()
    return _out(cred)


@router.delete("/{credential_id}", status_code=204)
def delete_credential(credential_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    cred = db.get(Credential, credential_id)
    if cred is None or cred.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, t("Табылган жок"))
    db.delete(cred)
    db.commit()
