const { execSync } = require("child_process");
const path = require("path");
const os = require("os");
const fs = require("fs");

function cloneRepo(cloneUrl, repoName) {
  const tmpDir = path.join(os.tmpdir(), `catalog-${repoName}-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  const authenticatedUrl = cloneUrl.replace(
    "https://",
    `https://x-access-token:${process.env.GITHUB_TOKEN}@`,
  );

  execSync(`git clone ${authenticatedUrl} ${tmpDir}`, { stdio: "inherit" });
  return tmpDir;
}

function commit(repoDir, message) {
  execSync(`git -C ${repoDir} add -A`, { stdio: "inherit" });

  const hasChanges = execSync(`git -C ${repoDir} status --porcelain`, {
    encoding: "utf-8",
  }).trim();

  if (!hasChanges) {
    console.log("No hay cambios para commitear.");
    return false;
  }

  execSync(
    `git -C ${repoDir} -c user.name="catalog-bot" -c user.email="bot@empresa.com" commit -m "${message}"`,
    {
      stdio: "inherit",
    },
  );

  return true;
}

function push(repoDir, branch = "main") {
  execSync(`git -C ${repoDir} push origin ${branch}`, { stdio: "inherit" });
}

module.exports = { cloneRepo, commit, push };
