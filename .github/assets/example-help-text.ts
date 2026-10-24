// Run this to copy the help text with ANSI colors to the Wayland clipboard:
//  COLUMNS=1000 FORCE_COLOR=1 node ./.github/assets/example-help-text.ts --help | wl-copy
// Afterward, use https://boron.sh to create a nice SVG terminal "screenshot".
// Link with my config: https://boron.sh/?v=1&content=zjZI9b9swEIZ3_4UsL7K0BSw5bdHFRbcgQDokQYNORgZGPlkMSB5xd_JHf31BybXlKeVG8p7nXhx5nzRTY3O0PhjJHC6t4ZILhz8El3PwjTPPCYE3ilY44sC9wEiiTy7Us9nV6nP8rW5Dy1Ik5NYkWHEumL5gNdXUgTd4uVrdxAHDuM5Y7_-DHNDHsWr5z_X965cIVO0cVdVyCLwrN6P_2YRcRKJdaQVKJp4UTmEdHeBE_JYmklQkwSfSH3VdHz0PfXwlAbcQaigZhgIYY-01B3fAxzW1rg-2xPW3m-tPE6EWoZKTpjsb74aJn9K8HmC0N7BAaNMHJ6B9FlL1nCauKnFlPpKai1mP4W45fTBoxzuc7ybQWwnwppzOQwGenCgND96yRGf4-fz4MJ3QRLAtgi1JCXNyPIlPhuMpfBo1l3G7AnYU8kXnASynF9Tslps-UrJhu0RnlnW5WNDexRyobjguTn9lseZGZ78osxi8ak_6HjFW_QU&theme=nord&backdrop=none&syntax=ansi&padding=48&radius=12&titleBar=1&title=Example+Help+Text&shadow=100&columns=80&aspect=og

// biome-ignore-all lint/suspicious/noImplicitAnyLet: TypeScript can handle `args`.
// biome-ignore-all lint/suspicious/noExplicitAny: Acceptable for error catching.

import { parseArgs, styleText } from "node:util";
import {
	type ParseArgsAndPrintHelpConfig,
	printHelp,
} from "../../src/printhelp.ts";

// The same configuration can be passed to `parseArgs` and `printHelp`.
const config = {
	usage: [
		"logreader [options] [ application.log ]",
		"logreader ui [options] [ application.log ]",
	],
	header: "Inspect, filter, and analyze application logs from your terminal.",
	footer:
		"Documentation: https://example.com/logreader/docs\n" +
		"Report issues: https://example.com/logreader/issues",
	allowNegative: true,
	options: {
		follow: {
			type: "boolean",
			short: "f",
			description: "Stream new log entries as they arrive",
		},
		lines: {
			type: "string",
			default: "50",
			short: "n",
			description: "Number of recent lines to display",
		},
		search: {
			type: "string",
			short: "s",
			description: "Filter entries by text or regular expression",
		},
		timestamps: {
			type: "boolean",
			default: true,
			description: "Don't show timestamps",
		},
		json: {
			type: "boolean",
			short: "j",
			description: "Parse and format JSON log entries",
		},
		version: {
			type: "boolean",
			short: "v",
			description: "Print version information",
		},
		help: {
			type: "boolean",
			short: "h",
			description: "Print help information",
		},
	},
} as const satisfies ParseArgsAndPrintHelpConfig;

// Try to parse command-line arguments as configured.
let args;
try {
	args = parseArgs(config);
} catch (error: any) {
	if (
		error.code === "ERR_PARSE_ARGS_INVALID_OPTION_VALUE" ||
		error.code === "ERR_PARSE_ARGS_UNEXPECTED_POSITIONAL" ||
		error.code === "ERR_PARSE_ARGS_UNKNOWN_OPTION"
	) {
		// If CLI is used incorrectly, print error + help text and exit 1.
		const stream = process.stderr;
		stream.write(styleText("red", `Error: ${error.message}\n\n`, { stream }));
		printHelp(config, { stream });
		process.exit(1);
	}
	throw error;
}

if (args.values.help) {
	// If "-h/--help" argument is used, print help text and exit 0.
	printHelp(config);
	process.exit(0);
}
