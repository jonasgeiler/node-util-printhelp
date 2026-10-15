import * as assert from "node:assert/strict";
import { Writable } from "node:stream";
import { describe, it } from "node:test";
import type { WriteStream } from "node:tty";
import { printHelp } from "../src/printhelp.ts";

interface CapturedStream {
	stream: WriteStream;
	getOutput: () => string;
}

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
			captured.stream,
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
			captured.stream,
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
			captured.stream,
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
			captured.stream,
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

		printHelp({ name: "tool", options: {} }, captured.stream);
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
			captured.stream,
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
			captured.stream,
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

		printHelp({}, captured.stream);
		await waitForUncork();

		assert.equal(
			withoutAnsi(captured.getOutput()),
			"Usage: example-cli.js [options]\n",
		);
	});
});
