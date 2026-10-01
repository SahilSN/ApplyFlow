/** Runs only in the active page, after the user clicks the extension. */
export function extractJob() {
  const clean = (html) => {
    const doc = new DOMParser().parseFromString(
      String(html || ""),
      "text/html",
    );
    return doc.body.textContent?.trim() || "";
  };
  const findJob = (value) => {
    if (Array.isArray(value)) {
      for (const entry of value) {
        const found = findJob(entry);
        if (found) return found;
      }
    } else if (value && typeof value === "object") {
      const type = value["@type"];
      if (
        type === "JobPosting" ||
        (Array.isArray(type) && type.includes("JobPosting"))
      )
        return value;
      if (value["@graph"]) return findJob(value["@graph"]);
    }
    return null;
  };
  let job = null;
  for (const script of document.querySelectorAll(
    'script[type="application/ld+json"]',
  )) {
    try {
      job = findJob(JSON.parse(script.textContent));
      if (job) break;
    } catch {
      /* Other structured data can be invalid without affecting capture. */
    }
  }
  const content = document.querySelector(
    '[data-testid="job-description"],#job-description,.job-description,.job__description,section.description,main,article',
  );
  const address = job?.jobLocation?.address || job?.jobLocation?.[0]?.address;
  const location = address
    ? [address.addressLocality, address.addressRegion, address.addressCountry]
        .filter(Boolean)
        .join(", ")
    : "";
  const salary = job?.baseSalary;
  const amount = salary?.value;
  const compensation = amount
    ? [
        salary.currency,
        amount.minValue && amount.maxValue
          ? `${amount.minValue}–${amount.maxValue}`
          : amount.value,
        amount.unitText,
      ]
        .filter(Boolean)
        .join(" ")
    : "";
  return {
    company:
      job?.hiringOrganization?.name ||
      document
        .querySelector('meta[property="og:site_name"]')
        ?.getAttribute("content") ||
      "",
    role:
      job?.title ||
      document.querySelector("h1")?.textContent?.trim() ||
      document.title,
    url: window.location.href,
    description: job?.description
      ? clean(job.description)
      : content?.innerText?.trim() || "",
    location,
    compensation,
  };
}
