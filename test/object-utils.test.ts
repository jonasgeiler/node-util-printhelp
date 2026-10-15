import * as assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isNonEmptyObject } from "../src/object-utils.ts";

describe("isNonEmptyObject", () => {
	it("returns true when given a plain non-empty object", () => {
		assert.equal(
			isNonEmptyObject({ name: "hello" }),
			true,
			'Expected { name: "hello" } to be considered a non-empty object',
		);
	});

	it("returns false when given a plain empty object", () => {
		assert.equal(
			isNonEmptyObject({}),
			false,
			"Expected {} to be considered an empty object",
		);
	});

	it("returns false when given a falsy value", () => {
		assert.equal(
			isNonEmptyObject(undefined),
			false,
			"Expected undefined to be considered an empty object",
		);
		assert.equal(
			// @ts-expect-error because null is technically not accepted, but let's test it anyway.
			isNonEmptyObject(null),
			false,
			"Expected null to be considered an empty object",
		);
	});
});
