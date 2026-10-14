import { basename } from "node:path";

/** Used to detect a bundled Electron app while deducing CLI name. */
export interface ElectronProcess extends NodeJS.Process {
	defaultApp?: boolean;
	versions: NodeJS.ProcessVersions & {
		electron: string;
	};
}

/**
 * Deduce the name of the running CLI from the process args/metadata.
 */
export function deduceCLIName(): string {
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
		process.argv[isEvalOrBundledElectronApp ? 0 : 1] || process.argv0,
	);
	if (cliName !== "node" && cliName !== "node.exe") {
		return cliName;
	}
	return process.argv.join(" ");
}
