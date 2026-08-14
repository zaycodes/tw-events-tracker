// Turns a public submission from /submit into a GitHub issue labeled
// "event-submission", so both the web form and the GitHub issue template
// feed the same moderation queue. A maintainer reviews the issue and adds
// the "approved" label; the issue-to-pr workflow takes it from there.
const REQUIRED_FIELDS = ["name", "url", "organizer", "format", "startDate"];

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const body = event.isBase64Encoded
    ? Buffer.from(event.body || "", "base64").toString("utf8")
    : event.body || "";
  const params = new URLSearchParams(body);

  // Honeypot: real users never fill this in.
  if ((params.get("bot-field") || "").trim() !== "") {
    return redirectTo("/submit/thanks");
  }

  const fields = {
    name: (params.get("name") || "").trim(),
    url: (params.get("url") || "").trim(),
    organizer: (params.get("organizer") || "").trim(),
    format: (params.get("format") || "").trim(),
    location: (params.get("location") || "").trim(),
    startDate: (params.get("startDate") || "").trim(),
    endDate: (params.get("endDate") || "").trim(),
    cfpDeadline: (params.get("cfpDeadline") || "").trim(),
    registrationDeadline: (params.get("registrationDeadline") || "").trim(),
    cost: (params.get("cost") || "").trim(),
    tags: (params.get("tags") || "").trim(),
    description: (params.get("description") || "").trim(),
    submitterContact: (params.get("submitterContact") || "").trim(),
  };

  const missing = REQUIRED_FIELDS.filter((key) => !fields[key]);
  if (missing.length > 0) {
    return redirectTo(`/submit?error=missing_fields`);
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO || "zaycodes/tw-events-tracker";
  if (!token) {
    console.error("GITHUB_TOKEN is not set");
    return redirectTo("/submit?error=1");
  }

  const issueBody = [
    `**Event name:** ${fields.name}`,
    `**URL:** ${fields.url}`,
    `**Organizer:** ${fields.organizer}`,
    `**Format:** ${fields.format}`,
    fields.location && `**Location:** ${fields.location}`,
    `**Start date:** ${fields.startDate}`,
    fields.endDate && `**End date:** ${fields.endDate}`,
    fields.cfpDeadline && `**CFP deadline:** ${fields.cfpDeadline}`,
    fields.registrationDeadline && `**Registration deadline:** ${fields.registrationDeadline}`,
    fields.cost && `**Cost:** ${fields.cost}`,
    fields.tags && `**Tags:** ${fields.tags}`,
    fields.description && `\n${fields.description}`,
    "\n---",
    "Submitted via the website form.",
    fields.submitterContact && `Submitter contact: ${fields.submitterContact}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: "POST",
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "tw-events-tracker-submit-form",
      },
      body: JSON.stringify({
        title: `Event submission: ${fields.name}`,
        body: issueBody,
        labels: ["event-submission"],
      }),
    });

    if (!res.ok) {
      console.error(`GitHub API error (${res.status}): ${await res.text()}`);
      return redirectTo("/submit?error=1");
    }

    return redirectTo("/submit/thanks");
  } catch (err) {
    console.error("GitHub API request failed:", err);
    return redirectTo("/submit?error=1");
  }
}

function redirectTo(location) {
  return {
    statusCode: 303,
    headers: { Location: location },
    body: "",
  };
}
