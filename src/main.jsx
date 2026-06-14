import React from "react";
import { createRoot } from "react-dom/client";
import EnduranceCoach from "./EnduranceCoach.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <EnduranceCoach />
  </React.StrictMode>
);
