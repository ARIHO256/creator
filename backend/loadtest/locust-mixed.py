import os

from locust import HttpUser, between, task


class MixedTrafficUser(HttpUser):
    wait_time = between(0.5, 2.0)

    def on_start(self):
        seller_token = os.getenv("SELLER_TOKEN", "").strip()
        if seller_token:
            self.client.headers.update({"Authorization": f"Bearer {seller_token}"})

    @task(4)
    def public_reads(self):
        self.client.get("/api/landing/content", name="GET /api/landing/content")
        self.client.get("/api/marketplace/sellers?limit=20", name="GET /api/marketplace/sellers")
        self.client.get("/api/storefront/demo-store", name="GET /api/storefront/:handle")

    @task(2)
    def seller_reads(self):
        self.client.get("/api/app/bootstrap", name="GET /api/app/bootstrap")
        self.client.get("/api/dashboard/feed", name="GET /api/dashboard/feed")
        self.client.get("/api/dashboard/my-day", name="GET /api/dashboard/my-day")
