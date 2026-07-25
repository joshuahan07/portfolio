import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import "./index.css";
import "./site-core.css";
import "./about-cards.css";
import "./about-cinematic.css";
import App from "./App.tsx";
import AboutPreview from "./pages/AboutPreview.tsx";

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, "") || undefined;

createRoot(document.getElementById("root")!).render(
  <BrowserRouter basename={routerBasename}>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/about-preview" element={<AboutPreview />} />
    </Routes>
  </BrowserRouter>,
);
