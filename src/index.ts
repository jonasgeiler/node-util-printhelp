import type { ParseArgsConfig } from "node:util";
import * as process from "node:process";
import { basename } from 'node:path';
import { styleText } from "node:util";
import { StringBuilder } from "./string-builder.ts";
import type { ParseArgsOptionDescriptor } from "node:util";
import type { WriteStream } from "node:tty";

function indent(text: string, depth: number) {
	return text.replace(/^/gm, ' '.repeat(depth));
}

function fold(text: string, width: number) {
	return text.replace(
		new RegExp(`([^\n]{0,${width}})( |$)`, 'g'),
		(_, newLine, end) => newLine + (end === ' ' ? '\n' : ''),
	);
}

function getArgDescription(type: any) {
	switch (typeof type) {
		case "boolean":
		case "undefined":
			break;
		case "number":
		case "string":
		case "bigint":
			return '...';
		default:
			throw new Error(`Unknown option type ${type}`);
	}
	return "";
}

function formatColumnText(text: string, firstColumn: number, secondColumn: number) {
	// Combination of the indent and fold functions from:
	// https://github.com/nodejs/node/blob/342bf6d66940f8c72a6a36bef44d7010d6b347b1/lib/internal/main/print_help.js#L93-L103
	return text
		.replace(
			new RegExp(`([^\n]{0,${secondColumn}})( |$)`, 'g'),
			(_, newLine, end) => newLine + (end === ' ' ? '\n' : ''),
		)
		.replace(/^/gm, ' '.repeat(firstColumn))
		.trimStart();
}

export function format(
	{ options, aliases = new Map(), firstColumn, secondColumn, nameStyle = [] },
) {
	let text = '';
	let maxFirstColumnUsed = 0;

	const sortedOptions = [...options.entries()].sort(
		({ 0: name1, 1: option1 }, { 0: name2, 1: option2 }) => {
			if (option1.defaultIsTrue) {
				name1 = `--no-${name1.slice(2)}`;
			}
			if (option2.defaultIsTrue) {
				name2 = `--no-${name2.slice(2)}`;
			}
			return name1.localeCompare(name2);
		},
	);

	for (const {
		0: name, 1: { helpText, type, defaultIsTrue },
	} of sortedOptions) {
		if (!helpText) continue;

		let displayName = name;

		if (defaultIsTrue) {
			displayName = `--no-${displayName.slice(2)}`;
		}

		const argDescription = getArgDescription(type);
		if (argDescription)
			displayName += `=${argDescription}`;

		for (const { 0: from, 1: to } of aliases) {
			// For cases like e.g. `-e, --eval`.
			if (to[0] === name && to.length === 1) {
				displayName = `${from}, ${displayName}`;
			}

			// For cases like `--inspect-brk[=[host:]port]`.
			const targetInfo = options.get(to[0]);
			const targetArgDescription =
				targetInfo ? getArgDescription(targetInfo.type) : '...';
			if (from === `${name}=`) {
				displayName += `[=${targetArgDescription}]`;
			} else if (from === `${name} <arg>`) {
				displayName += ` [${targetArgDescription}]`;
			}
		}

		let displayHelpText = helpText;

		text += styleText(nameStyle, displayName, { stream: process.stdout });
		maxFirstColumnUsed = Math.max(maxFirstColumnUsed, displayName.length);
		if (displayName.length >= firstColumn)
			text += '\n' + ' '.repeat(firstColumn);
		else
			text += ' '.repeat(firstColumn - displayName.length);

		text += indent(fold(displayHelpText, secondColumn), firstColumn).trimStart() + '\n';
	}

	if (maxFirstColumnUsed < firstColumn - 4) {
		// If we have more than 4 blank gap spaces, reduce first column width.
		return format({
			options,
			aliases,
			firstColumn: maxFirstColumnUsed + 2,
			secondColumn,
			nameStyle,
		});
	}

	return text;
}

export function getCLIName(): string {
	const isEval =
		process.execArgv.includes('--eval') ||
		process.execArgv.includes('-e') ||
		process.execArgv.includes('--print') ||
		process.execArgv.includes('-p');
	const cliName = basename(process.argv[isEval ? 0 : 1] || import.meta.filename);
	if (cliName !== "node") {
		return cliName;
	}
	return cliName + " " + process.execArgv.join(' ');
}

