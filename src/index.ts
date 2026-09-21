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

const DESCRIPTION_COLUMN = 30;

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

	// Use 75 % of the available width, and at least 70 characters.
	const width = Math.max(70, (stream.columns || 0) * 0.75);
	const firstColumn = Math.floor(width * 0.4);
	const secondColumn = Math.floor(width * 0.57);

	if (parseArgsConfig.description) {
		stream.write(parseArgsConfig.description);
		stream.write("\n\n");
	}
	stream.write(bold(`Usage: ${parseArgsConfig.name} [options]`));
	stream.write("\n\n");

	if (parseArgsConfig.options) {
		stream.write(bold("Options:"));
		stream.write("\n");
		for (const [optionLong, option] of Object.entries(parseArgsConfig.options)) {
			const entryStart = new StringBuilder();
			entryStart.write("  ");

			// Add start of the entry with the option name.
			if (option.short) {
				entryStart.write("-");
				entryStart.write(option.short);
				entryStart.write(", ");
			}
			entryStart.write("--");
			entryStart.write(optionLong);
			if (option.type === "string") {
				entryStart.write("=...");
			}

			// Finalize the start of the entry with its terminal colors.
			const entryStartStr = entryStart.toString();
			let entryStartLen = entryStart.length;
			stream.write(bold(green(entryStartStr)));

			if (option.description || option.default !== undefined) {
				// Add padding.
				if (entryStartLen >= DESCRIPTION_COLUMN - 1) {
					// Description needs to start at the next line.
					stream.write("\n");
					entryStartLen = 0;
				}
				stream.write(" ".repeat(Math.max(2, DESCRIPTION_COLUMN - entryStartLen)));

				// Add description.
				let hasDescription = false;
				if (option.description) {
					hasDescription = true;

					stream.write(option.description);
				}

				// Add default value.
				if (option.default !== undefined) {
					if (hasDescription) {
						stream.write(" ");
					}
					stream.write("(default: ");
					stream.write(JSON.stringify(option.default));
					stream.write(")");
				}
			}

			stream.write("\n");
		}
	}
}
