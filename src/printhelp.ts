import type { WriteStream as TTYWriteStream } from "node:tty";
// noinspection ES6UnusedImports
import {
	type ParseArgsConfig,
	type ParseArgsOptionDescriptor,
	styleText,
} from "node:util";
import { deduceCLIName } from "./argv-utils.ts";
import { indentText, wrapText } from "./text-utils.ts";

/**
 * An extension of {@link ParseArgsOptionDescriptor} which allows setting help
 * text information for {@link printHelp}.
 */
export interface ParseArgsAndPrintHelpOptionDescriptor
	extends ParseArgsOptionDescriptor {
	/**
	 * A description of the option, printed next to this option in the help text.
	 */
	description?: string | undefined;
}

/**
 * A mapping of long option names to
 * {@link ParseArgsAndPrintHelpOptionDescriptor} values, adapted from
 * {@link import("node:util").ParseArgsOptionsConfig}.
 */
export interface ParseArgsAndPrintHelpOptionsConfig {
	[longOption: string]: ParseArgsAndPrintHelpOptionDescriptor;
}

/**
 * An extension of {@link ParseArgsConfig} which allows setting help text
 * information for {@link printHelp}.
 */
export interface ParseArgsAndPrintHelpConfig extends ParseArgsConfig {
	/**
	 * Usage information for positional arguments appended to the usage string of
	 * the help text.
	 */
	usage?: string | string[] | undefined;
	/**
	 * A header for the help text, printed before the usage string in the
	 * help text.
	 */
	header?: string | undefined;
	/**
	 * A footer for the help text, printed after the options listing in the
	 * help text.
	 */
	footer?: string | undefined;

	/**
	 * Used to describe arguments known to the parser.
	 */
	options?: ParseArgsAndPrintHelpOptionsConfig | undefined;
}

/**
 * Additional options accepted by {@link printHelp}.
 */
export interface AdditionalPrintHelpOptions {
	/**
	 * A TTY stream where the help text will be written to.
	 * Also used to validate if colors can be used and how many columns the
	 * help text can be wide.
	 * @default process.stdout
	 */
	stream?: NodeJS.WritableStream | undefined;
	// TODO: Maybe add `ignoreErrors`, similar to `new Console()` options?
	// TODO: Maybe add `validateStream`, passed along to `styleText`? Or maybe `colorMode`, similar to `new Console()` options?
}

/**
 * Print help text for the given `util.parseArgs` configuration, formatted
 * for the given TTY stream.
 * @param config {@link ParseArgsAndPrintHelpConfig}
 * @param additionalOptions {@link AdditionalPrintHelpOptions}
 */
