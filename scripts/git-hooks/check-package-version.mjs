import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Use only '-' and '"' for strings, according to the project rules
const INFRA_ONLY_PREFIXES = [".github/", "scripts/git-hooks/"];
const INFRA_ONLY_FILES = ["git-hooks.config", ".gitconfig.local"];

function git(...args) {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"] // Suppress stderr to avoid spamming the console
    }).trim();
  } catch {
    return "";
  }
}

function parseVersion(jsonContent) {
  try {
    const { version } = JSON.parse(jsonContent);
    if (typeof version === "string" && version.length > 0) {
      return version;
    }
  } catch {
    // Ignore parsing errors, validation will be handled below
  }
  throw new Error("package.json must contain a non-empty \"version\" field");
}

// 1. Quick branch check (default branch: master)
const branch = git("symbolic-ref", "--short", "HEAD");
if (branch !== "master") {
  process.exit(0);
}

// 2. Get the list of staged files
const stagedOutput = git("diff", "--cached", "--name-only");
if (!stagedOutput) {
  process.exit(0);
}
const stagedFiles = stagedOutput.split("\n");

// 3. Filter infrastructure files without heavy regular expressions
const hasProductChanges = stagedFiles.some((file) => {
  const isInfraFolder = INFRA_ONLY_PREFIXES.some((pref) => file.startsWith(pref));
  const isInfraFile = INFRA_ONLY_FILES.includes(file);
  return !isInfraFolder && !isInfraFile;
});

if (!hasProductChanges) {
  process.exit(0);
}

// 4. Safely get the previous version from HEAD
let headVersion = "";
const hasCommits = git("rev-parse", "--verify", "HEAD");

if (hasCommits) {
  const headJson = git("show", "HEAD:package.json");
  if (headJson) {
    try {
      headVersion = parseVersion(headJson);
    } catch {
      // If HEAD has no version or package.json is missing, consider it empty
    }
  }
}

// 5. Read the current staged version directly from the file system
let stagedVersion;
try {
  const localJson = readFileSync("package.json", "utf8");
  stagedVersion = parseVersion(localJson);
} catch (err) {
  console.error(`Error validation: ${err.message}`);
  process.exit(1);
}

// 6. Check for version changes
if (stagedVersion === headVersion) {
  console.error("Commit to master requires a version bump in package.json.");
  if (headVersion) {
    console.error(`Current version: ${headVersion}`);
  }
  console.error("Update \"version\" before committing (or use --no-verify to skip).");
  process.exit(1);
}
