const { getNewProjects } = require("./diff-projects");
const { resolveTemplate } = require("./templates");
const github = require("./github");
const git = require("./git");
const { customizeProject } = require("./customize");

async function processProject(project) {
  const start = Date.now();
  const log = {
    project: project.projectName,
    template: null,
    repo: null,
    timeMs: null,
    error: null,
  };

  try {
    const exists = await github.repositoryExists(project.projectName);

    if (exists) {
      throw new Error(`El repositorio "${project.projectName}" ya existe.`);
    }

    console.log(`Creando proyecto "${project.projectName}"...`);

    const template = resolveTemplate(project.framework);

    console.log(
      `Usando plantilla "${template}" para "${project.projectName}".`,
    );

    log.template = template;

    const repo = await github.createRepositoryFromTemplate(
      template,
      project.projectName,
    );

    console.log(`Repositorio "${project.projectName}" creado en GitHub.`);

    log.repo = repo.full_name;

    const repoDir = git.cloneRepo(repo.clone_url, project.projectName);

    console.log(`Repositorio clonado en "${repoDir}".`);

    customizeProject(repoDir, project);

    git.commit(
      repoDir,
      `chore: personalización inicial para ${project.projectName}`,
    );
    git.push(repoDir);

    const teamSlug = project.team.toLowerCase().replace(/\s+/g, "-");
    await github.assignTeam(project.projectName, teamSlug);

    await github.createRepositoryVariable(
      project.projectName,
      "PROJECT_NAME",
      project.projectName,
    );

    await github.protectMainBranch(project.projectName);

    log.timeMs = Date.now() - start;
    console.log(`✅ ${project.projectName} creado en ${log.timeMs}ms`, log);
  } catch (err) {
    log.error = err.message;
    log.timeMs = Date.now() - start;
    console.error(`❌ Error procesando ${project.projectName}`, log);
  }

  return log;
}

async function main() {
  const newProjects = getNewProjects();

  if (newProjects.length === 0) {
    console.log("No hay proyectos nuevos en projects.json.");
    return;
  }

  console.log(`Se detectaron ${newProjects.length} proyecto(s) nuevo(s).`);

  const results = [];
  for (const project of newProjects) {
    // Secuencial (no Promise.all) para evitar rate-limit de la API de GitHub
    // y para que los logs queden ordenados y legibles.
    const result = await processProject(project);
    results.push(result);
  }

  const failed = results.filter((r) => r.error);
  if (failed.length > 0) {
    console.error(`${failed.length} proyecto(s) fallaron.`);
    process.exitCode = 1;
  }
}

main();
