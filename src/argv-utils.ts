import { basename } from "node:path";
import { parseArgs } from "node:util";

/** Used to detect a bundled Electron app while deducing CLI name. */
export interface ElectronProcess extends NodeJS.Process {
	defaultApp?: boolean;
	versions: NodeJS.ProcessVersions & {
		electron?: string;
	};
}

type GlobalThis = typeof globalThis;
/** Used to detect the Deno runtime while deducing CLI name. */
export interface DenoGlobal extends GlobalThis {
	Deno: Record<string, unknown>;
}

/**
 * Deduce the name of the running CLI from the process args/metadata.
 */
export function deduceCLIName(): string {
	let cliName: string | undefined;

	// Try to detect if we are running in a bundled Electron app or not.
	// Adapted from: https://github.com/yargs/yargs/blob/b2dbcc538062829bd720f8cbfb6b4765bae6b4b8/lib/utils/process-argv.ts#L1-L21
	if (
		// `process.versions.electron` is either set by Electron, or undefined.
		// See: https://github.com/electron/electron/blob/main/docs/api/process.md#processversionselectron-readonly
		(process as ElectronProcess).versions.electron &&
		// `process.defaultApp` is either set by Electron in an unbundled Electron app, or undefined.
		// See: https://github.com/electron/electron/blob/main/docs/api/process.md#processdefaultapp-readonly
		!(process as ElectronProcess).defaultApp
	) {
		// Bundled Electron apps receive the CLI name as the first argument.
		if (process.argv[0]) {
			cliName = basename(process.argv[0]);
		}
	} else {
		// Detect if Node.js/Bun/Deno are calling the CLI from an evaluated
		// inline script.
		// Examples:
		//  node --eval 'import "./cli.ts"'
		//  bun --eval 'import "./cli.ts"'
		//  deno eval 'import "./cli.ts"'
		let isEval = false;
		if ((globalThis as DenoGlobal).Deno) {
			/*
			// We are in Deno, so try to detect an evaluated inline script by checking
			// if the script name in the second argument is a special Deno eval
			// script name.
			if (process.argv[1]) {
				switch (basename(process.argv[1])) {
					case "$deno$eval.mts":
					case "$deno$eval.mjs":
					case "$deno$eval.cjs":
					case "$deno$eval.cts":
						// There is currently no way to determine the exact arguments with
						// which Deno was called, so we just set `isEval` to `false`, even
						// if we detected that we are in a CLI called from `deno eval`.
						isEval = false;
				}
			}
			 */
		} else {
			// We are in Node.js or Bun, so try to detect an evaluated inline script
			// by parsing the --eval/--print command-line arguments.
			const execArgs = parseArgs({
				args: process.execArgv,
				strict: false,
				options: {
					eval: {
						short: "e",
						type: "string",
					},
					print: {
						short: "p",
						type: "string",
					},
				},
			});
			isEval = !!execArgs.values.eval || !!execArgs.values.print;
		}

		// Most runtimes, except Node.js/Bun called with --eval/--print and deno
		// called with the eval sub-command, receive the CLI name as the second
		// argument.
		if (!isEval && process.argv[1]) {
			cliName = basename(process.argv[1]);
		}
	}
	if (!cliName) {
		// Couldn't deduce a nice CLI name, so fall back to `execPath + execArgv`.
		cliName = basename(process.execPath);
		if (process.execArgv.length) {
			cliName +=
				" " +
				process.execArgv
					.map((arg) => {
						// Quote/Escape arguments if needed. Doesn't need to be super safe,
						// since it's just used in the help text.
						// Taken from: https://github.com/ericcornelissen/shescape/blob/14a29b15f0187314f0cb02d58b14ecfe61d97527/src/internal/unix/bash.js#L39-L48
						// and: https://github.com/xxorax/node-shell-escape/blob/ebdb90e58050d74dbda9b8177f7de11cbb355d94/shell-escape.js#L8
						if (/[^a-z0-9_/:=-]/i.test(arg)) {
							return (
								"'" +
								arg
									// biome-ignore lint/suspicious/noControlCharactersInRegex: We want to remove control characters.
									.replaceAll(/[\0\u0008\u001B\u009B]/g, "")
									.replaceAll(/(\r\n)|\r/g, "$1")
									.replaceAll("'", "'\\''") +
								"'"
							);
						}
						return arg;
					})
					.join(" ");
		}
	}

	return cliName;
}
