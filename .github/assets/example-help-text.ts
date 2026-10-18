// Run this to copy the help text with ANSI colors to the Wayland clipboard:
//  COLUMNS=1000 FORCE_COLOR=1 node ./.github/assets/example-help-text.ts --help | wl-copy
// Afterward, use https://boron.sh to create a nice SVG terminal "screenshot".
// Link with my config: https://boron.sh/?v=1&content=zhZI_b9swEMV3fwUvD1naApactOiiJp2CAu2QFA06GR0Y-WQxIHnE3cl_-ukLyoYtT-Wmd-_9cHzi96SZWlug88FIFnBpDZdcOPwluJyDb515Tgi8UXTCEQceBEYSfXKhns3mq7v4W92GmmIScmsSrDiXmP7BfeBN5wN9na9u49H9fJw1ozJf3X359DECVbdAVXUcAu_KBON5MSEXkWhX6KBk4knhFNbTAU7Eb2kC6Qukp5AvCOCn-GQoKnzqWOJ4p0nqraTelNNVyonSWMgxgh8vz0_TLSaAVADBJ9KHuq5PlKchvpKAOwi1lAyjAcZYe83BHfB-TZ0bgjW4-Xx782ECrBJX5iOpuZj1BHzk9M6gPe9wmU1CWrZQctL2lzW-jX_23NzrAUZ7AwuENkNwAtpnIdXrSraFtSUp8rmVY5En9arL2SO3Q6Rk42eD3ixrs1zS3sUcqG45Ls_PY7nmVme_KLMYvOpA-r_E0fUP&theme=nord&backdrop=none&syntax=ansi&padding=48&radius=12&titleBar=1&title=Example+Help+Text&shadow=100&columns=80&aspect=og

// biome-ignore-all lint/suspicious/noImplicitAnyLet: TypeScript can handle `args`.
// biome-ignore-all lint/suspicious/noExplicitAny: Acceptable for error catching.

import { parseArgs, styleText } from "node:util";
import {
	type ParseArgsConfigWithHelpText,
	printHelp,
} from "../../src/printhelp.ts";

// The same configuration can be passed to `parseArgs` and `printHelp`.
const config = {
	usage: [
		"logreader [options] [ application.log ]",
		"logreader gui [options] [ application.log ]",
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
} as const satisfies ParseArgsConfigWithHelpText;

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
