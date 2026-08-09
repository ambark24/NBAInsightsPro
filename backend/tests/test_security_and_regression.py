"""
Backend tests for Pro Ball Insights (Jan 2026).

Covers:
- SEC-002: admin refresh-predictions endpoint gating (401/403)
- SEC-001: CORS does not combine allow_credentials=true with reflected origin
- Chat length hardening (>500 char rejection with 422)
- Public regression endpoints (/games, /player-props, /odds/all, /highlights,
  /chat/messages) plus /auth/me 401-no-500 behavior.
"""

import os
import time
import requests
import pytest

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --------------- SEC-002 : admin endpoint gating ---------------

class TestAdminRefreshPredictions:
    URL = f"{BASE_URL}/api/admin/refresh-predictions"

    def test_no_auth_returns_401(self, api):
        r = api.post(self.URL, json={})
        assert r.status_code == 401, f"Expected 401 without auth, got {r.status_code}: {r.text[:300]}"
        # Body should contain a detail message, not a 500 stack trace
        try:
            body = r.json()
            assert "detail" in body
        except Exception:
            pytest.fail(f"Response was not JSON: {r.text[:300]}")

    def test_bogus_bearer_returns_401(self, api):
        r = api.post(
            self.URL,
            json={},
            headers={"Authorization": "Bearer definitely_not_a_real_session_token_xyz"},
        )
        assert r.status_code == 401, f"Expected 401 with bogus bearer, got {r.status_code}: {r.text[:300]}"

    def test_bogus_cookie_returns_401(self, api):
        r = requests.post(
            self.URL,
            json={},
            cookies={"session_token": "not_a_real_session_token"},
        )
        assert r.status_code == 401, f"Expected 401 with bogus cookie, got {r.status_code}: {r.text[:300]}"


# --------------- SEC-001 : CORS hardening ---------------

class TestCORS:
    def test_cors_does_not_combine_credentials_with_wildcard_or_reflected_origin(self, api):
        """Foreign origin request MUST NOT get ACAC=true + reflected/wildcard ACAO."""
        r = api.get(
            f"{BASE_URL}/api/games",
            headers={"Origin": "https://evil.example.com"},
        )
        assert r.status_code == 200, f"/api/games regression: {r.status_code}"
        acao = r.headers.get("Access-Control-Allow-Origin", "")
        acac = r.headers.get("Access-Control-Allow-Credentials", "").lower()
        # If credentials are enabled, origin MUST NOT be "*" and MUST NOT be the reflected foreign origin
        if acac == "true":
            assert acao != "*", (
                f"CORS misconfig: ACAC=true combined with wildcard ACAO. headers={dict(r.headers)}"
            )
            assert acao.lower() != "https://evil.example.com", (
                f"CORS misconfig: ACAC=true combined with reflected foreign origin. headers={dict(r.headers)}"
            )
        # Otherwise (ACAC absent/false) we're safe by construction

    def test_cors_preflight_does_not_reflect_foreign_origin_with_credentials(self, api):
        r = api.options(
            f"{BASE_URL}/api/games",
            headers={
                "Origin": "https://evil.example.com",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "content-type",
            },
        )
        # Any 2xx/4xx is fine, we're just checking header combination
        acao = r.headers.get("Access-Control-Allow-Origin", "")
        acac = r.headers.get("Access-Control-Allow-Credentials", "").lower()
        if acac == "true":
            assert acao != "*", f"Preflight: ACAC=true + ACAO=*. headers={dict(r.headers)}"
            assert acao.lower() != "https://evil.example.com", (
                f"Preflight: ACAC=true + reflected foreign origin. headers={dict(r.headers)}"
            )


# --------------- Chat length hardening ---------------

class TestChatLengthHardening:
    URL = f"{BASE_URL}/api/chat/messages"

    def test_message_over_500_chars_rejected_422(self, api):
        oversized = "x" * 501
        r = api.post(self.URL, json={"message": oversized})
        assert r.status_code == 422, f"Expected 422 for >500 char msg, got {r.status_code}: {r.text[:300]}"

    def test_empty_message_rejected_422(self, api):
        r = api.post(self.URL, json={"message": ""})
        assert r.status_code == 422, f"Expected 422 for empty msg, got {r.status_code}: {r.text[:300]}"

    def test_normal_message_accepted_and_persisted(self, api):
        marker = f"TEST_regression_{int(time.time())}"
        payload = {"message": marker}
        r = api.post(self.URL, json=payload)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:300]}"
        created = r.json()
        assert created["message"] == marker
        assert "message_id" in created and created["message_id"].startswith("msg_")
        assert "user_id" in created
        assert "created_at" in created

        # Verify persistence via GET
        r2 = api.get(self.URL)
        assert r2.status_code == 200
        messages = r2.json()
        assert isinstance(messages, list)
        assert any(m.get("message") == marker for m in messages), (
            "Posted message not returned by GET /api/chat/messages"
        )

    def test_exactly_500_chars_accepted(self, api):
        marker_body = "y" * 500
        r = api.post(self.URL, json={"message": marker_body})
        assert r.status_code == 200, f"Expected 200 for 500-char msg, got {r.status_code}"


# --------------- Public regression endpoints ---------------

class TestPublicRegression:
    def test_games_returns_200_list(self, api):
        r = api.get(f"{BASE_URL}/api/games")
        assert r.status_code == 200, f"/api/games -> {r.status_code}: {r.text[:300]}"
        data = r.json()
        assert isinstance(data, list), f"/api/games should return a list, got {type(data)}"

    def test_player_props_returns_200_list(self, api):
        r = api.get(f"{BASE_URL}/api/player-props")
        assert r.status_code == 200, f"/api/player-props -> {r.status_code}: {r.text[:300]}"
        data = r.json()
        assert isinstance(data, list)

    def test_odds_all_returns_200_list(self, api):
        r = api.get(f"{BASE_URL}/api/odds/all")
        assert r.status_code == 200, f"/api/odds/all -> {r.status_code}: {r.text[:300]}"
        data = r.json()
        assert isinstance(data, list)

    def test_highlights_returns_200_list(self, api):
        r = api.get(f"{BASE_URL}/api/highlights")
        assert r.status_code == 200, f"/api/highlights -> {r.status_code}: {r.text[:300]}"
        data = r.json()
        assert isinstance(data, list)

    def test_chat_messages_get_returns_200_list(self, api):
        r = api.get(f"{BASE_URL}/api/chat/messages")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)


# --------------- /auth/me graceful 401 ---------------

class TestAuthMeUnauthenticated:
    def test_auth_me_no_session_returns_401_not_500(self, api):
        r = api.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text[:300]}"
        try:
            body = r.json()
            assert "detail" in body
        except Exception:
            pytest.fail(f"Response was not JSON: {r.text[:300]}")

    def test_auth_me_bogus_bearer_returns_401(self, api):
        r = api.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": "Bearer bogus_token_abc"},
        )
        assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text[:300]}"


# --------------- Health check ---------------

class TestHealth:
    def test_root_health(self, api):
        r = api.get(f"{BASE_URL}/api/")
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "healthy"
