import itemsSpritesheet from "@assets/items-spritesheet.png";
import { PageBody } from "@components/app/PageBody";
import { PageFooter } from "@components/app/PageFooter";
import { PageHeader } from "@components/app/PageHeader";
import { PageLayout } from "@components/app/PageLayout";
import { Heading } from "@components/base/Heading";
import { Text } from "@components/base/Text";
import { VStack } from "@components/layout/VStack";
import { Button } from "@components/ui/Button";
import { SpriteAnimation } from "@components/ui/SpriteAnimation";

import "./StartQuestPage.css";

/**
 * Quest setup screen: lists the items added to the quest and offers to add
 * more or launch the hunt. Reached from the home screen; the "ADD ITEM"
 * screen replaces the empty placeholder once it exists.
 *
 * @returns The quest start page as a full-height page shell.
 * @example
 * <Route path="/start-quest" element={<StartQuestPage />} />
 */
export const StartQuestPage = () => (
	<PageLayout>
		<PageHeader>
			<Heading level={1} size="lg" color="accent">
				What are you hunting?
			</Heading>
			<Text color="muted">Add items to your quest — we'll build the route.</Text>
		</PageHeader>
		<PageBody>
			<VStack
				gap="xl"
				alignItems="center"
				stackItems="center"
				paddingY="xl"
				className="start-quest-quest"
			>
				<SpriteAnimation
					alt="Golden trophy glowing in the dark"
					animations={{ trophy: { from: [0, 0], to: [0, 0] } }}
					className="start-quest-trophy"
					grid="5x5"
					sheet="5x5"
					spritesheet={itemsSpritesheet}
				/>
				<Text color="muted" textAlign="center">
					NO QUEST ITEM ADDED
					<br />
					TAP BELOW TO START
				</Text>
			</VStack>
		</PageBody>
		<PageFooter gap="sm">
			<Button fullWidth variant="outline">
				ADD ITEM
			</Button>
			<Button fullWidth>▶ START QUEST</Button>
		</PageFooter>
	</PageLayout>
);
