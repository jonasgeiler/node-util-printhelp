import {
	type ParseArgsAndPrintHelpConfig,
	printHelp,
} from "../src/printhelp.ts";

const config = {
	usage: "tool [options]",
	allowNegative: true,
	options: {
		c: {
			type: "boolean",
		},
		d: {
			type: "boolean",
		},
		a: {
			type: "boolean",
			default: true,
		},
		b: {
			type: "boolean",
		},
	},
} as const satisfies ParseArgsAndPrintHelpConfig;

/**
 * Utility that sorts the options of a {@link ParseArgsAndPrintHelpConfig}
 * object.
 * @param config - The configuration object.
 * @returns A copy of the configuration object, with its options sorted.
 */
function toSortedConfig<T extends ParseArgsAndPrintHelpConfig>(config: T): T {
	return {
		...config,
		options:
			config.options &&
			Object.fromEntries(
				Object.entries(config.options).toSorted(
					([option1Long, option1], [option2Long, option2]) => {
						if (config.allowNegative) {
							if (option1.type === "boolean" && option1.default === true) {
								option1Long = "no-" + option1Long;
							}
							if (option2.type === "boolean" && option2.default === true) {
								option2Long = "no-" + option2Long;
							}
						}
						return option1Long.localeCompare(option2Long);
					},
				),
			),
	};
}

// Sort config options before passing it to `printHelp`.
printHelp(toSortedConfig(config));
