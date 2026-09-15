// Snappit uses only Inngest's event client and Node Connect entry points.
// Its optional adapter peers otherwise pull web frameworks and TypeScript into
// pnpm's production worker deployment. Revisit this list if adding an SDK adapter.
module.exports = {
  hooks: {
    readPackage(pkg) {
      if (pkg.name === "inngest") {
        for (const name of ["@sveltejs/kit", "@vercel/node", "aws-lambda", "express", "fastify", "h3", "hono", "koa", "next", "react", "typescript"]) {
          if (pkg.peerDependenciesMeta?.[name]?.optional) {
            delete pkg.peerDependencies[name];
            delete pkg.peerDependenciesMeta[name];
          }
        }
      }
      return pkg;
    },
  },
};
