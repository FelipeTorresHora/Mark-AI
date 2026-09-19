
def test_human_approve_endpoint(
    client, user_factory, auth_headers, db_session, campaign_factory, post_factory, monkeypatch
):
    user = user_factory()
    campaign = campaign_factory(user, status="AWAITING_REVIEW")
    campaign.graph_thread_id = "thread-test-approve"
    campaign.objective = campaign.topic
    db_session.commit()
    post = post_factory(campaign, platform="X", status="UNDER_REVIEW", content="Antigo")

    async def fake_resume(*_args, **_kwargs):
        return {"platform_contents": {"X": "Antigo"}}

    monkeypatch.setattr("src.services.human_review.resume_after_human", fake_resume)

    response = client.post(
        f"/api/v1/generate/{campaign.id}/human",
        headers=auth_headers(user),
        json={"action": "approve"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "DONE"
    assert data["awaiting_review"] is False

    db_session.refresh(post)
    assert post.status == "APPROVED"


def test_human_redo_requires_feedback(client, user_factory, auth_headers, campaign_factory, db_session):
    user = user_factory()
    campaign = campaign_factory(user, status="AWAITING_REVIEW")
    campaign.graph_thread_id = "thread-redo"
    db_session.commit()

    response = client.post(
        f"/api/v1/generate/{campaign.id}/human",
        headers=auth_headers(user),
        json={"action": "redo", "platform": "X"},
    )
    assert response.status_code == 422
