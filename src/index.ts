import { basename } from "node:path";
import type { WriteStream } from "node:tty";
import type { ParseArgsConfig, ParseArgsOptionDescriptor } from "node:util";
import { styleText } from "node:util";

/** Used to detect a bundled Electron app while deducing CLI name. */
interface ElectronProcess extends NodeJS.Process {
	defaultApp?: boolean;
	versions: NodeJS.ProcessVersions & {
		electron: string;
	};
}

/**
 * Deduce the name of the running CLI from the process args/metadata.
 */
function deduceCLIName(): string {
	// Knowledge about --eval/--print from:
	// https://github.com/nodejs/node/blob/dd9777b284b05a0c4864ae9543e0b4d2020721db/lib/internal/util/parse_args/parse_args.js#L58-L67
	// Knowledge about Electron from:
	// https://github.com/yargs/yargs/blob/b2dbcc538062829bd720f8cbfb6b4765bae6b4b8/lib/utils/process-argv.ts
	const isEvalOrBundledElectronApp =
		process.execArgv.includes("--eval") ||
		process.execArgv.includes("-e") ||
		process.execArgv.includes("--print") ||
		process.execArgv.includes("-p") ||
		(!!(process as ElectronProcess).versions.electron &&
			!(process as ElectronProcess).defaultApp);
	const cliName = basename(
		process.argv[isEvalOrBundledElectronApp ? 0 : 1] || import.meta.filename,
	);
	if (cliName !== "node" && cliName !== "node.exe") {
		return cliName;
	}
	return cliName + " " + process.execArgv.join(" ");
}

/**
 * Wrap text with newlines after full words exceeding given max width.
 * @param text
 * @param maxWidth
 */
function wrapText(text: string, maxWidth: number) {
	// Adapted from: https://github.com/nodejs/node/blob/342bf6d66940f8c72a6a36bef44d7010d6b347b1/lib/internal/main/print_help.js#L97-L103
	return text.replace(
		new RegExp(`([^\n]{0,${maxWidth}})( |$)`, "g"),
		(_, newLine, end) => newLine + (end === " " ? "\n" : ""),
	);
}

/**
 * Ident text width spaces to make it start at given depth.
 * @param text
 * @param depth
 */
function indentText(text: string, depth: number) {
	// Adapted from: https://github.com/nodejs/node/blob/342bf6d66940f8c72a6a36bef44d7010d6b347b1/lib/internal/main/print_help.js#L93-L95
	return text.replace(/^/gm, " ".repeat(depth));
}

/**
 * An extension of {@link ParseArgsOptionDescriptor} which allows setting
 * a help text description used by {@link printHelp} for the option.
 */
export interface ParseArgsOptionDescriptorWithHelpText
	extends ParseArgsOptionDescriptor {
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
	description?: string | undefined;
	name?: string | undefined;
	positionalsUsage?: string | undefined;
	footer?: string | undefined;

	options?: ParseArgsOptionsConfigWithHelpText | undefined;
}

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
		if (parseArgsConfig.description) {
			stream.write(wrapText(parseArgsConfig.description, width));
			stream.write("\n\n");
		}

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
						return ["no-" + optionEntry[0], optionEntry[1]] as [
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
				//                            4 = ("  " + "--").length
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
							lastLineLen = descLines[descLinesLen - 1]!.length;
						} else if (descLinesLen === 1) {
							// Just add the only description line to last line length.
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
							//            11 = ("(default: " + ")").length
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

		if (parseArgsConfig.footer) {
			stream.write("\n");
			stream.write(wrapText(parseArgsConfig.footer, width));
			stream.write("\n");
		}
	} finally {
		process.nextTick(() => stream.uncork());
	}
}
