from uuid import UUID

from sqlalchemy.orm import Session

from src.models.x_audit_log import XAuditLog


def record_x_audit_log(
    db: Session,
    user_id: UUID,
    action: str,
    *,
    post_id: UUID | None = None,
    x_account_id: UUID | None = None,
    detail: str | None = None,
) -> None:
    db.add(
        XAuditLog(
            user_id=user_id,
            action=action,
            post_id=post_id,
            x_account_id=x_account_id,
            detail=detail,
        )
    )
    db.commit()
