import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
// Captura o beforeinstallprompt cedo, antes do painel montar.
import "./hooks/useInstallApp";

window.history.scrollRestoration = "manual";
window.scrollTo(0, 0);

createRoot(document.getElementById("root")!).render(<App />);

// PWA: instalável + push de agendamento + página offline (public/sw.js).
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
