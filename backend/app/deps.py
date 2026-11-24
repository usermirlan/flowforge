from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .db import get_db
from .models import User, Workflow
from .security import decode_token

bearer = HTTPBearer(auto_error=False)


def current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)
) -> User:
    payload = decode_token(creds.credentials) if creds else None
    user = db.get(User, int(payload["sub"])) if payload else None
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Кирүү талап кылынат")
    return user


def own_workflow(workflow_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)) -> Workflow:
    wf = db.get(Workflow, workflow_id)
    if wf is None or wf.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Workflow табылган жок")
    return wf
