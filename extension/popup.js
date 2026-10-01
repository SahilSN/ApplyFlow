/* global chrome */
import { extractJob } from "./extract.js";
const form = document.getElementById("capture");
const error = document.getElementById("error");
function showError(message) {
  error.textContent = message;
  error.hidden = false;
}
try {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const [result] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: extractJob,
  });
  for (const [key, value] of Object.entries(result.result || {})) {
    const field = form.elements.namedItem(key);
    if (field) field.value = String(value);
  }
  document.getElementById("capture-note").textContent =
    "Extraction can be imperfect. Check company, role, and description before continuing.";
} catch {
  showError(
    "This page cannot be read automatically. Enter the job details below, or use the extension on a regular job listing.",
  );
}
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  data.status = event.submitter?.value || "Saved";
  if (String(data.description).length > 100000) {
    showError(
      "The description exceeds 100,000 characters. Shorten it before saving.",
    );
    return;
  }
  await chrome.tabs.create({
    url: `http://127.0.0.1:3000/capture#${encodeURIComponent(JSON.stringify(data))}`,
  });
  window.close();
});
