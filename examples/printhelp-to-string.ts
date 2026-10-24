import { Writable } from "node:stream";
import {
	type ParseArgsAndPrintHelpConfig,
	printHelp,
} from "../src/printhelp.ts";

const config = {
	usage: "tool [options]",
	options: {
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

// Provide printHelp with a customized Writable which just appends to our string.
let help = "";
printHelp(config, {
	stream: new Writable({
		decodeStrings: false,
		write(chunk, _encoding, callback) {
			help += chunk;
			callback();
		},
	}),
});

// Now you can process the help text however you want.
console.log("Help text length:", help.length);
console.log("First help text line:", JSON.stringify(help.split("\n")[0]));
