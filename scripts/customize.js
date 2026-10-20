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

  const lockPath = path.join(repoDir, "package-lock.json");
  if (fs.existsSync(lockPath)) {
    const lock = JSON.parse(fs.readFileSync(lockPath, "utf-8"));
    lock.name = pkg.name;

    if (lock.packages?.[""]) {
      lock.packages[""].name = pkg.name;
    }

    fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2));
  }

  return pkg.name;
}

function replaceProjectName(value, oldName, newName) {
  if (typeof value === "string") {
    return value.replaceAll(oldName, newName);
  }
  if (Array.isArray(value)) {
    return value.map((item) => replaceProjectName(item, oldName, newName));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key.replaceAll(oldName, newName),
        replaceProjectName(item, oldName, newName),
      ]),
    );
  }
  return value;
}

function customizeAngularProject(repoDir, projectName) {
  const filePath = path.join(repoDir, "angular.json");
  if (!fs.existsSync(filePath)) return;

  const angular = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const projectEntry = Object.entries(angular.projects ?? {}).find(([, config]) =>
    Boolean(config?.architect?.build?.options?.outputPath),
  );
  if (!projectEntry) return;

  const [templateProjectName, projectConfig] = projectEntry;
  if (templateProjectName === projectName) return;

  const outputPath = projectConfig.architect.build.options.outputPath;
  if (typeof outputPath === "string") {
    projectConfig.architect.build.options.outputPath = path.posix.join(
      path.posix.dirname(outputPath),
      projectName,
    );
  } else if (outputPath && typeof outputPath.base === "string") {
    outputPath.base = path.posix.join(path.posix.dirname(outputPath.base), projectName);
  }

  angular.projects[projectName] = projectConfig;
  delete angular.projects[templateProjectName];
  const customized = replaceProjectName(angular, templateProjectName, projectName);
  fs.writeFileSync(filePath, JSON.stringify(customized, null, 2));
  return templateProjectName;
}

function customizeSsrScripts(repoDir, previousProjectName, projectName) {
  if (!previousProjectName) return;

  const filePath = path.join(repoDir, "package.json");
  const pkg = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const scripts = pkg.scripts ?? {};
  for (const [scriptName, command] of Object.entries(scripts)) {
    if (scriptName === `serve:ssr:${previousProjectName}`) {
      delete scripts[scriptName];
      scripts[`serve:ssr:${projectName}`] = command.replaceAll(previousProjectName, projectName);
    } else if (typeof command === "string") {
      scripts[scriptName] = command.replaceAll(previousProjectName, projectName);
    }
  }
  pkg.scripts = scripts;
  fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2));
}

function customizeReadme(repoDir, project, templateProjectName, projectName) {
  const replacements = {
    "{{PROJECT_NAME}}": project.projectName,
    "{{TEAM}}": project.team,
  };
  if (templateProjectName) replacements[templateProjectName] = projectName;
  replaceInFile(path.join(repoDir, "README.md"), replacements);
}

function customizeEnvExample(repoDir, project) {
  replaceInFile(path.join(repoDir, ".env.example"), {
    "{{PROJECT_NAME}}": project.projectName.toUpperCase().replace(/\s+/g, "_"),
  });
}

function customizeProject(repoDir, project) {
  const projectName = customizePackageJson(repoDir, project);
  const templateProjectName = customizeAngularProject(repoDir, projectName);
  customizeSsrScripts(repoDir, templateProjectName, projectName);
  customizeReadme(repoDir, project, templateProjectName, projectName);
  customizeEnvExample(repoDir, project);

  // Punto de extensión: cada campo nuevo del catálogo (database, orm,
  // docker, ci, testing, lint) puede resolver aquí un módulo adicional.
  // Ver sección "Escalabilidad".
}

module.exports = { customizeProject };
