const ORG = process.env.ORG_NAME;
const TOKEN = process.env.GITHUB_TOKEN;
const API_BASE = "https://api.github.com";

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

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
  const res = await githubRequest("GET", `/repos/${ORG}/${name}`);
  if (res.status === 404) return false;
  if (res.ok) return true;
  throw new Error(`Error verificando repositorio ${name}: ${res.status}`);
}

async function createRepositoryFromTemplate(templateName, newRepoName) {
  const res = await githubRequest(
    "POST",
    `/repos/${ORG}/${templateName}/generate`,
    {
      owner: ORG,
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

  return res.json(); // { id, name, full_name, clone_url, ... }
}

// -- Función 3: assignTeam --------------------------------------------------
async function assignTeam(repoName, teamSlug, permission = "push") {
  const res = await githubRequest(
    "PUT",
    `/orgs/${ORG}/teams/${teamSlug}/repos/${ORG}/${repoName}`,
    { permission },
  );

  if (!res.ok) {
    throw new Error(
      `Error asignando team ${teamSlug} a ${repoName}: ${res.status}`,
    );
  }
}

// -- Función 4: createRepositoryVariable ------------------------------------
async function createRepositoryVariable(repoName, key, value) {
  const res = await githubRequest(
    "POST",
    `/repos/${ORG}/${repoName}/actions/variables`,
    { name: key, value },
  );

  if (!res.ok) {
    throw new Error(
      `Error creando variable ${key} en ${repoName}: ${res.status}`,
    );
  }
}

// -- Función 5: createRepositorySecret --------------------------------------
// Nota: para secrets reales (no de ejemplo) se requiere cifrar el valor
// con la llave pública del repo (libsodium) antes de enviarlo. Aquí se
// muestra el flujo completo.
async function createRepositorySecret(repoName, key, plainValue) {
  const sodium = require("libsodium-wrappers");
  await sodium.ready;

  const keyRes = await githubRequest(
    "GET",
    `/repos/${ORG}/${repoName}/actions/secrets/public-key`,
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
    `/repos/${ORG}/${repoName}/actions/secrets/${key}`,
    { encrypted_value: encryptedValue, key_id },
  );

  if (!res.ok) {
    throw new Error(
      `Error creando secret ${key} en ${repoName}: ${res.status}`,
    );
  }
}

// -- Función 6: protectMainBranch --------------------------------------------
async function protectMainBranch(repoName) {
  const res = await githubRequest(
    "PUT",
    `/repos/${ORG}/${repoName}/branches/main/protection`,
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
    throw new Error(`Error protegiendo main en ${repoName}: ${res.status}`);
  }
}

module.exports = {
  repositoryExists,
  createRepositoryFromTemplate,
  assignTeam,
  createRepositoryVariable,
  createRepositorySecret,
  protectMainBranch,
};
