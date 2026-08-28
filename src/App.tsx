import { BrowserRouter, Route, Routes } from "react-router";
import { HomePage } from "./pages/HomePage";
import { StartQuestPage } from "./pages/StartQuestPage";

/**
 * Application root: owns the route table. Every screen is a routed page
 * under `src/pages/`, rendered inside the browser history.
 *
 * @returns The router rendering the current page.
 * @example
 * createRoot(elem).render(<StrictMode><App /></StrictMode>);
 */
export const App = () => (
	<BrowserRouter>
		<Routes>
			<Route element={<HomePage />} path="/" />
			<Route element={<StartQuestPage />} path="/start-quest" />
		</Routes>
	</BrowserRouter>
);
