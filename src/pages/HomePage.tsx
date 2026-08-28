import tokyoRoad from "@assets/tokyo-road.png";
import { PageBody } from "@components/app/PageBody";
import { PageFooter } from "@components/app/PageFooter";
import { PageLayout } from "@components/app/PageLayout";
import { Heading } from "@components/base/Heading";
import { Text } from "@components/base/Text";
import { VStack } from "@components/layout/VStack";
import { Button } from "@components/ui/Button";
import { SpriteAnimation } from "@components/ui/SpriteAnimation";
import { useNavigate } from "react-router";

import "./HomePage.css";

/**
 * Home entry screen: animated Tokyo road behind the application title and
 * the entry point of the quest flow. "PRESS START" opens the quest setup.
 *
 * @returns The home page as a full-height page shell.
 * @example
 * <Route path="/" element={<HomePage />} />
 */
export const HomePage = () => {
	const navigate = useNavigate();

	return (
		<PageLayout className="home-page">
			<SpriteAnimation
				alt="Night flight over an empty road toward Tokyo"
				animations={{ cruise: { from: [0, 0], to: [2, 0], fps: 6 } }}
				className="home-skyline"
				spritesheet={tokyoRoad}
				grid="90x160"
				play="cruise"
			/>
			<PageBody>
				<VStack gap="xl" alignItems="center" stackItems="evenly" className="home-content">
					<Heading level={1} color="accent" shadow="primary" textAlign="center">
						The Quest of the Deal Hunter
					</Heading>
					<Text color="muted">Design System foundation in place. Screens are coming next.</Text>
				</VStack>
			</PageBody>
			<PageFooter>
				<Button fullWidth onClick={() => navigate("/start-quest")}>
					▶ PRESS START
				</Button>
			</PageFooter>
		</PageLayout>
	);
};
