import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
	entries: ["src/index.ts", "src/utils.ts"],
	clean: true,
	declaration: "node16",
	rollup: {
		dts: {
			respectExternal: true,
		},
	},
});
