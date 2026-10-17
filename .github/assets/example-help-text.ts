// Run this to copy the help text with ANSI colors to the Wayland clipboard:
//  COLUMNS=1000 FORCE_COLOR=1 node ./.github/assets/example-help-text.ts --help | wl-copy
// Afterward, use https://boron.sh to create a nice SVG terminal "screenshot".
// Link with my config: https://boron.sh/?v=1&content=zhZI_b9swEMV3fwUvD1naApactOiiJp2CAu2QFA06GR0Y-WQxIHnE3cl_-ukLyoYtT-Wmd-_9cHzi96SZWlug88FIFnBpDZdcOPwluJyDb515Tgi8UXTCEQceBEYSfXKhns3mq7v4W92GmmIScmsSrDiXmP7BfeBN5wN9na9u49H9fJw1ozJf3X359DECVbdAVXUcAu_KBON5MSEXkWhX6KBk4knhFNbTAU7Eb2kC6Qukp5AvCOCn-GQoKnzqWOJ4p0nqraTelNNVyonSWMgxgh8vz0_TLSaAVADBJ9KHuq5PlKchvpKAOwi1lAyjAcZYe83BHfB-TZ0bgjW4-Xx782ECrBJX5iOpuZj1BHzk9M6gPe9wmU1CWrZQctL2lzW-jX_23NzrAUZ7AwuENkNwAtpnIdXrSraFtSUp8rmVY5En9arL2SO3Q6Rk42eD3ixrs1zS3sUcqG45Ls_PY7nmVme_KLMYvOpA-r_E0fUP&theme=nord&backdrop=none&syntax=ansi&padding=48&radius=12&titleBar=1&title=Example+Help+Text&shadow=100&columns=80&aspect=og

import { parseArgs } from "node:util";
import {
	type ParseArgsConfigWithHelpText,
	printHelp,
} from "../../src/printhelp.ts";

// The same configuration can be passed to `parseArgs` and `printHelp`.
const config = {
	name: "logreader",
	description:
		"Inspect, filter, and analyze application logs from your terminal.",
	positionalsUsage: "<logfile>",
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

// Parse command-line arguments as configured.
const args = parseArgs(config);
if (args.values.help) {
	// If "-h/--help" argument is used, print help text and exit.
	printHelp(config);
	process.exit(0);
}
