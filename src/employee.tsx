import React from "react";
import ReactDOM from "react-dom/client";
import EmployeeView from "./pages/EmployeeView";
import "./index.css";

const root = document.getElementById("root");
if (root) {
    ReactDOM.createRoot(root).render(
        <React.StrictMode>
            <EmployeeView />
        </React.StrictMode>
    );
}
