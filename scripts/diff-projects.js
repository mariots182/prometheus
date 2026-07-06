const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function readCurrentProjects() {
  const filePath = path.join(process.cwd(), "projects.json");
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function readPreviousProjects() {
  try {
    const raw = execSync("git show HEAD~1:projects.json", {
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