export function printHelp(
	config: ParseArgsAndPrintHelpConfig,
	{ stream = process.stdout }: AdditionalPrintHelpOptions = {},
	// TODO: Maybe return the return value of `stream.write()`?
) {
	// Inspired by: https://github.com/nodejs/node/blob/99f0ddef2ecfaf21f61a4a2b8643944f6ddab538/lib/internal/main/print_help.js
	// With some learnings from: https://github.com/nodejs/node/blob/99f0ddef2ecfaf21f61a4a2b8643944f6ddab538/lib/internal/util/parse_args/parse_args.js

	/** This is the string that gets printed at the end. */
	let help = "";

	// Get TTY width, respecting the `COLUMNS` environment variable if it exists.
	// Use 75 % of the available TTY width, and at least 70 characters.
	let columns = Number(process.env.COLUMNS);
	if (!Number.isSafeInteger(columns) || columns <= 0) {
		columns = (stream as TTYWriteStream).columns || 1;
	}
	const width = Math.max(70, columns * 0.75);

	// Text styling helpers for the given TTY stream.
	const bold = (text: string) =>
		styleText("bold", text, {
			stream,
		});
	const boldGreen = (text: string) =>
		styleText(["bold", "green"], text, {
			stream,
		});

	// Add an optional header to the help text.
	if (config.header) {
		help += wrapText(config.header, width) + "\n\n";
	}

	// Add a usage string to the help text.
	let usage = Array.isArray(config.usage)
		? //                                  7 == "Usage: ".length
			indentText(config.usage.join("\n"), 7).trimStart()
		: config.usage;
	usage ||= deduceCLIName() + " [options]";
	help += bold("Usage: " + usage) + "\n";

	// Calling `Object.entries` on a potentially empty object is acceptable,
	// since it's very rare.
	const options = Object.entries(config.options || {});
	if (options.length) {
		// Calculate optimal first column width.
		let firstColumnWidth = Math.floor(width * 0.4);
		let maxFirstColumnUsed = 0;
		for (const [optionLong, option] of options) {
			//                    4 == ("  " + "--").length
			let firstColumnUsed = 4 + optionLong.length;
			if (
				config.allowNegative &&
				option.type === "boolean" &&
				option.default === true
			) {
				//                 3 == "no-".length
				firstColumnUsed += 3;
			} else if (option.short) {
				//                 3 == ("-" + ", ").length
				firstColumnUsed += 3 + option.short.length;
			}
			if (option.type === "string") {
				//                 4 == "=...".length
				firstColumnUsed += 4;
			}

			if (firstColumnUsed > maxFirstColumnUsed) {
				maxFirstColumnUsed = firstColumnUsed;
			}
		}
		if (maxFirstColumnUsed < firstColumnWidth - 4) {
			// If we have more than 4 blank gap spaces, reduce first column width.
			firstColumnWidth = maxFirstColumnUsed + 2;
		}

		// Add the options list to the help text.
		help += `\n${bold("Options:")}\n`;
		const secondColumnWidth = Math.floor(width * 0.57);
		for (const [optionLong, option] of options) {
			// Build display name of the option.
			let displayName = "  ";
			if (
				config.allowNegative &&
				option.type === "boolean" &&
				option.default === true
			) {
				displayName += "--no-";
			} else {
				if (option.short) {
					displayName += `-${option.short}, `;
				}
				displayName += "--";
			}
			displayName += optionLong;
			if (option.type === "string") {
				displayName += "=...";
			}

			// Add the option display name to the help text.
			help += boldGreen(displayName);

			if (option.description || option.default !== undefined) {
				// Add a padding for the option description to the help text.
				let displayNameLen = displayName.length;
				if (displayNameLen >= firstColumnWidth - 1) {
					// Description needs to start at the next line.
					help += "\n";
					displayNameLen = 0;
				}
				const paddingLen = Math.max(2, firstColumnWidth - displayNameLen);
				help += " ".repeat(paddingLen);

				// Holds the length of the last line written, used later below.
				let lastLineLen = displayNameLen + paddingLen;

				// Add an optional option description to the help text.
				let hasDescription = false;
				if (option.description) {
					hasDescription = true;

					const formattedDescription = indentText(
						wrapText(option.description, secondColumnWidth),
						firstColumnWidth,
					).trimStart();
					help += formattedDescription;

					const descLines = formattedDescription.split("\n");
					const descLinesLen = descLines.length;
					if (descLinesLen > 1) {
						// Description has been wrapped, so set new last line length.
						// biome-ignore lint/style/noNonNullAssertion: Safe here.
						lastLineLen = descLines[descLinesLen - 1]!.length;
					} else if (descLinesLen === 1) {
						// Just add the only description line to last line length.
						// biome-ignore lint/style/noNonNullAssertion: Safe here.
						lastLineLen += descLines[descLinesLen - 1]!.length;
					}
				}

				// Add the default value to the help text, if needed.
				if (
					option.default !== undefined &&
					(option.type !== "boolean" ||
						// Don't show redundant default for boolean options.
						(!config.allowNegative && option.default !== false))
				) {
					const formattedDefault = JSON.stringify(option.default);
					if (
						//            11 == ("(default: " + ")").length
						lastLineLen + 11 + formattedDefault.length >
						firstColumnWidth + secondColumnWidth
					) {
						// Last line does not fit the default info, so wrap to next line.
						help += "\n" + " ".repeat(firstColumnWidth);
					} else if (hasDescription) {
						// Default value will be written to same line as description,
						// so add a space in between.
						help += " ";
					}
					help += `(default: ${formattedDefault})`;
				}
			}

			help += "\n";
		}
	}

	// Add an optional footer to the help text.
	if (config.footer) {
		help += `\n${wrapText(config.footer, width)}\n`;
	}

	stream.write(help);
}
