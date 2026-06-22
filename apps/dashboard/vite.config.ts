import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";
import { load } from "js-yaml";
import type { Plugin } from "vite";

function servicesPlugin(): Plugin {
  return {
    name: "services-api",
    configureServer(server) {
      server.middlewares.use("/api/services", (_req, res) => {
        try {
          const compose = load(readFileSync("/infra/docker-compose.yml", "utf-8")) as any;
          const services = Object.entries(compose.services || {})
            .filter(([, svc]: [string, any]) => svc.labels?.["pitangui.dashboard.enabled"] === "true")
            .map(([, svc]: [string, any]) => ({
              name: svc.labels["pitangui.dashboard.display"] || "",
              url: "//" + (svc.labels["pitangui.dashboard.url"] || ""),
              desc: svc.labels["pitangui.dashboard.desc"] || "",
              icon: svc.labels["pitangui.dashboard.icon"] || "",
            }));
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ services }));
        } catch (e: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: e.message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), servicesPlugin()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: true,
  },
});
