from src.services.langsmith_evals import evaluators


def test_evaluators_length_x():
    fns = evaluators()
    length_fn = fns[0]
    result = length_fn(
        {"outputs": {"content": "a" * 200}},
        {"inputs": {"platform": "X"}},
    )
    assert result["key"] == "length_ok"
    assert result["score"] == 1.0


def test_evaluators_faceless():
    fns = evaluators()
    faceless_fn = fns[1]
    bad = faceless_fn(
        {"outputs": {"content": "poste um selfie"}},
        {"inputs": {"audience": "faceless"}},
    )
    assert bad["score"] == 0.0
