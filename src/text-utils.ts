/**
 * Ident text width spaces to make it start at given depth.
 * @param text
 * @param depth
 */
export function indentText(text: string, depth: number) {
	// Adapted from: https://github.com/nodejs/node/blob/342bf6d66940f8c72a6a36bef44d7010d6b347b1/lib/internal/main/print_help.js#L93-L95
	return text.replace(/^/gm, " ".repeat(depth));
}

/**
 * Wrap text with newlines after full words exceeding given max width.
 * @param text
 * @param maxWidth
 */
export function wrapText(text: string, maxWidth: number) {
	if (!Number.isSafeInteger(maxWidth)) {
		const error = new Error("Invalid maxWidth: " + maxWidth);
		error.name = "WrapTextError";
		throw error;
	}

	// Adapted from: https://github.com/nodejs/node/blob/342bf6d66940f8c72a6a36bef44d7010d6b347b1/lib/internal/main/print_help.js#L97-L103
	return text.replace(
		new RegExp(`([^\n]{0,${maxWidth}})( |$)`, "gm"),
		(_, newLine, end) => newLine + (end === " " ? "\n" : ""),
	);
}
