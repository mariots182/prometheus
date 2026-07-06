module.exports = {
  express: { template: "backend-base" },
  "react-native": { template: "react-native-base" },
};

const templates = require("./templates");

function resolveTemplate(framework) {
  const config = templates[framework];
  if (!config) {
    throw new Error(
      `No existe template configurado para framework "${framework}"`,
    );
  }
  return config.template;
}

module.exports.resolveTemplate = resolveTemplate;
