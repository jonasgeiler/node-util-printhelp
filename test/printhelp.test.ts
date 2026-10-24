import * as assert from "node:assert/strict";
import { Writable } from "node:stream";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { WriteStream } from "node:tty";
import { stripVTControlCharacters } from "node:util";
import { printHelp } from "../src/printhelp.ts";

interface CapturedStream {
	stream: WriteStream;
	getOutput: () => string;
}

function createCapturedStream(columns = 80): CapturedStream {
	// TODO: Mock stream properties or tty module instead?
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

	it("prints the description, usage, options, and footer", async () => {
		const captured = createCapturedStream();

		printHelp(
			{
				usage: "tool [options] <file>",
				header: "A useful tool.",
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
			{
				stream: captured.stream,
			},
		);

		assert.equal(
			stripVTControlCharacters(captured.getOutput()),
			"A useful tool.\n" +
				"\n" +
				"Usage: tool [options] <file>\n" +
				"\n" +
				"Options:\n" +
				"  -v, --verbose     Show details.\n" +
				'  -o, --output=...  Output path. (default: "result.txt")\n' +
				"\n" +
				"More information is available in the manual.\n",
		);
	});

	it("prints negative boolean options using their no-prefixed name", async () => {
		const captured = createCapturedStream();

		printHelp(
			{
				usage: "tool [options]",
				allowNegative: true,
				options: {
					cache: {
						type: "boolean",
						default: true,
						description: "Disable caching.",
					},
				},
			},
			{
				stream: captured.stream,
			},
		);

		assert.equal(
			stripVTControlCharacters(captured.getOutput()),
			"Usage: tool [options]\n" +
				"\n" +
				"Options:\n" +
				"  --no-cache  Disable caching.\n",
		);
	});

	it("ignores short alias for negative boolean options", async () => {
		const captured = createCapturedStream();

		printHelp(
			{
				usage: "tool [options]",
				allowNegative: true,
				options: {
					cache: {
						type: "boolean",
						default: true,
						description: "Disable caching.",
						short: "c",
					},
				},
			},
			{
				stream: captured.stream,
			},
		);

		assert.equal(
			stripVTControlCharacters(captured.getOutput()),
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
				usage: "tool [options]",
				options: {
					config: {
						type: "string",
						description:
							"Choose the configuration file used to initialize the application.",
						default: "/a/very/long/path/to/the/configuration/file.json",
					},
				},
			},
			{
				stream: captured.stream,
			},
		);

		assert.equal(
			stripVTControlCharacters(captured.getOutput()),
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
				usage: "tool [options]",
				options: {
					config: {
						type: "string",
						description:
							"Choose the configuration file used to initialize the application.",
						default: "/a/very/long/path/to/the/configuration/file.json",
					},
				},
			},
			{
				stream: captured.stream,
			},
		);

		assert.equal(
			stripVTControlCharacters(captured.getOutput()),
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
				usage: "tool [options]",
				footer: "Documentation can be found at https://tool.com/",
			},
			{
				stream: captured.stream,
			},
		);

		assert.equal(
			stripVTControlCharacters(captured.getOutput()),
			"Usage: tool [options]\n" +
				"\n" +
				"Documentation can be found at https://tool.com/\n",
		);
	});

	it("skips printing an options header if options is an empty object", async () => {
		const captured = createCapturedStream();

		printHelp(
			{
				usage: "tool [options]",
				options: {},
			},
			{
				stream: captured.stream,
			},
		);

		assert.equal(
			stripVTControlCharacters(captured.getOutput()),
			"Usage: tool [options]\n",
		);
	});

	it("moves a long option description to the next line", async () => {
		const captured = createCapturedStream();

		printHelp(
			{
				usage: "tool [options]",
				options: {
					abcdefghijklmnopqrstuvwxy: {
						type: "boolean",
						description: "A long option.",
					},
				},
			},
			{
				stream: captured.stream,
			},
		);

		assert.equal(
			stripVTControlCharacters(captured.getOutput()),
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
				usage: "tool [options]",
				options: {
					bare: {
						type: "boolean",
					},
					config: {
						type: "string",
						default: "config.json",
					},
					disabled: {
						type: "boolean",
						default: false,
					},
					enabled: {
						type: "boolean",
						default: true,
					},
				},
			},
			{
				stream: captured.stream,
			},
		);

		assert.equal(
			stripVTControlCharacters(captured.getOutput()),
			"Usage: tool [options]\n" +
				"\n" +
				"Options:\n" +
				"  --bare\n" +
				'  --config=...  (default: "config.json")\n' +
				"  --disabled    \n" +
				"  --enabled     (default: true)\n",
		);
	});

	it("deduces the CLI name when no usage is configured", async (t) => {
		t.mock.property(process, "argv", ["/usr/bin/node", "/tmp/example-cli.js"]);

		const captured1 = createCapturedStream();

		printHelp(
			{},
			{
				stream: captured1.stream,
			},
		);

		assert.equal(
			stripVTControlCharacters(captured1.getOutput()),
			"Usage: example-cli.js [options]\n",
		);

		const captured2 = createCapturedStream();

		printHelp(
			{
				usage: [],
			},
			{
				stream: captured2.stream,
			},
		);

		assert.equal(
			stripVTControlCharacters(captured2.getOutput()),
			"Usage: example-cli.js [options]\n",
		);
	});

	it("accepts multiple usage strings", async () => {
		const captured = createCapturedStream();

		printHelp(
			{
				usage: ["tool [options]", "tool gui [options]"],
			},
			{
				stream: captured.stream,
			},
		);

		assert.equal(
			stripVTControlCharacters(captured.getOutput()),
			"Usage: tool [options]\n       tool gui [options]\n",
		);
	});
});
