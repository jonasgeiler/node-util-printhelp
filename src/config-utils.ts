import type { ParseArgsOptionsConfig } from "node:util";

/**
 * Check if the given object is a valid non-undefined, non-empty options object
 * from a {@link import("node:util").parseArgs} configuration.
 * @param options
 */
export function isValidParseArgsConfigOptions(
	options: ParseArgsOptionsConfig | undefined,
): options is ParseArgsOptionsConfig {
	if (!options) {
		return false;
	}
	for (const key in options) {
		if (Object.hasOwn(options, key)) {
			return true;
		}
	}
	return false;
}
