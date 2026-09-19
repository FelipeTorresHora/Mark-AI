from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from src.database import get_db
from src.dependencies.auth import get_current_user
from src.models.brand_profile import BrandProfile
from src.models.chat_session import ChatSession
from src.models.user import User
from src.schemas.chat import ChatMessage, ChatRequest, ChatResponse, ChatSessionResponse
from src.services.chat_cmo import CmoChatError, chat_cmo_reply

router = APIRouter(prefix="/chat", tags=["chat"])


def _append_message(session: ChatSession, message: dict) -> None:
    messages = list(session.messages or [])
    messages.append(message)
    session.messages = messages
    flag_modified(session, "messages")


@router.post("/briefing", response_model=ChatResponse)
def send_briefing_message(
    body: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Envia mensagem para o CMO IA e recebe resposta."""
    message = (body.message or "").strip()
    if not message:
        raise HTTPException(status_code=422, detail="Mensagem não pode ser vazia.")

    session: ChatSession | None = None
    if body.conversation_id:
        session = db.query(ChatSession).filter(
            ChatSession.id == body.conversation_id,
            ChatSession.user_id == current_user.id,
            ChatSession.is_active.is_(True),
        ).first()

    if not session:
        session = ChatSession(user_id=current_user.id, messages=[])
        db.add(session)
        db.commit()
        db.refresh(session)

    user_msg = {
        "role": "user",
        "content": message,
        "timestamp": datetime.utcnow().isoformat(),
    }
    _append_message(session, user_msg)

    try:
        reply_text, brand_profile = chat_cmo_reply(
            message,
            list(session.messages or []),
            user_id=str(current_user.id),
        )
    except CmoChatError as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    assistant_msg = {
        "role": "assistant",
        "content": reply_text,
        "timestamp": datetime.utcnow().isoformat(),
    }
    _append_message(session, assistant_msg)

    if brand_profile:
        session.brand_profile_complete = True

        bp = db.query(BrandProfile).filter(BrandProfile.user_id == current_user.id).first()
        if bp:
            bp.name = brand_profile.get("name", bp.name)
            bp.niche = brand_profile.get("niche", bp.niche)
            bp.tone = brand_profile.get("tone", bp.tone)
            bp.target_audience = brand_profile.get("target_audience", bp.target_audience)
            bp.unique_value = brand_profile.get("unique_value", bp.unique_value)
        else:
            bp = BrandProfile(
                user_id=current_user.id,
                name=brand_profile.get("name", ""),
                niche=brand_profile.get("niche", ""),
                tone=brand_profile.get("tone", "Profissional"),
                target_audience=brand_profile.get("target_audience", ""),
                unique_value=brand_profile.get("unique_value", ""),
            )
            db.add(bp)

    db.commit()
    db.refresh(session)

    return ChatResponse(
        conversation_id=str(session.id),
        reply=reply_text,
        done=session.brand_profile_complete,
        brand_profile=brand_profile,
    )


@router.get("/briefing/{session_id}", response_model=ChatSessionResponse)
def get_briefing_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Recupera histórico de uma sessão de briefing."""
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessão de chat não encontrada")
    return ChatSessionResponse(
        id=str(session.id),
        messages=[ChatMessage(**m) for m in (session.messages or [])],
        is_active=session.is_active,
        brand_profile_complete=session.brand_profile_complete,
        created_at=session.created_at.isoformat(),
        updated_at=session.updated_at.isoformat(),
    )


@router.get("/briefing", response_model=list[ChatSessionResponse])
def list_briefing_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista sessões de briefing do usuário."""
    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.updated_at.desc())
        .all()
    )
    return [
        ChatSessionResponse(
            id=str(s.id),
            messages=[ChatMessage(**m) for m in (s.messages or [])],
            is_active=s.is_active,
            brand_profile_complete=s.brand_profile_complete,
            created_at=s.created_at.isoformat(),
            updated_at=s.updated_at.isoformat(),
        )
        for s in sessions
    ]
