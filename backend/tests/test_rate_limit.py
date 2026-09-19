import pytest

from src.services.rate_limit import RateLimitExceeded, check_rate_limit


def test_rate_limit_allows_under_max():
    key = "test-rl-ok"
    for _ in range(3):
        check_rate_limit(key, max_hits=3, window_seconds=60)


def test_rate_limit_blocks_over_max():
    key = "test-rl-block"
    check_rate_limit(key, max_hits=2, window_seconds=60)
    check_rate_limit(key, max_hits=2, window_seconds=60)
    with pytest.raises(RateLimitExceeded):
        check_rate_limit(key, max_hits=2, window_seconds=60)


def test_rate_limit_custom_message():
    with pytest.raises(RateLimitExceeded, match="custom"):
        raise RateLimitExceeded("custom limit")
