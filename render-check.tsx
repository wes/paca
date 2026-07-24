// Temporary harness: renders the report screens to plain text.
import { createTestRenderer } from "@opentui/core/testing";
import { createRoot } from "@opentui/react";
import { ReportsView } from "./src/components/ReportsView.tsx";
import { reports } from "./src/db.ts";
import { getTheme } from "./src/types.ts";

const theme = getTheme("catppuccin-mocha");
const WIDTH = Number(process.env.W ?? 118);
const HEIGHT = Number(process.env.H ?? 60);

const data = await reports.build();
const setup = await createTestRenderer({ width: WIDTH, height: HEIGHT });
const root = createRoot(setup.renderer);
root.render(
	<box style={{ width: "100%", height: "100%", flexDirection: "column" }}>
		<ReportsView
			data={data}
			loading={false}
			activeTab={Number(process.argv[2] ?? 0)}
			focused={false}
			theme={theme}
		/>
	</box>,
);
await new Promise((r) => setTimeout(r, 300));
await setup.renderOnce();
await setup.renderOnce();
console.log(setup.captureCharFrame());
process.exit(0);
