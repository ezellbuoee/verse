import { expect, type Page, test } from "@playwright/test";

const PASSWORD = "long-enough-pw";

function uniqueEmail(name: string): string {
    return `${name}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@e2e.verse.test`;
}

async function join(page: Page, name: string): Promise<string> {
    const email = uniqueEmail(name.toLowerCase());
    await page.goto("/join");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel(/Display name/).fill(name);
    await page.getByLabel(/^Password/).fill(PASSWORD);
    await page.getByText("I confirm that I am 18 or older.").click();
    await page.getByRole("button", { name: "Join Verse" }).click();
    await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
    return email;
}

async function signIn(page: Page, email: string, password: string): Promise<void> {
    await page.goto("/signin");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel(/^Password/).fill(password);
    await page.getByRole("main").getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
}

test.describe("member", () => {
    test("joins, writes, hearts, comments, edits the profile and signs out", async ({ page }) => {
        await join(page, "Esi");
        const title = `Harmattan ${Date.now()}`;

        await page.getByRole("button", { name: "✎ Write" }).click();
        await page.getByPlaceholder("Title").fill(title);
        await page
            .getByPlaceholder("Line breaks are kept exactly as you type them")
            .fill("Dust on the sill,\nlight on the wall.");
        await page.getByRole("button", { name: "Publish" }).click();
        await expect(page.getByText("Published. Your words are live.")).toBeVisible();

        // open it from search
        const found = await page.request.get(`/api/v1/posts?q=${encodeURIComponent(title)}`);
        const post = (await found.json()).items[0] as { id: string };
        await page.goto(`/poems/${post.id}`);
        await expect(page.getByRole("heading", { name: title })).toBeVisible();

        await page.getByRole("button", { name: /Give a heart, 0 hearts/ }).click();
        await expect(page.getByRole("button", { name: /Unlike, 1 hearts/ })).toBeVisible();

        await page.getByRole("button", { name: /comment/i, expanded: false }).click();
        await page.getByPlaceholder("Write a comment").fill("Written in one breath.");
        await page.getByRole("button", { name: "Send" }).click();
        await expect(page.getByText("Written in one breath.")).toBeVisible();

        // a reload keeps the member signed in
        await page.reload();
        await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();

        await page.goto("/account");
        await expect(page.getByRole("heading", { name: "My account", exact: true })).toBeVisible();
        // the form fills in once /me has loaded
        await expect(page.getByLabel("Display name")).toHaveValue("Esi");
        await page.getByLabel("Display name").fill("Esi Mensah");
        await page.getByRole("button", { name: "Save profile" }).click();
        await expect(page.getByText("Profile saved.")).toBeVisible();

        await page.getByRole("button", { name: "Log out" }).click();
        await expect(page.getByRole("button", { name: "Sign in" }).first()).toBeVisible();
        const after = await page.request.get(`/api/v1/posts/${post.id}`);
        expect((await after.json()).authorName).toBe("Esi Mensah");
    });

    test("chats with another member", async ({ browser }) => {
        const a = await browser.newPage();
        const b = await browser.newPage();
        const emailB = await join(b, "Kofi");
        const me = await b.evaluate(async () => {
            const token = JSON.parse(localStorage.getItem("verse.token") ?? "{}").accessToken as string;
            const r = await fetch("/api/v1/me", { headers: { Authorization: `Bearer ${token}` } });
            return (await r.json()) as { id: string };
        });
        await join(a, "Ama");
        await a.goto(`/chats/${me.id}`);
        await a.getByPlaceholder("Message Kofi").fill("Did you read the new one?");
        await a.getByRole("button", { name: "Send" }).click();
        await expect(a.getByText("Did you read the new one?")).toBeVisible();

        await b.goto("/chats");
        await expect(b.getByText("Ama")).toBeVisible();
        expect(emailB).toContain("@");
    });

    test("wrong password is refused with a readable message", async ({ page }) => {
        await page.goto("/signin");
        await page.getByLabel("Email").fill("nobody@e2e.verse.test");
        await page.getByLabel(/^Password/).fill("not-the-password");
        await page.getByRole("main").getByRole("button", { name: "Sign in" }).click();
        await expect(page.getByRole("alert")).toContainText("did not match");
    });
});

test.describe("admin", () => {
    test.skip(!!process.env.BASE_URL && !process.env.E2E_ADMIN_EMAIL, "needs E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD");

    test("sees reports and members, and can suspend a member", async ({ page, browser }) => {
        const other = await browser.newPage();
        const email = await join(other, "Yaw");

        await signIn(
            page,
            process.env.E2E_ADMIN_EMAIL ?? "admin@verse.local",
            process.env.E2E_ADMIN_PASSWORD ?? "password"
        );
        await page.getByRole("button", { name: "Reports" }).click();
        await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();

        await page.getByRole("button", { name: "Members" }).click();
        await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();
        await page.getByLabel("Find a member").fill(email);
        const row = page.locator(".verse-member-row", { hasText: email });
        await expect(row).toBeVisible();
        await row.getByRole("button", { name: "Suspend" }).click();
        await expect(row.getByText("suspended")).toBeVisible();

        // the suspended member is signed out on the next request
        await other.goto("/account");
        await expect(other.getByRole("button", { name: "Sign in" }).first()).toBeVisible();
        await row.getByRole("button", { name: "Reactivate" }).click();
        await expect(row.getByText("suspended")).toBeHidden();
    });
});
