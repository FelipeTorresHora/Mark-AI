def test_healthcheck_degraded_when_db_fails(client, monkeypatch):
    class _BrokenSession:
        def execute(self, *_args, **_kwargs):
            raise RuntimeError("db down")

        def close(self):
            pass

    monkeypatch.setattr("src.main.SessionLocal", lambda: _BrokenSession())

    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "degraded"
    assert "db down" in body["database"]
