from unittest.mock import patch

from src.models.brand_profile import BrandProfile
from src.models.chat_session import ChatSession


def test_chat_briefing_creates_session_and_reply(client, user_factory, auth_headers):
    user = user_factory()

    with patch(
        "src.services.chat_cmo.run_cmo_briefing_turn",
        return_value=("Qual é o nome da sua marca?", None),
    ):
        response = client.post(
            "/api/v1/chat/briefing",
            headers=auth_headers(user),
            json={"message": "Quero criar minha marca"},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["reply"] == "Qual é o nome da sua marca?"
    assert payload["done"] is False
    assert payload["conversation_id"]


def test_chat_briefing_persists_messages_on_follow_up(
    client,
    user_factory,
    auth_headers,
    db_session,
):
    user = user_factory()
    conversation_id = None

    with patch(
        "src.services.chat_cmo.run_cmo_briefing_turn",
        side_effect=[
            ("Qual é o nome da sua marca?", None),
            ("Qual nicho você atua?", None),
        ],
    ):
        first = client.post(
            "/api/v1/chat/briefing",
            headers=auth_headers(user),
            json={"message": "Olá"},
        )
        conversation_id = first.json()["conversation_id"]
        second = client.post(
            "/api/v1/chat/briefing",
            headers=auth_headers(user),
            json={"message": "Acme Labs", "conversation_id": conversation_id},
        )

    assert second.status_code == 200
    session = db_session.query(ChatSession).filter(ChatSession.id == conversation_id).one()
    assert len(session.messages) == 4
    roles = [m["role"] for m in session.messages]
    assert roles.count("user") == 2
    assert roles.count("assistant") == 2


def test_chat_briefing_saves_brand_profile_when_complete(
    client,
    user_factory,
    auth_headers,
    db_session,
):
    user = user_factory()
    profile = {
        "name": "Acme",
        "niche": "Marketing digital",
        "tone": "Profissional",
        "target_audience": "Pequenas empresas",
        "unique_value": "Automação com IA",
    }

    with patch(
        "src.services.chat_cmo.run_cmo_briefing_turn",
        return_value=("Perfil completo!", profile),
    ):
        response = client.post(
            "/api/v1/chat/briefing",
            headers=auth_headers(user),
            json={"message": "Estou pronto"},
        )

    assert response.status_code == 200
    assert response.json()["done"] is True
    saved = db_session.query(BrandProfile).filter(BrandProfile.user_id == user.id).one()
    assert saved.name == "Acme"
    assert saved.niche == "Marketing digital"


def test_chat_briefing_rejects_empty_message(client, user_factory, auth_headers):
    user = user_factory()
    response = client.post(
        "/api/v1/chat/briefing",
        headers=auth_headers(user),
        json={"message": "   "},
    )
    assert response.status_code == 422


def test_chat_briefing_returns_503_when_llm_unavailable(client, user_factory, auth_headers, db_session):
    user = user_factory()
    from src.services.chat_cmo import CmoChatError

    with patch(
        "src.services.chat_cmo.run_cmo_briefing_turn",
        side_effect=CmoChatError("Serviço indisponível"),
    ):
        response = client.post(
            "/api/v1/chat/briefing",
            headers=auth_headers(user),
            json={"message": "Oi"},
        )
    assert response.status_code == 503
    assert "indisponível" in response.json()["detail"].lower()
    assert db_session.query(ChatSession).filter(ChatSession.user_id == user.id).count() == 0
