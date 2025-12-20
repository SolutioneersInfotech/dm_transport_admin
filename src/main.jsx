import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <SkeletonTheme baseColor="#1f2937" highlightColor="#374151">
      <App />
    </SkeletonTheme>
  </StrictMode>
);
