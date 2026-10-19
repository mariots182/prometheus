const templates = {
  express: { template: "backend-base" },
  angular: { template: "frontend-base" },
};

function resolveTemplate(framework) {
  const config = templates[framework];

  if (!config) {
    throw new Error(
      `No existe template configurado para framework "${framework}"`,
    );
  }

  return config.template;
}

module.exports = {
  templates,
  resolveTemplate,
};
