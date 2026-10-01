import { test, expect } from "@playwright/test";
import { extractJob } from "../../extension/extract.js";
test("generic and JobPosting extraction preserve job details", async ({
  page,
}) => {
  await page.setContent(
    "<main><h1>Platform Engineer Intern</h1><p>Build reliable systems.</p></main>",
  );
  let result = await page.evaluate(extractJob);
  expect(result.role).toBe("Platform Engineer Intern");
  expect(result.description).toContain("Build reliable systems.");
  await page.setContent(
    `<script type="application/ld+json">${JSON.stringify({ "@graph": [{ "@type": "JobPosting", title: "Research Intern", hiringOrganization: { name: "Example Research" }, description: "<p>Research <strong>useful systems</strong>.</p>", jobLocation: { address: { addressLocality: "Seattle", addressRegion: "WA" } }, baseSalary: { currency: "USD", value: { minValue: 40, maxValue: 50, unitText: "HOUR" } } }] })}</script><main>Ignored generic text</main>`,
  );
  result = await page.evaluate(extractJob);
  expect(result).toMatchObject({
    company: "Example Research",
    role: "Research Intern",
    description: "Research useful systems.",
    location: "Seattle, WA",
    compensation: "USD 40–50 HOUR",
  });
});
test("capture opens a review form without silently saving", async ({
  page,
  request,
}) => {
  const before = await (await request.get("/api/data")).json();
  const payload = {
    company: "Captured Company",
    role: "Engineering Intern",
    description: "A complete captured description.",
    url: "https://example.org/job/1",
    status: "Applied",
  };
  await page.goto(`/capture#${encodeURIComponent(JSON.stringify(payload))}`);
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel("Company", { exact: true })).toHaveValue(
    "Captured Company",
  );
  await expect(page.getByLabel("Job description snapshot")).toHaveValue(
    payload.description,
  );
  const after = await (await request.get("/api/data")).json();
  expect(after.applications.length).toBe(before.applications.length);
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
