import type { WriteStream } from "node:tty";
// noinspection ES6UnusedImports
import type { ParseArgsConfig, ParseArgsOptionDescriptor } from "node:util";
import { styleText } from "node:util";
import { deduceCLIName } from "./argv-utils.js";
import { indentText, wrapText } from "./text-utils.js";

/**
 * An extension of {@link ParseArgsOptionDescriptor} which allows setting
 * a help text description used by {@link printHelp} for the option.
 */
export interface ParseArgsOptionDescriptorWithHelpText
	extends ParseArgsOptionDescriptor {
	/**
	 * A description of the option, printed next to this option in the help text.
	 */
	description?: string | undefined;
}

/**
 * An adaption of {@link import("node:util").ParseArgsOptionsConfig} using our
 * custom {@link ParseArgsOptionDescriptorWithHelpText} type as value.
 */
export interface ParseArgsOptionsConfigWithHelpText {
	[longOption: string]: ParseArgsOptionDescriptorWithHelpText;
}

/**
 * An extension of {@link ParseArgsConfig} which allows setting help text
 * information for {@link printHelp}.
 */
export interface ParseArgsConfigWithHelpText extends ParseArgsConfig {
	/**
	 * An overall description of the CLI, printed before the usage string in the
	 * help text.
	 */
	description?: string | undefined;
	/**
	 * The name of the CLI, used in the usage string of the help text.
	 */
	name?: string | undefined;
	/**
	 * Usage information for positional arguments appended to the usage string of
	 * the help text.
	 */
	positionalsUsage?: string | undefined;
	/**
	 * A footer for the help text, printed after the options listing in the
	 * help text.
	 */
	footer?: string | undefined;

	/**
	 * Used to describe arguments known to the parser.
	 */
	options?: ParseArgsOptionsConfigWithHelpText | undefined;
}

/**
 * Print help text for the given `util.parseArgs` configuration, formatted
 * for the given TTY stream.
 * @param parseArgsConfig
 * @param stream
 */
export function printHelp(
	parseArgsConfig: ParseArgsConfigWithHelpText,
	stream: WriteStream = process.stdout,
) {
	// Based on https://github.com/nodejs/node/blob/99f0ddef2ecfaf21f61a4a2b8643944f6ddab538/lib/internal/main/print_help.js

	// Use 75 % of the available TTY width, and at least 70 characters.
	const width = Math.max(70, (stream.columns || 0) * 0.75);

	// Text styling helpers for the given TTY stream.
	const bold = (text: string) => styleText("bold", text, { stream });
	const boldGreen = (text: string) =>
		styleText(["bold", "green"], text, { stream });

	// Buffer/batch stream writes, since we do a lot of smaller ones.
	// The help text is only printed once `stream.uncork()` is called below.
	stream.cork();

	try {
		// Print optional CLI description.
		if (parseArgsConfig.description) {
			stream.write(wrapText(parseArgsConfig.description, width));
			stream.write("\n\n");
		}

		// Print CLI usage string.
		let cliName = parseArgsConfig.name;
		if (!cliName) {
			cliName = deduceCLIName();
		}
		let usage = `Usage: ${cliName} [options]`;
		if (parseArgsConfig.positionalsUsage) {
			usage += ` ${parseArgsConfig.positionalsUsage}`;
		}
		stream.write(bold(usage));
		stream.write("\n");

		if (parseArgsConfig.options) {
			// Pre-process and sort configured options.
			const sortedOptions = Object.entries(parseArgsConfig.options)
				.map((optionEntry) => {
					if (
						parseArgsConfig.allowNegative &&
						optionEntry[1].type === "boolean" &&
						optionEntry[1].default === true
					) {
						// Prepend "no-" to long option name, since it's the only usage way.
						// (We mainly do this here for sorting the options properly)
						return [`no-${optionEntry[0]}`, optionEntry[1]] as [
							string,
							ParseArgsOptionDescriptorWithHelpText,
						];
					}
					return optionEntry;
				})
				.sort(([option1Long], [option2Long]) =>
					option1Long.localeCompare(option2Long),
				);

			// Calculate optimal first column width.
			let firstColumnWidth = Math.floor(width * 0.4);
			let maxFirstColumnUsed = 0;
			for (const [optionLong, option] of sortedOptions) {
				//                            4 == ("  " + "--").length
				let firstColumnUsed = 4 + optionLong.length;
				if (option.short) {
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

			// Print the options.
			stream.write("\n");
			stream.write(bold("Options:"));
			stream.write("\n");
			const secondColumnWidth = Math.floor(width * 0.57);
			for (const [optionLong, option] of sortedOptions) {
				// Build display name of the option.
				let displayName = "  ";
				if (option.short) {
					displayName += `-${option.short}, `;
				}
				displayName += `--${optionLong}`;
				if (option.type === "string") {
					displayName += "=...";
				}

				// Print the display name with its styling.
				stream.write(boldGreen(displayName));

				if (option.description || option.default !== undefined) {
					// Print a padding.
					let displayNameLen = displayName.length;
					if (displayNameLen >= firstColumnWidth - 1) {
						// Description needs to start at the next line.
						stream.write("\n");
						displayNameLen = 0;
					}
					const paddingLen = Math.max(2, firstColumnWidth - displayNameLen);
					stream.write(" ".repeat(paddingLen));

					// Holds the length of the last line written, used later below.
					let lastLineLen = displayNameLen + paddingLen;

					// Print the description.
					let hasDescription = false;
					if (option.description) {
						hasDescription = true;

						const formattedDescription = indentText(
							wrapText(option.description, secondColumnWidth),
							firstColumnWidth,
						).trimStart();
						stream.write(formattedDescription);

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

					// Print the default value.
					if (
						option.default !== undefined &&
						(option.type !== "boolean" ||
							// Don't show redundant default for boolean options.
							(!parseArgsConfig.allowNegative && option.default !== false))
					) {
						const formattedDefault = JSON.stringify(option.default);
						if (
							//            11 == ("(default: " + ")").length
							lastLineLen + 11 + formattedDefault.length >
							firstColumnWidth + secondColumnWidth
						) {
							// Last line does not fit the default info, so wrap to next line.
							stream.write("\n");
							stream.write(" ".repeat(firstColumnWidth));
						} else if (hasDescription) {
							// Default value will be written to same line as description,
							// so add a space in between.
							stream.write(" ");
						}
						stream.write("(default: ");
						stream.write(formattedDefault);
						stream.write(")");
					}
				}

				stream.write("\n");
			}
		}

		// Print optional CLI footer.
		if (parseArgsConfig.footer) {
			stream.write("\n");
			stream.write(wrapText(parseArgsConfig.footer, width));
			stream.write("\n");
		}
	} finally {
		// Node.js recommends using `process.nextTick` for calling `stream.uncork`.
		process.nextTick(() => stream.uncork());
	}
}
