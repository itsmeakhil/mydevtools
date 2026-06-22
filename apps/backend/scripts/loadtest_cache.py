"""Load test: 1000 concurrent users, 90/10 read/write.

Usage:
  pip install locust
  CACHE_ENABLED=false locust -f scripts/loadtest_cache.py --headless -u 1000 -r 100 -t 5m \
      --host http://localhost:8000 --csv=baseline
  CACHE_ENABLED=true  locust -f scripts/loadtest_cache.py --headless -u 1000 -r 100 -t 5m \
      --host http://localhost:8000 --csv=with_cache

Compare baseline_stats.csv vs with_cache_stats.csv.
"""
import random
import string

from locust import HttpUser, between, task


def _rand_str(n: int = 8) -> str:
    return "".join(random.choices(string.ascii_lowercase, k=n))


class DevToolsUser(HttpUser):
    wait_time = between(0.5, 2.0)
    headers: dict[str, str]

    def on_start(self):
        # Replace with a real test token issuance flow for the env.
        # Sketch: hit /auth/anon-login or seed a user.
        self.headers = {"Authorization": f"Bearer {self._token()}"}

    def _token(self) -> str:
        # Pull from env or local fixture file. Out of scope here.
        import os
        return os.environ.get("LOADTEST_TOKEN", "")

    @task(45)
    def list_bookmarks(self):
        self.client.get("/bookmarks", headers=self.headers, name="GET /bookmarks")

    @task(20)
    def list_notes(self):
        self.client.get("/notes", headers=self.headers, name="GET /notes")

    @task(15)
    def list_snippets(self):
        self.client.get("/code-snippets", headers=self.headers, name="GET /code-snippets")

    @task(10)
    def analytics_top(self):
        self.client.get("/analytics/top-tools?days=7", headers=self.headers, name="GET /analytics/top-tools")

    @task(10)
    def write_bookmark(self):
        self.client.post(
            "/bookmarks",
            json={"title": _rand_str(), "url": f"https://example.com/{_rand_str()}", "tags": []},
            headers=self.headers,
            name="POST /bookmarks",
        )
