# Pitangui Composed — Home Lab

A single-host Docker stack for a self-hosted home lab. Connect via WireGuard VPN and
reach every service by name at `*.lab.local`, with Pi-hole providing DNS + ad-blocking.

## Architecture

```
        phone (WireGuard client, 10.8.0.x)
                  │  split tunnel: only 10.10.0.0/24 routed through VPN
                  ▼
        wg-easy (10.10.0.10)  ── masquerades client traffic onto the lab network
                  │
   ┌──────────────┼───────────────────────────────────────────────┐
   │         lab bridge network 10.10.0.0/24                        │
   │                                                               │
   │  pihole (10.10.0.2)   ← DNS for clients (WG_DEFAULT_DNS)       │
   │     • *.lab.local  → 10.10.0.3 (wildcard, infra/pihole/...)    │
   │     • everything else → 8.8.8.8 / 8.8.4.4                      │
   │                                                               │
   │  caddy  (10.10.0.3)   ← reverse proxy, routes by Host header   │
   │     ├─ vpn.lab.local        → wg-easy:51821                    │
   │     ├─ pihole.lab.local     → pihole:80                        │
   │     ├─ dashboard.lab.local  → dashboard:5173                   │
   │     ├─ ha.lab.local         → homeassistant:8123               │
   │     ├─ portainer.lab.local  → portainer:9000                   │
   │     ├─ code.lab.local       → code-server:8443                 │
   │     └─ files.lab.local      → filebrowser:80                   │
   └───────────────────────────────────────────────────────────────┘
```

**How a request flows:** the phone asks Pi-hole for `ha.lab.local` → Pi-hole returns
`10.10.0.3` (Caddy) for *any* `*.lab.local` → the phone connects to Caddy over the tunnel
→ Caddy proxies to the right container by `Host`. Adding a new service = add one Caddy
block; no DNS change needed (the wildcard already covers it).

## First-time setup

```bash
cd infra
cp .env.example .env        # then edit secrets (see comments in the file)
docker compose up -d
docker compose ps           # all services should be Up / healthy
```

Then create your VPN client in the WG-Easy UI at `http://10.0.0.100:51821`
(or `http://vpn.lab.local` once DNS is up) and scan the QR on your phone.

> **After changing VPN settings** (`WG_DEFAULT_DNS`, `WG_ALLOWED_IPS`, …): wg-easy bakes
> those into a client config at creation time. **Delete and re-create the client**, then
> re-scan the QR — editing files won't update an already-issued config on the phone.

## Remote desktop (RustDesk)

`rustdesk-hbbs` (ID/rendezvous) and `rustdesk-hbbr` (relay) run in the stack and
broker connections between RustDesk **clients** — the server itself doesn't share a
screen. To control this host, run the client on it pointed at our own server.

```bash
infra/scripts/setup-rustdesk-client.sh
```

The script installs the client (brew), writes `RustDesk2.toml` (custom server =
`WG_HOST`, key = `data/rustdesk/id_ed25519.pub`, LAN direct-IP access on), sets a
permanent password (`RUSTDESK_PASSWORD` in `.env`, else prompts), starts it at login
via a LaunchAgent, and prints this machine's RustDesk ID.

> **Manual step (macOS won't let scripts do it):** System Settings → Privacy &
> Security → enable RustDesk under **Screen & System Audio Recording** *and*
> **Accessibility**, then relaunch RustDesk.

**From the laptop (same LAN):** install RustDesk, set the same ID/Relay Server
(`WG_HOST`) and Key under Settings → Network, then connect by ID + password — or,
since direct IP access is on, just type the host's IP.

## Networking notes

- **Split tunnel:** only `10.10.0.0/24` routes through the VPN; normal internet uses the
  phone's own connection. Web browsing still works because Pi-hole (reachable over the
  tunnel) resolves public domains via its upstreams.
- **Remote access (5G / away from home) — deferred.** Today `WG_HOST` is a LAN IP, so the
  VPN only connects on home WiFi. To use it remotely: point `WG_HOST` at a public IP or
  DDNS hostname, port-forward **UDP 51820** on the router, and (to reach other LAN
  machines) add `,192.168.10.0/24` to `WG_ALLOWED_IPS`.
- **Pi-hole listening mode** is `ALL` (set via `FTLCONF_dns_listeningMode`) so it answers
  VPN clients, which arrive from a non-local subnet.

## Reliability (24/7)

- All images are **pinned by digest** in `docker-compose.yml` and the `docker/*/Dockerfile`
  bases — an upstream `:latest` change can't silently break the stack. To update an image:
  `docker pull <repo>:<newtag>`, read the new digest from
  `docker image inspect <repo>:<newtag>`, and replace it here.
- Container logs are capped (`10m × 3`) so they can't fill the disk over months.
- `restart: unless-stopped` on every service. Enable Docker on boot so the stack returns
  after a power cut: `sudo systemctl enable docker`.

## Moving to another machine (portability)

Everything needed to rebuild lives in this repo plus two gitignored items:

1. Copy the whole repo (compose + Caddyfile + Dockerfiles + `infra/pihole/dnsmasq.d/`).
2. Copy `infra/.env` (secrets) and the `data/` directory (Pi-hole DB, **wg-easy keys**,
   Home Assistant state, etc.).
3. On the new host: `cd infra && docker compose up -d`.

Preserving `data/wg-easy` keeps existing phone configs valid. If you lose it, every client
must be re-created and re-scanned.

```
data/   → runtime state & secrets (gitignored) — back this up
infra/  → compose, Caddyfile, pinned Dockerfiles, committed DNS config (in git)
apps/   → dashboard source
```
