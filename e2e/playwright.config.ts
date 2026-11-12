import { defineConfig, devices } from "@playwright/test";

/** Runs against a running Verse: the dev setup (default) or any deployment via BASE_URL. */
export default defineConfig({
    testDir: "./tests",
    forbidOnly: !!process.env.CI,
    fullyParallel: false,
    retries: process.env.CI ? 1 : 0,
    reporter: [["list"], ["html", { open: "never" }]],
    use: {
        baseURL: process.env.BASE_URL ?? "http://localhost:8020",
        headless: true,
        trace: "retain-on-failure",
        screenshot: "only-on-failure"
    },
    timeout: 60_000,
    expect: { timeout: 10_000 },
    projects: [
        { name: "desktop", use: { ...devices["Desktop Chrome"] } },
        { name: "phone", use: { ...devices["Pixel 7"] }, testMatch: /visitor\.spec\.ts/ }
    ]
});
