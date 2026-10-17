import * as assert from "node:assert/strict";
import { Writable } from "node:stream";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { WriteStream } from "node:tty";
import { printHelp } from "../src/printhelp.ts";

interface CapturedStream {
	stream: WriteStream;
	getOutput: () => string;
}

// TODO: Can/Should I use TestsStream?
function createCapturedStream(columns = 80): CapturedStream {
	const chunks: string[] = [];
	const stream = new Writable({
		write(chunk, _encoding, callback) {
			chunks.push(chunk.toString());
			callback();
		},
	});
	Object.assign(stream, {
		columns,
		isTTY: true,
	});

	return {
		stream: stream as WriteStream,
		getOutput: () => chunks.join(""),
	};
}

async function waitForUncork() {
	await new Promise<void>((resolve) => process.nextTick(resolve));
}

function withoutAnsi(text: string) {
	// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape sequence is intentional.
	return text.replaceAll(/\u001B\[[0-9;]*m/g, "");
}

describe("printHelp", () => {
	// Make sure the COLUMNS environment variable won't be used unless tested
	// explicitly.
	let prevCOLUMNS: string | undefined;
	beforeEach(() => {
		prevCOLUMNS = process.env.COLUMNS;
		delete process.env.COLUMNS;
	});
	afterEach(() => {
		if (prevCOLUMNS !== undefined) {
			process.env.COLUMNS = prevCOLUMNS;
		}
	});

	it("prints the description, usage, sorted options, and footer", async () => {
		const captured = createCapturedStream();

		printHelp(
			{
				name: "tool",
				description: "A useful tool.",
				positionalsUsage: "<file>",
				options: {
					verbose: {
						short: "v",
						type: "boolean",
						description: "Show details.",
					},
					output: {
						short: "o",
						type: "string",
						description: "Output path.",
						default: "result.txt",
					},
				},
				footer: "More information is available in the manual.",
			},
			{ stream: captured.stream },
		);
		await waitForUncork();

		assert.equal(
			withoutAnsi(captured.getOutput()),
			"A useful tool.\n" +
				"\n" +
				"Usage: tool [options] <file>\n" +
				"\n" +
				"Options:\n" +
				'  -o, --output=...  Output path. (default: "result.txt")\n' +
				"  -v, --verbose     Show details.\n" +
				"\n" +
				"More information is available in the manual.\n",
		);
	});

	it("prints negative boolean options using their no-prefixed name", async () => {
		const captured = createCapturedStream();

		printHelp(
			{
				name: "tool",
				allowNegative: true,
				options: {
					cache: {
						type: "boolean",
						default: true,
						description: "Disable caching.",
					},
				},
			},
			{ stream: captured.stream },
		);
		await waitForUncork();

		assert.equal(
			withoutAnsi(captured.getOutput()),
			"Usage: tool [options]\n" +
				"\n" +
				"Options:\n" +
				"  --no-cache  Disable caching.\n",
		);
	});

	it("wraps long descriptions and moves an overflowing default to a new line", async () => {
		const captured = createCapturedStream(100);

		printHelp(
			{
				name: "tool",
				options: {
					config: {
						type: "string",
						description:
							"Choose the configuration file used to initialize the application.",
						default: "/a/very/long/path/to/the/configuration/file.json",
					},
				},
			},
			{ stream: captured.stream },
		);
		await waitForUncork();

		assert.equal(
			withoutAnsi(captured.getOutput()),
			"Usage: tool [options]\n" +
				"\n" +
				"Options:\n" +
				"  --config=...  Choose the configuration file used to\n" +
				"                initialize the application.\n" +
				'                (default: "/a/very/long/path/to/the/configuration/file.json")\n',
		);
	});

	it("respects the COLUMNS environment variable", async () => {
		process.env.COLUMNS = "100";
		const captured = createCapturedStream(300);

		printHelp(
			{
				name: "tool",
				options: {
					config: {
						type: "string",
						description:
							"Choose the configuration file used to initialize the application.",
						default: "/a/very/long/path/to/the/configuration/file.json",
					},
				},
			},
			{ stream: captured.stream },
		);
		await waitForUncork();

		assert.equal(
			withoutAnsi(captured.getOutput()),
			"Usage: tool [options]\n" +
				"\n" +
				"Options:\n" +
				"  --config=...  Choose the configuration file used to\n" +
				"                initialize the application.\n" +
				'                (default: "/a/very/long/path/to/the/configuration/file.json")\n',
		);
	});

	it("prints a footer without an options section", async () => {
		const captured = createCapturedStream();

		printHelp(
			{
				name: "tool",
				footer: "Documentation can be found at https://tool.com/",
			},
			{ stream: captured.stream },
		);
		await waitForUncork();

		assert.equal(
			withoutAnsi(captured.getOutput()),
			"Usage: tool [options]\n" +
				"\n" +
				"Documentation can be found at https://tool.com/\n",
		);
	});

	it("skips printing an options header if options is an empty object", async () => {
		const captured = createCapturedStream();

		printHelp({ name: "tool", options: {} }, { stream: captured.stream });
		await waitForUncork();

		assert.equal(withoutAnsi(captured.getOutput()), "Usage: tool [options]\n");
	});

	it("moves a long option description to the next line", async () => {
		const captured = createCapturedStream();

		printHelp(
			{
				name: "tool",
				options: {
					abcdefghijklmnopqrstuvwxy: {
						type: "boolean",
						description: "A long option.",
					},
				},
			},
			{ stream: captured.stream },
		);
		await waitForUncork();

		assert.equal(
			withoutAnsi(captured.getOutput()),
			"Usage: tool [options]\n" +
				"\n" +
				"Options:\n" +
				"  --abcdefghijklmnopqrstuvwxy\n" +
				"                            A long option.\n",
		);
	});

	it("handles options without descriptions and suppressed boolean defaults", async () => {
		const captured = createCapturedStream(0);

		printHelp(
			{
				name: "tool",
				options: {
					bare: { type: "boolean" },
					config: { type: "string", default: "config.json" },
					disabled: { type: "boolean", default: false },
					enabled: { type: "boolean", default: true },
				},
			},
			{ stream: captured.stream },
		);
		await waitForUncork();

		assert.equal(
			withoutAnsi(captured.getOutput()),
			"Usage: tool [options]\n" +
				"\n" +
				"Options:\n" +
				"  --bare\n" +
				'  --config=...  (default: "config.json")\n' +
				"  --disabled    \n" +
				"  --enabled     (default: true)\n",
		);
	});

	it("deduces the CLI name when no name is configured", async (t) => {
		const captured = createCapturedStream();
		t.mock.property(process, "argv", ["/usr/bin/node", "/tmp/example-cli.js"]);

		printHelp({}, { stream: captured.stream });
		await waitForUncork();

		assert.equal(
			withoutAnsi(captured.getOutput()),
			"Usage: example-cli.js [options]\n",
		);
	});
});
