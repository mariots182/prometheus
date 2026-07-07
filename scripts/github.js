const OWNER = process.env.OWNER_NAME;
const TOKEN = process.env.GITHUB_TOKEN;
const API_BASE = "https://api.github.com";

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function githubRequest(method, endpoint, body) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: {
      ...headers,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return response;
}

async function repositoryExists(name) {
  const res = await githubRequest("GET", `/repos/${OWNER}/${name}`);
  if (res.status === 404) return false;
  if (res.ok) return true;
  throw new Error(`Error verificando repositorio ${name}: ${res.status}`);
}

async function getRepository(name) {
  const res = await githubRequest("GET", `/repos/${OWNER}/${name}`);

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Error consultando repositorio ${name}: ${res.status} ${detail}`);
  }

  return res.json();
}

async function branchExists(repoName, branchName) {
  const res = await githubRequest(
    "GET",
    `/repos/${OWNER}/${repoName}/branches/${branchName}`,
  );

  if (res.status === 404) return false;
  if (res.ok) return true;

  const detail = await res.text();
  throw new Error(
    `Error consultando rama ${branchName} en ${repoName}: ${res.status} ${detail}`,
  );
}

async function waitForRepositoryReady(repoName, maxAttempts = 10) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const repo = await getRepository(repoName);
    const defaultBranch = repo.default_branch;

    if (defaultBranch && (await branchExists(repoName, defaultBranch))) {
      return repo;
    }

    console.log(
      `Repositorio "${repoName}" aún no tiene rama lista. Reintentando (${attempt}/${maxAttempts})...`,
    );
    await sleep(3000);
  }

  throw new Error(
    `El repositorio "${repoName}" no quedó listo después de ${maxAttempts} intentos.`,
  );
}

async function createRepositoryFromTemplate(templateName, newRepoName) {
  const templateOwner = process.env.TEMPLATE_OWNER || OWNER;

  const res = await githubRequest(
    "POST",
    `/repos/${templateOwner}/${templateName}/generate`,
    {
      owner: OWNER,
      name: newRepoName,
      private: true,
      include_all_branches: false,
    },
  );

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(
      `Error creando repo desde template: ${res.status} ${detail}`,
    );
  }

  return res.json();
}

// -- Función 4: createRepositoryVariable ------------------------------------
async function createRepositoryVariable(repoName, key, value) {
  const res = await githubRequest(
    "POST",
    `/repos/${OWNER}/${repoName}/actions/variables`,
    { name: key, value },
  );

  if (!res.ok) {
    throw new Error(
      `Error creando variable ${key} en ${repoName}: ${res.status}`,
    );
  }
}

async function createRepositorySecret(repoName, key, plainValue) {
  const sodium = require("libsodium-wrappers");
  await sodium.ready;

  const keyRes = await githubRequest(
    "GET",
    `/repos/${OWNER}/${repoName}/actions/secrets/public-key`,
  );
  const { key: publicKey, key_id } = await keyRes.json();

  const messageBytes = sodium.from_string(plainValue);
  const keyBytes = sodium.from_base64(
    publicKey,
    sodium.base64_variants.ORIGINAL,
  );
  const encryptedBytes = sodium.crypto_box_seal(messageBytes, keyBytes);
  const encryptedValue = sodium.to_base64(
    encryptedBytes,
    sodium.base64_variants.ORIGINAL,
  );

  const res = await githubRequest(
    "PUT",
    `/repos/${OWNER}/${repoName}/actions/secrets/${key}`,
    { encrypted_value: encryptedValue, key_id },
  );

  if (!res.ok) {
    throw new Error(
      `Error creando secret ${key} en ${repoName}: ${res.status}`,
    );
  }
}

// -- Función 6: protectBranch -------------------------------------------------
async function protectBranch(repoName, branchName) {
  const res = await githubRequest(
    "PUT",
    `/repos/${OWNER}/${repoName}/branches/${branchName}/protection`,
    {
      required_status_checks: null,
      enforce_admins: true,
      required_pull_request_reviews: {
        required_approving_review_count: 1,
      },
      restrictions: null,
      allow_force_pushes: false,
    },
  );

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(
      `Error protegiendo ${branchName} en ${repoName}: ${res.status} ${detail}`,
    );
  }
}

module.exports = {
  repositoryExists,
  getRepository,
  waitForRepositoryReady,
  createRepositoryFromTemplate,
  createRepositoryVariable,
  createRepositorySecret,
  protectBranch,
};
