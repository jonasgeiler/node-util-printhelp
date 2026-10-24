// This is similar to ./logreader.ts, but with a bit more features.
// Since ./logreader.ts is used in the README, and I didn't want to make the
// README example too complex, I am keeping this separate.

// biome-ignore-all lint/suspicious/noImplicitAnyLet: TypeScript can handle `args`.
// biome-ignore-all lint/suspicious/noExplicitAny: Acceptable for error catching.

import { parseArgs, styleText } from "node:util";
import {
	type ParseArgsAndPrintHelpConfig,
	printHelp,
} from "../src/printhelp.ts";

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
	allowPositionals: true,
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
	// If "-h/--help" option is used, print help text and exit 0.
	printHelp(config);
	process.exit(0);
}

if (args.values.version) {
	// If "-v/--version" option is used, print version and exit 0.
	const { default: packageJson } = await import("../package.json", {
		with: {
			type: "json",
		},
	});
	console.log("v" + packageJson.version);
	process.exit(0);
}

// Handle positionals.
let logFile: string;
if (args.positionals[0] === "ui" && args.positionals[1]) {
	logFile = args.positionals[1];
	console.log("logreader (UI mode)");
} else if (args.positionals[0]) {
	logFile = args.positionals[0];
	console.log("logreader (CLI mode)");
} else {
	// No log file given, print error + help text and exit 1.
	const stream = process.stderr;
	stream.write(styleText("red", `Error: No log file given\n\n`, { stream }));
	printHelp(config, { stream });
	process.exit(1);
}

// Handle other options.
console.log("\nOptions:");
if (args.values.follow !== undefined)
	console.log("- follow:", args.values.follow);
if (args.values.lines !== undefined)
	console.log("- lines:", Number(args.values.lines));
if (args.values.search !== undefined)
	console.log("- search:", JSON.stringify(args.values.search));
if (args.values.timestamps !== undefined)
	console.log("- timestamps:", args.values.timestamps);
if (args.values.json !== undefined) console.log("- json:", args.values.json);
console.log("- log file:", JSON.stringify(logFile));
