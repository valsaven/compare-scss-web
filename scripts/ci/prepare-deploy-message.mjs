import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Using only '-' and '"' for strings according to project standards
const VERSION_SUBJECT = /^v(\d+\.\d+\.\d+)$/;
const SOURCE_SHA = /(?:^|\s)([a-f0-9]{40})\s*$/;
const COMMIT_SEP = "===COMMIT_SEP===";

function git(...args) {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return "";
  }
}

function parseReleaseCommit(message) {
  if (!message) {
    return null;
  }

  const lines = message.split("\n");
  const subject = lines[0] ?? "";
  const match = subject.match(VERSION_SUBJECT);
  if (!match) {
    return null;
  }

  // Safely extract body lines if they exist
  const body = lines.slice(1)
    .join("\n")
    .replace(SOURCE_SHA, "")
    .trim();

  return { version: match[1], body };
}

function compareVersions(a, b) {
  // Using native localeCompare with numeric options for clean semantic version checking
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function findAnchorSha(lastWebVersion, webRef = "web") {
  const webBody = git("log", "-1", "--format=%B", webRef);
  const shaMatch = webBody.match(SOURCE_SHA);
  if (shaMatch) {
    return shaMatch[1];
  }

  // Optimize log reading: get all master commits matching the pattern in one go
  const logLines = git("log", "master", "--format=%H %s").split("\n");
  const targetSubject = `v${lastWebVersion}`;

  for (const line of logLines) {
    const spaceIndex = line.indexOf(" ");
    if (spaceIndex !== -1 && line.slice(spaceIndex + 1) === targetSubject) {
      return line.slice(0, spaceIndex);
    }
  }

  return null;
}

function formatReleaseSection({ version, body }) {
  if (!body) {
    return `v${version}:`;
  }

  const lines = body.split("\n").filter(Boolean);
  const normalized = lines.map((line) => (line.startsWith("- ") ? line : `- ${line}`));

  return [`v${version}:`, ...normalized].join("\n");
}

function collectReleaseCommits(range) {
  // Fix N+1 problem: retrieve all commit bodies in a single Git call using a separator
  const rawLog = git("log", range, "--reverse", `--format=%B%n${COMMIT_SEP}`);
  if (!rawLog) {
    return [];
  }

  return rawLog
    .split(`${COMMIT_SEP}\n`)
    .map((raw) => raw.trim())
    .map(parseReleaseCommit)
    .filter(Boolean);
}

function main() {
  let currentVersion = "0.0.0";
  try {
    currentVersion = JSON.parse(readFileSync("package.json", "utf8")).version;
  } catch {
    // Fallback if package.json is missing or invalid
  }

  const webRef = process.env.DEPLOY_WEB_REF ?? "web";
  let lastWebVersion = null;
  let anchorSha = null;

  const hasWebRef = git("rev-parse", "--verify", webRef);
  if (hasWebRef) {
    const webSubject = git("log", "-1", "--format=%s", webRef);
    const webVersionMatch = webSubject.match(VERSION_SUBJECT);
    lastWebVersion = webVersionMatch?.[1] ?? null;
    anchorSha = lastWebVersion ? findAnchorSha(lastWebVersion, webRef) : null;
  }

  const range = anchorSha ? `${anchorSha}..HEAD` : "HEAD";
  const commits = collectReleaseCommits(range).filter(({ version }) =>
    lastWebVersion ? compareVersions(version, lastWebVersion) > 0 : true,
  );

  let sectionsContent;
  if (commits.length > 0) {
    sectionsContent = commits.map(formatReleaseSection).join("\n\n");
  } else {
    const headCommit = parseReleaseCommit(git("log", "-1", "--format=%B"));
    sectionsContent = headCommit ? formatReleaseSection(headCommit) : "";
  }

  const message = [`v${currentVersion}`, "", sectionsContent].join("\n");
  process.stdout.write(`${message}\n`);
}

main();
