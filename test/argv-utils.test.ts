import * as assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import {
	type DenoGlobal,
	deduceCLIName,
	type ElectronProcess,
} from "../src/argv-utils.ts";

describe("deduceCLIName", () => {
	const originalDescriptors = [
		[(process as ElectronProcess).versions, "electron"] as const,
		[process, "defaultApp"] as const,
		[globalThis, "Deno"] as const,
	].map(([target, property]) => ({
		target,
		property,
		descriptor: Object.getOwnPropertyDescriptor(target, property),
	}));

	before(() => {
		Object.defineProperty((process as ElectronProcess).versions, "electron", {
			configurable: true,
			writable: true,
			value: undefined,
		});
		Object.defineProperty(process, "defaultApp", {
			configurable: true,
			writable: true,
			value: undefined,
		});
		Object.defineProperty(globalThis, "Deno", {
			configurable: true,
			writable: true,
			value: undefined,
		});
	});

	after(() => {
		for (const { target, property, descriptor } of originalDescriptors) {
			if (descriptor) {
				Object.defineProperty(target, property, descriptor);
			} else {
				Reflect.deleteProperty(target, property);
			}
		}
	});

	it("deduces the CLI name from a normal script path", (t) => {
		t.mock.property(process, "argv", [
			"/usr/bin/node",
			"/tmp/bin/example-cli.js",
		]);

		const result = deduceCLIName();
		assert.equal(result, "example-cli.js");
	});

	it("deduces the CLI name from a bundled Electron executable", (t) => {
		t.mock.property(process, "argv", ["/opt/example/example-app"]);
		t.mock.property(
			(process as ElectronProcess).versions,
			"electron",
			"30.0.0",
		);
		t.mock.property(process as ElectronProcess, "defaultApp", false);

		const result = deduceCLIName();
		assert.equal(result, "example-app");
	});

	it("uses the regular argument detection for an unbundled Electron app", (t) => {
		t.mock.property(process, "argv", [
			"/usr/bin/electron",
			"/tmp/example/cli.js",
		]);
		t.mock.property(
			(process as ElectronProcess).versions,
			"electron",
			"31.0.0",
		);
		t.mock.property(process as ElectronProcess, "defaultApp", true);

		const result = deduceCLIName();
		assert.equal(result, "cli.js");
	});

	it("uses argv[1] when running under Deno", (t) => {
		t.mock.property(process, "argv", [
			"/usr/bin/deno",
			"/tmp/example/deno-cli.ts",
		]);
		t.mock.property(globalThis as DenoGlobal, "Deno", {});

		const result = deduceCLIName();
		assert.equal(result, "deno-cli.ts");
	});

	it("falls back to the executable and exec arguments when argv[1] is absent", (t) => {
		t.mock.property(process, "argv", ["/usr/bin/node"]);
		t.mock.property(process, "execArgv", []);
		t.mock.property(process, "execPath", "/opt/node/bin/node");

		const result = deduceCLIName();
		assert.equal(result, "node");
	});

	it("falls back when Node.js is invoked with --eval", (t) => {
		t.mock.property(process, "argv", ["/usr/bin/node"]);
		t.mock.property(process, "execArgv", ["--eval", 'import "./cli.ts"']);
		t.mock.property(process, "execPath", "/opt/node/bin/node");

		const result = deduceCLIName();
		assert.equal(result, `node --eval 'import "./cli.ts"'`);
	});

	it("falls back when Node.js is invoked with --print", (t) => {
		t.mock.property(process, "argv", ["/usr/bin/node"]);
		t.mock.property(process, "execArgv", ["-p", "1 + 1"]);
		t.mock.property(process, "execPath", "/opt/node/bin/node");

		const result = deduceCLIName();
		assert.equal(result, "node -p '1 + 1'");
	});

	it("quotes arguments containing whitespace and apostrophes", (t) => {
		t.mock.property(process, "argv", ["/usr/bin/node"]);
		t.mock.property(process, "execArgv", ["--flag", "hello world", "it's"]);
		t.mock.property(process, "execPath", "/opt/node/bin/node");

		const result = deduceCLIName();
		assert.equal(result, "node --flag 'hello world' 'it'\\''s'");
	});

	it("removes control characters from quoted fallback arguments", (t) => {
		t.mock.property(process, "argv", ["/usr/bin/node"]);
		t.mock.property(process, "execArgv", [
			"value\0with\u0008control\u001bcharacters",
		]);
		t.mock.property(process, "execPath", "/opt/node/bin/node");

		const result = deduceCLIName();
		assert.equal(result, "node 'valuewithcontrolcharacters'");
	});

	it("falls back when Electron has no bundled executable argument", (t) => {
		t.mock.property(process, "argv", []);
		t.mock.property(process, "execArgv", ["--inspect"]);
		t.mock.property(
			(process as ElectronProcess).versions,
			"electron",
			"32.0.0",
		);
		t.mock.property(process as ElectronProcess, "defaultApp", false);
		t.mock.property(process, "execPath", "/opt/node/bin/node");

		const result = deduceCLIName();
		assert.equal(result, "node --inspect");
	});
});
