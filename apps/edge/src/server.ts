import { startEdge } from "@vibe/build";

const port = Number(process.env.PORT ?? 4100);
const edge = await startEdge({ port });
console.log(`feed:   ${edge.origins.app}/`);
console.log(`games:  ${edge.origins.gameUrlTemplate}`);
console.log(`engine: ${edge.origins.engine}`);
