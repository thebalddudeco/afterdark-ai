import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "../app/page";
import "../app/globals.css";

const root = document.getElementById("root");

if (!root) throw new Error("Shadowframe AI could not find its page root.");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
