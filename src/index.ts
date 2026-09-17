import type { ParseArgsConfig } from "node:util";
import * as process from "node:process";
import { basename } from 'node:path';
import { styleText } from "node:util";
import { StringBuilder } from "./string-builder.ts";
import type { ParseArgsOptionDescriptor } from "node:util";
import type { WriteStream } from "node:tty";

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
