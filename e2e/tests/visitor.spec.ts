import { expect, test } from "@playwright/test";

test.describe("visitor", () => {
    test("reads the front page, a poem and the poets without an account", async ({ page }) => {
        await page.goto("/");
        await expect(page.getByRole("button", { name: "Verse, home" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Join" }).first()).toBeVisible();

        // the classics are there
        const response = await page.request.get("/api/v1/posts?q=sonnet&size=1");
        const first = (await response.json()).items[0] as { id: string; title: string };
        await page.goto(`/poems/${first.id}`);
        await expect(page.getByRole("heading", { name: first.title })).toBeVisible();

        await page.goto("/poets");
        await expect(page.getByText("William Shakespeare").first()).toBeVisible();
    });

    test("searches", async ({ page }) => {
        await page.goto("/search?q=rose");
        await expect(page.getByRole("searchbox", { name: "Search poems, quotes and poets" })).toHaveValue("rose");
        await expect(page.locator(".verse-card").first()).toBeVisible();
    });

    test("is asked to sign in for member places", async ({ page }) => {
        await page.goto("/chats");
        await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    });
});
