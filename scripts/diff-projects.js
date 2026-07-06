const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function readCurrentProjects() {
  const filePath = path.join(process.cwd(), "projects.json");
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function readPreviousProjects() {
  const beforeSha = process.env.BEFORE_SHA;

  if (!beforeSha || /^0+$/.test(beforeSha)) {
    return [];
  }

  try {
    const raw = execSync(`git show ${beforeSha}:projects.json`, {
      encoding: "utf-8",
    });
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

function getNewProjects() {
  const current = readCurrentProjects();
  const previous = readPreviousProjects();

  const previousNames = new Set(previous.map((p) => p.projectName));

  return current.filter((p) => !previousNames.has(p.projectName));
}

module.exports = { getNewProjects };
