import * as assert from "node:assert/strict";
import { describe, it } from "node:test";
import { indentText, wrapText } from "../src/text-utils.ts";

describe("indentText", () => {
	it("indents a single line", () => {
		assert.equal(indentText("hello", 2), "  hello");
	});

	it("indents every line in multiline text", () => {
		assert.equal(
			indentText("first\nsecond\nthird", 3),
			"   first\n   second\n   third",
		);
	});

	it("indents empty lines", () => {
		assert.equal(indentText("first\n\nthird", 2), "  first\n  \n  third");
	});

	it("returns the text unchanged for zero depth", () => {
		assert.equal(indentText("hello\nworld", 0), "hello\nworld");
	});

	it("preserves existing indentation", () => {
		assert.equal(indentText("  hello\n\tworld", 2), "    hello\n  \tworld");
	});
});

describe("wrapText", () => {
	it("leaves text shorter than the maximum width unchanged", () => {
		assert.equal(wrapText("hello", 10), "hello");
	});

	it("leaves text at exactly the maximum width unchanged", () => {
		assert.equal(wrapText("hello", 5), "hello");
	});

	it("wraps text at word boundaries", () => {
		assert.equal(wrapText("hello world", 1), "hello\nworld");
	});

	it("wraps multiple lines", () => {
		assert.equal(wrapText("one two three four", 7), "one two\nthree\nfour");
	});

	it("preserves existing newlines", () => {
		assert.equal(wrapText("one\ntwo three", 15), "one\ntwo three");
		assert.equal(wrapText("one two\nthree four", 20), "one two\nthree four");
	});

	it("handles empty text", () => {
		assert.equal(wrapText("", 10), "");
	});

	it("preserves text without spaces", () => {
		assert.equal(wrapText("helloworld", 5), "helloworld");
	});
});
