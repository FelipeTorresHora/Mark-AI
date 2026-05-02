def test_get_brand_profile_returns_404_when_missing(client, user_factory, auth_headers):
    user = user_factory()

    response = client.get("/api/v1/brand-profile", headers=auth_headers(user))

    assert response.status_code == 404
    assert response.json()["detail"] == "Perfil de marca não encontrado"


def test_upsert_brand_profile_creates_profile(client, user_factory, auth_headers):
    user = user_factory()

    response = client.put(
        "/api/v1/brand-profile",
        headers=auth_headers(user),
        json={
            "name": "Marca Nova",
            "niche": "Tecnologia",
            "tone": "Consultivo",
            "target_audience": "PMEs",
            "unique_value": "Time de IA sob demanda",
        },
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Marca Nova"


def test_upsert_brand_profile_updates_existing_profile(
    client,
    user_factory,
    brand_profile_factory,
    auth_headers,
):
    user = user_factory()
    brand_profile_factory(user, name="Antes")

    response = client.put(
        "/api/v1/brand-profile",
        headers=auth_headers(user),
        json={
            "name": "Depois",
            "niche": "Tecnologia",
            "tone": "Consultivo",
            "target_audience": "PMEs",
            "unique_value": "Time de IA sob demanda",
        },
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Depois"


def test_get_brand_profile_returns_existing_profile(
    client,
    user_factory,
    brand_profile_factory,
    auth_headers,
):
    user = user_factory()
    brand_profile_factory(user, name="Marca Perfil")

    response = client.get("/api/v1/brand-profile", headers=auth_headers(user))

    assert response.status_code == 200
    assert response.json()["name"] == "Marca Perfil"
