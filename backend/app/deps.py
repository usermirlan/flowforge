from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .db import get_db
from .models import User, Workflow
from .security import decode_token
from .i18n import lang_var, t

bearer = HTTPBearer(auto_error=False)


def current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)
) -> User:
    payload = decode_token(creds.credentials) if creds else None
    user = db.get(User, int(payload["sub"])) if payload else None
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, t("Кирүү талап кылынат"))
    if user.lang != lang_var.get():  # remember the UI language for background runs
        user.lang = lang_var.get()
        db.commit()
    return user


def own_workflow(workflow_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)) -> Workflow:
    wf = db.get(Workflow, workflow_id)
    if wf is None or wf.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, t("Workflow табылган жок"))
    return wf
