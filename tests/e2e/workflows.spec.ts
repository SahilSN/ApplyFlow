import { test, expect } from "@playwright/test";
test.describe.configure({ mode: "serial" });
test("application lifecycle, documents, interview, history and analytics", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByText("A fresh start for your search")).toBeVisible();
  await page
    .getByRole("button", { name: "Add application", exact: true })
    .click();
  await page.getByLabel("Company", { exact: true }).fill("Browser Test Co");
  await page.getByLabel("Role title").fill("Software Engineer Intern");
  await page.getByLabel("Status", { exact: true }).selectOption("Applied");
  await page
    .getByLabel("Job description snapshot")
    .fill("Build thoughtful products with a small engineering team.");
  await page.getByRole("button", { name: "Create application" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/applications");
  await page
    .getByRole("link", { name: "B Browser Test Co Software Engineer Intern" })
    .click();
  await page.getByLabel("Application status").selectOption("Interview");
  await expect(
    page.getByText("Applied → Interview", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Application status")).toHaveValue("Interview");
  await page.getByRole("button", { name: "Upload a new document" }).click();
  await page.getByLabel("Document name").fill("Engineering resume");
  await page.locator("input[type=file]").setInputFiles({
    name: "resume.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Original resume contents"),
  });
  await page.getByRole("button", { name: "Save version" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByLabel("Choose document version")
    .selectOption({ label: "Engineering resume · v1" });
  await page.getByRole("button", { name: "Attach exact version" }).click();
  await expect(
    page.getByText("Attached Engineering resume · v1"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add round", exact: true }).click();
  await page.getByLabel("Round type").selectOption("Technical interview");
  await page.getByLabel("Date & time (local)").fill("2027-01-15T10:00");
  await page
    .getByLabel("Preparation checklist")
    .fill("Review projects\nPractice graphs");
  await page.getByRole("button", { name: "Create interview" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByLabel("Review projects", { exact: true }).check();
  await expect(
    page.getByLabel("Review projects", { exact: true }),
  ).toBeChecked();
  await page.getByLabel("Application status").selectOption("Offer");
  await expect(
    page.getByText("Interview → Offer", { exact: true }),
  ).toBeVisible();
  await page.goto("/analytics");
  await expect(page.getByText("100%", { exact: true }).first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "The shape of your search" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("CSV mapping, invalid preview, duplicate reporting and persistence", async ({
  page,
}) => {
  await page.goto("/data");
  await page.getByLabel("CSV file").setInputFiles({
    name: "invalid.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("Company,Position,Status\n,Intern,Unknown"),
  });
  await expect(
    page.getByRole("button", { name: "Import 1 reviewed rows" }),
  ).toBeDisabled();
  await page.getByLabel("CSV file").setInputFiles({
    name: "jobs.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "Employer,Position,Status,Date Applied\nCSV Labs,Data Intern,Applied,2026-09-01\nCSV Labs,Data Intern,Applied,2026-09-01",
    ),
  });
  await expect(
    page.getByRole("button", { name: "Import 2 reviewed rows" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Import 2 reviewed rows" }).click();
  await expect(
    page.getByText("1 applications imported. 1 duplicates skipped."),
  ).toBeVisible();
  await page.goto("/applications");
  await page.getByLabel("Search applications").fill("CSV Labs");
  await expect(
    page.getByRole("link", { name: "C CSV Labs Data Intern" }),
  ).toHaveCount(1);
  await page.reload();
  await expect(page.getByText("CSV Labs", { exact: true })).toBeVisible();
});
test("pointer drag moves a pipeline card and persists", async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1080 });
  await page.goto("/pipeline");
  const handle = page.getByRole("button", {
    name: "Move CSV Labs application",
  });
  const target = page.locator(".kanban-column").filter({
    has: page.locator("header .badge", { hasText: "Online Assessment" }),
  });
  await handle.scrollIntoViewIfNeeded();
  const source = await handle.boundingBox();
  await target.scrollIntoViewIfNeeded();
  const destination = await target.boundingBox();
  expect(source).toBeTruthy();
  expect(destination).toBeTruthy();
  await handle.scrollIntoViewIfNeeded();
  const current = await handle.boundingBox();
  await page.mouse.move(
    current!.x + current!.width / 2,
    current!.y + current!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(current!.x + 20, current!.y + 20, { steps: 4 });
  await page.mouse.move(destination!.x + 80, destination!.y + 140, {
    steps: 15,
  });
  await page.mouse.up();
  await expect(target.getByText("CSV Labs", { exact: true })).toBeVisible();
  await page.reload();
  await expect(target.getByText("CSV Labs", { exact: true })).toBeVisible();
});
test("contacts, answers, experiments, email confirmation and mobile navigation", async ({
  page,
}) => {
  await page.goto("/contacts");
  await page.getByRole("button", { name: "Add contact" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Jordan Chen");
  await page.getByLabel("Company", { exact: true }).fill("Browser Test Co");
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Record interaction" }).click();
  await page
    .getByLabel("What did you discuss?")
    .fill("Talked about internship opportunities.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("1 interactions")).toBeVisible();
  await page.goto("/answers");
  await page.getByRole("button", { name: "Add answer" }).click();
  await page
    .getByLabel("Question", { exact: true })
    .fill("Why do you want to join this team?");
  await page
    .getByLabel("Your answer")
    .fill(
      "I care about reliable, usable software and would love to contribute.",
    );
  await page.getByRole("button", { name: "Create answer" }).click();
  await expect(
    page.getByRole("heading", { name: "Why do you want to join this team?" }),
  ).toBeVisible();
  await page.goto("/experiments");
  await page.getByRole("button", { name: "New experiment" }).click();
  await page.getByLabel("Experiment name").fill("Resume comparison");
  await page.getByLabel("Control condition").fill("Original");
  await page.getByLabel("Experimental condition").fill("Revised");
  await page.getByLabel("Cohort for Browser Test Co").selectOption("treatment");
  await page.getByLabel("Cohort for CSV Labs").selectOption("control");
  await page.getByRole("button", { name: "Create experiment" }).click();
  await expect(page.getByText("+100 pp")).toBeVisible();
  await page.goto("/integrations");
  await page.getByRole("button", { name: "Review an email" }).click();
  await page
    .getByLabel("Related application")
    .selectOption({ label: "CSV Labs · Data Intern" });
  await page
    .getByLabel("Subject", { exact: true })
    .fill("Interview invitation");
  await page
    .getByLabel("Email text")
    .fill("We would like to invite you to an interview.");
  await page.getByRole("button", { name: "Detect suggested update" }).click();
  await expect(page.getByText("CSV Labs · Pending")).toBeVisible();
  await page.getByRole("button", { name: "Confirm update" }).click();
  await expect(page.getByText("CSV Labs · Confirmed")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Make your next move." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Documents", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "The right version. Every time." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/mobile-documents.png",
    fullPage: true,
  });
});
test("security rejects cross-origin writes and accepts local read", async ({
  request,
}) => {
  const response = await request.post("/api/data", {
    headers: { Origin: "https://evil.example" },
    data: { action: "demo", payload: {} },
  });
  expect(response.status()).toBe(403);
  expect((await request.get("/api/data")).status()).toBe(200);
});
