import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { readFileSync, writeFileSync } from "fs";
import { load } from "js-yaml";
import type { Plugin } from "vite";
import * as http from "http";

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
              domain: svc.labels["pitangui.dashboard.url"] || "",
              port: svc.labels["pitangui.dashboard.port"] || "",
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

function networkPlugin(): Plugin {
  return {
    name: "network-api",
    configureServer(server) {
      server.middlewares.use("/api/network/status", async (_req, res) => {
        try {
          const envContent = readFileSync("/infra/.env", "utf-8");
          const match = envContent.match(/^WG_HOST=(.+)$/m);
          const wgHost = match ? match[1].trim() : "não configurado";

          let wgReachable = false;
          try {
            const ctrl = new AbortController();
            setTimeout(() => ctrl.abort(), 3000);
            const r = await fetch("http://host.docker.internal:51821", { signal: ctrl.signal });
            wgReachable = r.ok || r.status === 200;
          } catch {}

          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ wgHost, wgReachable }));
        } catch (e: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: e.message }));
        }
      });

      server.middlewares.use("/api/network/config", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        let body = "";
        req.on("data", (chunk: string) => (body += chunk));
        req.on("end", async () => {
          try {
            const { ip } = JSON.parse(body);
            if (!ip) throw new Error("IP não informado");

            let envContent = readFileSync("/infra/.env", "utf-8");
            if (/^WG_HOST=/m.test(envContent)) {
              envContent = envContent.replace(/^WG_HOST=.+$/m, `WG_HOST=${ip}`);
            } else {
              envContent += `\nWG_HOST=${ip}`;
            }
            writeFileSync("/infra/.env", envContent);

            const dockerErr = await dockerRestart("wg-easy");

            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({
              success: !dockerErr,
              ip,
              restartError: dockerErr || undefined,
            }));
          } catch (e: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
        });
      });
    },
  };
}

function dockerRestart(container: string): Promise<string | null> {
  return new Promise((resolve) => {
    const req = http.request(
      {
        socketPath: "/var/run/docker.sock",
        path: `/containers/${container}/restart`,
        method: "POST",
        timeout: 15000,
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          if (res.statusCode && res.statusCode < 300) resolve(null);
          else resolve(data || `HTTP ${res.statusCode}`);
        });
      }
    );
    req.on("error", (e) => resolve(e.message));
    req.end();
  });
}

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "pwa-icon.svg"],
      devOptions: { enabled: true },
      manifest: {
        name: "Pita - Painel de Controle",
        short_name: "Pita",
        description: "Painel de controle da infraestrutura Pitangui Composed",
        theme_color: "#6366f1",
        background_color: "#0f0f0f",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/pwa-icon.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "/pwa-icon.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,ico}"],
        runtimeCaching: [
          {
            urlPattern: /^\/api\/services/,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 300 },
            },
          },
        ],
      },
    }),
    servicesPlugin(),
    networkPlugin(),
  ],
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: true,
  },
});