export interface ParseArgsAndHelpOptionDescriptor extends ParseArgsOptionDescriptor {
	description?: string;
}

export interface ParseArgsAndHelpOptionsConfig {
	[longOption: string]: ParseArgsAndHelpOptionDescriptor;
}

export interface ParseArgsAndHelpConfig extends ParseArgsConfig {
	name: string;
	description?: string;

	options?: ParseArgsAndHelpOptionsConfig | undefined;
}

export function printHelp(stream: WriteStream, parseArgsConfig: ParseArgsAndHelpConfig) {
	// Based on https://github.com/nodejs/node/blob/99f0ddef2ecfaf21f61a4a2b8643944f6ddab538/lib/internal/main/print_help.js

	const bold = (text: string) => styleText("bold", text, { stream });
	const green = (text: string) => styleText("green", text, { stream });

	stream.cork();

	try {
		if (parseArgsConfig.description) {
			stream.write(parseArgsConfig.description);
			stream.write("\n\n");
		}
		stream.write(bold(`Usage: ${parseArgsConfig.name} [options]`));
		stream.write("\n\n");

		if (parseArgsConfig.options) {
			// Use 75 % of the available width, and at least 70 characters.
			const width = Math.max(70, (stream.columns || 0) * 0.75);

			stream.write(bold("Options:"));
			stream.write("\n");

			let firstColumnWidth = Math.floor(width * 0.4);
			let maxFirstColumnUsed = 0;
			for (const [optionLong, option] of Object.entries(parseArgsConfig.options)) {
				let firstColumnUsed = 4 + optionLong.length; // 4 = "  " + "--"
				if (option.short) {
					firstColumnUsed += 3 + option.short.length; // 3 = "-" + ", "
				}
				if (parseArgsConfig.allowNegative && option.type === "boolean" && option.default === true) {
					firstColumnUsed += 3; // 3 = "no-"
				}
				if (option.type === "string") {
					firstColumnUsed += 4; // 4 = "=..."
				}

				if (firstColumnUsed > maxFirstColumnUsed) {
					maxFirstColumnUsed = firstColumnUsed;
				}
			}
			if (maxFirstColumnUsed < firstColumnWidth - 4) {
				firstColumnWidth = maxFirstColumnUsed + 2;
			}

			const secondColumnWidth = Math.floor(width * 0.57);
			for (const [optionLong, option] of
				Object.entries(parseArgsConfig.options)) {
				const entryStart = new StringBuilder();
				entryStart.write("  ");

				// Add start of the entry with the option name.
				if (option.short) {
					entryStart.write("-");
					entryStart.write(option.short);
					entryStart.write(", ");
				}
				entryStart.write("--");
				if (parseArgsConfig.allowNegative && option.type === "boolean" && option.default === true) {
					entryStart.write("no-");
				}
				entryStart.write(optionLong);
				if (option.type === "string") {
					entryStart.write("=...");
				}

				// Finalize the start of the entry with its terminal colors.
				stream.write(bold(green(entryStart.toString())));

				if (option.description || option.default !== undefined) {
					// Add padding.
					let entryStartLen = entryStart.length;
					if (entryStartLen >= firstColumnWidth - 1) {
						// Description needs to start at the next line.
						stream.write("\n");
						entryStartLen = 0;
					}
					const paddingLen = Math.max(2, firstColumnWidth - entryStartLen);
					stream.write(" ".repeat(paddingLen));

					// Holds the length of the last line written, used later below.
					let lastLineLen = entryStartLen + paddingLen;

					// Add description.
					let hasDescription = false;
					if (option.description) {
						hasDescription = true;

						const formattedDescription = formatColumnText(option.description, firstColumnWidth, secondColumnWidth);
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

					// Add default value.
					if (
						option.default !== undefined &&
						(
							option.type !== "boolean" ||
							// Don't show redundant default for boolean options.
							(!parseArgsConfig.allowNegative && option.default !== false)
						)
					) {
						const formattedDefault = JSON.stringify(option.default);
						if (lastLineLen + 11 + formattedDefault.length > firstColumnWidth + secondColumnWidth) { // 11 = "(default: " + ")"
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
	} finally {
		process.nextTick(() => stream.uncork());
	}
}
