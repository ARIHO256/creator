from locust import HttpUser, between, task


class GlobalReadUser(HttpUser):
    wait_time = between(0.5, 2.0)

    @task(4)
    def storefront(self):
        self.client.get("/api/storefront/demo-store", name="GET /api/storefront/:handle")

    @task(3)
    def storefront_listings(self):
        self.client.get(
            "/api/storefront/demo-store/listings?limit=24",
            name="GET /api/storefront/:handle/listings",
        )

    @task(2)
    def taxonomy_tree(self):
        self.client.get("/api/taxonomy/trees", name="GET /api/taxonomy/trees")

    @task(1)
    def landing_page(self):
        self.client.get("/api/dashboard/landing/content", name="GET /api/dashboard/landing/content")
