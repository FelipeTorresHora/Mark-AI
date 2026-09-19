import asyncio

import pytest

from src.services.human_review import apply_human_review


def test_apply_human_review_requires_thread(db_session, campaign_factory, user_factory):
    user = user_factory()
    campaign = campaign_factory(user)
    campaign.graph_thread_id = None
    db_session.commit()

    with pytest.raises(ValueError, match="thread"):
        asyncio.run(apply_human_review(db_session, campaign, action="approve"))
