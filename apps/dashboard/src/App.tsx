const services = [
  { name: "WG-Easy", url: "//vpn.lab.local", desc: "WireGuard VPN" },
  { name: "Pi-hole", url: "//pihole.lab.local", desc: "DNS & Ad Blocker" },
  { name: "Home Assistant", url: "//ha.lab.local", desc: "Automação Residencial" },
  { name: "OpenCode", url: "//opencode.lab.local", desc: "Agente de Código AI" },
  { name: "Portainer", url: "//portainer.lab.local", desc: "Gerenciamento Docker" },
  { name: "Code Server", url: "//code.lab.local", desc: "VS Code no Navegador" },
  { name: "FileBrowser", url: "//files.lab.local", desc: "Gerenciador de Arquivos" },
  { name: "Gitea", url: "//git.lab.local", desc: "Git Self-Hosted" },
  { name: "RustDesk", url: "//rustdesk.lab.local", desc: "Acesso Remoto" },
];

function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <header style={{ textAlign: "center", marginBottom: "3rem" }}>
        <h1 style={{ fontSize: "2.5rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
          Painel de Controle
        </h1>
        <p style={{ color: "var(--text-muted)", marginTop: "0.5rem", fontSize: "1.1rem" }}>
          Servidor Lab
        </p>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: "1rem",
          width: "100%",
          maxWidth: "960px",
        }}
      >
        {services.map((svc) => (
          <a
            key={svc.name}
            href={svc.url}
            target="_blank"
            rel="noreferrer"
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "1.5rem",
              transition: "all 0.2s ease",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.transform = "none";
            }}
          >
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.25rem" }}>
              {svc.name}
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>{svc.desc}</p>
          </a>
        ))}
      </div>
    </div>
  );
}

export default App;
