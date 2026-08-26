import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

const elem = document.getElementById("root");
if (!elem) throw new Error("Missing #root element");

createRoot(elem).render(
	<StrictMode>
		<App />
	</StrictMode>
);
