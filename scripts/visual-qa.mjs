import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
const errors = [];
const cdp = await page.context().newCDPSession(page);
await cdp.send("Runtime.enable");
await cdp.send("Log.enable");
cdp.on("Runtime.exceptionThrown", (event) =>
  errors.push(`CDP: ${event.exceptionDetails.text}`),
);
cdp.on("Log.entryAdded", (event) => {
  if (event.entry.level === "error")
    errors.push(`CDP log: ${event.entry.text}`);
});
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
const failed = [];
const external = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("requestfailed", (r) =>
  failed.push(`${r.method()} ${r.url()} ${r.failure()?.errorText}`),
);
page.on("request", (r) => {
  if (!r.url().startsWith("http://127.0.0.1:3000")) external.push(r.url());
});
await page.goto("http://127.0.0.1:3000");
await page.getByRole("heading", { name: "Make your next move." }).waitFor();
const demo = page.getByRole("button", { name: "Explore demo data" });
if (await demo.isVisible()) {
  await demo.click();
  await page
    .getByText(
      "You’re exploring demo data. Your own applications stay separate.",
    )
    .waitFor();
}
mkdirSync("test-results/visual", { recursive: true });
for (const route of [
  "",
  "applications",
  "pipeline",
  "interviews",
  "contacts",
  "documents",
  "answers",
  "analytics",
  "experiments",
  "data",
  "settings",
  "integrations",
]) {
  await page.goto(`http://127.0.0.1:3000/${route}`);
  await page.locator(".page-heading").waitFor();
  await page.screenshot({
    path: `test-results/visual/${route || "overview"}.png`,
    fullPage: true,
  });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  if (overflow) errors.push(`Desktop overflow: ${route}`);
}
await page.setViewportSize({ width: 390, height: 844 });
for (const route of [
  "",
  "applications",
  "pipeline",
  "interviews",
  "contacts",
  "documents",
  "answers",
  "analytics",
  "experiments",
  "data",
  "settings",
]) {
  await page.goto(`http://127.0.0.1:3000/${route}`);
  await page.locator(".page-heading").waitFor();
  await page.screenshot({
    path: `test-results/visual/mobile-${route || "overview"}.png`,
    fullPage: true,
  });
  if (
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    )
  )
    errors.push(`Mobile overflow: ${route}`);
}
await page.setViewportSize({ width: 1440, height: 1080 });
await page.goto("http://127.0.0.1:3000/applications");
await page.locator("tbody .app-link").first().click();
await page.locator(".detail-heading").waitFor();
await page.screenshot({
  path: "test-results/visual/detail.png",
  fullPage: true,
});
await page
  .getByRole("button", { name: "Edit application", exact: true })
  .click();
await page.getByRole("dialog").waitFor();
await page.screenshot({ path: "test-results/visual/edit-dialog.png" });
await page.getByRole("button", { name: "Close dialog" }).click();
await page.goto("http://127.0.0.1:3000/settings");
await page.getByLabel("Appearance", { exact: true }).selectOption("dark");
await page.getByRole("button", { name: "Save changes" }).click();
await page.waitForFunction(
  () => document.documentElement.dataset.theme === "dark",
);
await page.goto("http://127.0.0.1:3000");
await page.locator(".page-heading").waitFor();
await page.screenshot({
  path: "test-results/visual/dark-overview.png",
  fullPage: true,
});
await page.goto("http://127.0.0.1:3000/settings");
await page.getByLabel("Appearance", { exact: true }).selectOption("light");
await page.getByRole("button", { name: "Save changes" }).click();
await page.waitForFunction(
  () => document.documentElement.dataset.theme === "light",
);
console.log(
  JSON.stringify({ errors, failed, external: [...new Set(external)] }, null, 2),
);
await browser.close();
