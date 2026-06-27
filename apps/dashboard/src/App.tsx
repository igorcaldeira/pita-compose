import { useState, useEffect } from "react";

type Service = {
  name: string;
  domain: string;
  port: string;
  desc: string;
  icon: string;
};

type NetStatus = {
  wgHost: string;
  wgReachable: boolean;
};

const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

function serviceUrl(svc: Service): string {
  if (isLocal && svc.port) {
    // Accessed from host machine → use localhost:PORT
    return "//localhost:" + svc.port + (svc.domain.includes("/") ? "/" + svc.domain.split("/").slice(1).join("/") : "");
  }
  // Accessed remotely (VPN / LAN) → use domain
  return "//" + svc.domain;
}

function App() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [netStatus, setNetStatus] = useState<NetStatus | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [configIP, setConfigIP] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.json())
      .then((data) => setServices(data.services))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const refreshNetStatus = () => {
    fetch("/api/network/status")
      .then((r) => r.json())
      .then((data) => {
        setNetStatus(data);
        setConfigIP(data.wgHost);
      })
      .catch(() => setNetStatus(null));
  };

  useEffect(() => {
    refreshNetStatus();
  }, []);

  const saveConfig = async () => {
    setSaving(true);
    setSaveMsg("");
    try {
      const r = await fetch("/api/network/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: configIP }),
      });
      const data = await r.json();
      if (data.success) {
        setSaveMsg("Configurado! wg-easy reiniciado.");
        refreshNetStatus();
      } else {
        setSaveMsg("Erro: " + (data.error || "desconhecido"));
      }
    } catch {
      setSaveMsg("Erro de conexão com o servidor.");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted)",
        }}
      >
        Carregando...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "2rem",
      }}
    >
      {/* Network Status Bar */}
      {netStatus && (
        <div
          style={{
            width: "100%",
            maxWidth: "960px",
            marginBottom: "2rem",
            background: "var(--card-bg)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "1rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: netStatus.wgReachable ? "#22c55e" : "#ef4444",
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
              WG_HOST: <strong style={{ color: "var(--text)" }}>{netStatus.wgHost}</strong>
              {" | "}wg-easy:{" "}
              {netStatus.wgReachable ? (
                <span style={{ color: "#22c55e" }}>online</span>
              ) : (
                <span style={{ color: "#ef4444" }}>offline</span>
              )}
            </span>
            <span
              style={{
                fontSize: "0.7rem",
                padding: "0.15rem 0.5rem",
                borderRadius: "4px",
                background: isLocal ? "rgba(56,189,248,0.15)" : "rgba(34,197,94,0.15)",
                color: isLocal ? "var(--accent)" : "#22c55e",
                border: "1px solid",
                borderColor: isLocal ? "var(--accent)" : "#22c55e",
              }}
            >
              {isLocal ? "local" : "VPN"}
            </span>
          </div>
          <button
            onClick={() => {
              setConfigIP(netStatus.wgHost);
              setSaveMsg("");
              setShowConfig(true);
            }}
            style={{
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "0.5rem 0.75rem",
              fontSize: "1.1rem",
              lineHeight: 1,
              transition: "all 0.2s",
              flexShrink: 0,
            }}
            title="Configurar rede"
          >
            ⚙️
          </button>
        </div>
      )}

      <header style={{ textAlign: "center", marginBottom: "3rem" }}>
        <h1 style={{ fontSize: "2.5rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
          Pita
        </h1>
        <p style={{ color: "var(--text-muted)", marginTop: "0.5rem", fontSize: "1.1rem" }}>
          Painel de Controle
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
            href={serviceUrl(svc)}
            target="_blank"
            rel="noreferrer"
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "1.5rem",
              transition: "all 0.2s ease",
              cursor: "pointer",
              position: "relative",
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
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{svc.icon}</div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.25rem" }}>
              {svc.name}
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>{svc.desc}</p>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "0.65rem",
                marginTop: "0.5rem",
                opacity: 0.6,
                wordBreak: "break-all",
              }}
            >
              {serviceUrl(svc).replace("//", "")}
            </p>
          </a>
        ))}
      </div>

      {/* Config Modal */}
      {showConfig && (
        <div
          onClick={() => setShowConfig(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              padding: "2rem",
              width: "90%",
              maxWidth: "480px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
              }}
            >
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>
                Configurar IP Fixo
              </h2>
              <button
                onClick={() => setShowConfig(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  color: "var(--text-muted)",
                  marginBottom: "0.5rem",
                }}
              >
                IP do servidor (WG_HOST)
              </label>
              <input
                value={configIP}
                onChange={(e) => setConfigIP(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--text)",
                  fontSize: "1rem",
                  outline: "none",
                }}
                placeholder="192.168.10.147"
              />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                O IP fixo evita que o servidor mude de endereço após reinicialização
                ou renovação de DHCP. Para configurar no macOS:
              </p>
              <pre
                style={{
                  marginTop: "0.5rem",
                  padding: "0.75rem",
                  background: "var(--bg)",
                  borderRadius: "8px",
                  fontSize: "0.75rem",
                  color: "var(--accent)",
                  overflowX: "auto",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              >
                {`sudo networksetup -setmanual Wi-Fi \\
  ${configIP || "192.168.10.147"} 255.255.255.0 192.168.10.1
sudo networksetup -setdnsservers Wi-Fi 192.168.10.147`}
              </pre>
            </div>

            {saveMsg && (
              <p
                style={{
                  fontSize: "0.875rem",
                  color: saveMsg.startsWith("Configurado") ? "#22c55e" : "#ef4444",
                  marginBottom: "1rem",
                }}
              >
                {saveMsg}
              </p>
            )}

            <button
              onClick={saveConfig}
              disabled={saving || !configIP}
              style={{
                width: "100%",
                padding: "0.75rem",
                background: saving ? "var(--border)" : "var(--accent)",
                border: "none",
                borderRadius: "8px",
                color: "#0f172a",
                fontSize: "1rem",
                fontWeight: 600,
                cursor: saving ? "not-allowed" : "pointer",
                transition: "all 0.2s",
              }}
            >
              {saving ? "Aplicando..." : "Aplicar e Reiniciar wg-easy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;