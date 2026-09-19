from src.services.langsmith_evals import ensure_eval_dataset, evaluators, record_human_feedback


def test_evaluators_linkedin_length():
    fns = evaluators()
    length_fn = fns[0]
    result = length_fn(
        {"outputs": {"content": "a" * 4000}},
        {"inputs": {"platform": "LINKEDIN"}},
    )
    assert result["score"] == 0.0


def test_evaluators_objective_mention_partial():
    fns = evaluators()
    objective_fn = fns[2]
    result = objective_fn(
        {"outputs": {"content": "texto sem palavra"}},
        {"inputs": {"objective": "vender mais produtos"}},
    )
    assert result["score"] == 0.5


def test_ensure_eval_dataset_without_api_key():
    assert ensure_eval_dataset() is None


def test_record_human_feedback_no_run_id(monkeypatch):
    monkeypatch.setattr("src.config.settings.langsmith_api_key", "key")
    called = False

    def fake_client():
        nonlocal called
        called = True
        raise AssertionError("should not call")

    monkeypatch.setattr("src.services.langsmith_evals._client", fake_client)
    record_human_feedback(None, approved=True)
    assert called is False
