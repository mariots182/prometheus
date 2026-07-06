const fs = require("fs");
const path = require("path");

function replaceInFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, "utf-8");

  for (const [placeholder, value] of Object.entries(replacements)) {
    content = content.split(placeholder).join(value);
  }

  fs.writeFileSync(filePath, content);
}

function customizePackageJson(repoDir, project) {
  const filePath = path.join(repoDir, "package.json");
  if (!fs.existsSync(filePath)) return;

  const pkg = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  pkg.name = project.projectName.toLowerCase().replace(/\s+/g, "-");
  pkg.description = `Servicio ${project.projectName} — equipo ${project.team}`;

  fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2));
}

function customizeReadme(repoDir, project) {
  replaceInFile(path.join(repoDir, "README.md"), {
    "{{PROJECT_NAME}}": project.projectName,
    "{{TEAM}}": project.team,
  });
}

function customizeEnvExample(repoDir, project) {
  replaceInFile(path.join(repoDir, ".env.example"), {
    "{{PROJECT_NAME}}": project.projectName.toUpperCase().replace(/\s+/g, "_"),
  });
}

function customizeProject(repoDir, project) {
  customizePackageJson(repoDir, project);
  customizeReadme(repoDir, project);
  customizeEnvExample(repoDir, project);

  // Punto de extensión: cada campo nuevo del catálogo (database, orm,
  // docker, ci, testing, lint) puede resolver aquí un módulo adicional.
  // Ver sección "Escalabilidad".
}

module.exports = { customizeProject };
