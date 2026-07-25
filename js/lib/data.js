import { el } from "./dom.js";

export class DataLoadError extends Error {
  constructor(url, cause) {
    super(`Could not load ${url}: ${cause}`);
    this.name = "DataLoadError";
    this.url = url;
  }
}

export async function loadRecords(url, checkRecord) {
  let payload;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    payload = await response.json();
  } catch (cause) {
    throw new DataLoadError(url, cause.message);
  }

  if (!Array.isArray(payload)) {
    throw new DataLoadError(url, "expected a top-level JSON array");
  }

  const records = [];
  const skipped = [];

  payload.forEach((record, index) => {
    const problems = checkRecord(record);
    if (problems.length === 0) records.push(record);
    else skipped.push(`record ${index} (${record?.id ?? "no id"}): ${problems.join("; ")}`);
  });

  return { records, skipped };
}

export function renderFailure(container, message) {
  container.replaceChildren(
    el("p", { class: "notice", role: "status", text: message })
  );
}
