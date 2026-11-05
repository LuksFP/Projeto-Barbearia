import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
// Captura o beforeinstallprompt cedo, antes do painel montar.
import "./hooks/useInstallApp";
import { isPainelPath, syncPwaHead } from "./lib/pwaHead";

syncPwaHead(window.location.pathname);

window.history.scrollRestoration = "manual";
window.scrollTo(0, 0);

createRoot(document.getElementById("root")!).render(<App />);

// PWA: instalável + push de agendamento + página offline (public/sw.js).
// Só no lado barbeiro: o site do cliente não instala nada.
if ("serviceWorker" in navigator && isPainelPath(window.location.pathname)) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
