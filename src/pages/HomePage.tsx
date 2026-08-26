import { PageBody } from "../components/app/PageBody";
import { PageLayout } from "../components/app/PageLayout";
import { Heading } from "../components/base/Heading";
import { Text } from "../components/base/Text";

/**
 * Home entry screen: application title inside the page shell.
 * Temporary landing until routed screens replace it.
 *
 * @returns The home page as a full-height page shell.
 * @example
 * <Route path="/" element={<HomePage />} />
 */
export const HomePage = () => (
	<PageLayout>
		<PageBody as="article" gap="lg" padding="base" alignItems="center" stackItems="evenly">
			<Heading level={1} color="accent" textAlign="center">
				The Quest of the Deal Hunter
			</Heading>
			<Text color="muted">Design System foundation in place. Screens are coming next.</Text>
		</PageBody>
	</PageLayout>
);
