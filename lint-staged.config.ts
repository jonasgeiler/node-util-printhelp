/************************************************************/
/*                 lint-staged config file                  */
/* https://github.com/lint-staged/lint-staged*configuration */
/************************************************************/

import { access as fileExists } from "node:fs/promises";
import {
	parse as parsePath,
	relative as relativePath,
	resolve as resolvePath,
} from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "lint-staged/config";

const projectRoot = resolvePath(fileURLToPath(new URL(".", import.meta.url)));

export default defineConfig({
	// Lint all the files covered by biome.
	"*.{js,ts,svg,json,jsonc}": "biome check",

	// Run tsc on JS/TS changes, but without file path arguments.
	"*.{js,ts}": () => "tsc",

	// Run tests on changed test files, as well as test files related to changed
	// source files.
	"{src,test}/**/*.{js,ts}": async (filePaths) => {
		const testFilePaths = new Set<string>();
		await Promise.all(
			filePaths.map(async (filePath) => {
				const {
					dir: dirPath,
					name: fileName,
					ext: fileExt,
				} = parsePath(filePath);
				if (fileName.endsWith(".test")) {
					// Matched a test file, just add it as-is.
					testFilePaths.add(filePath);
				} else {
					const testFilePath = resolvePath(
						projectRoot,
						"test",
						relativePath(
							// Preserve the source directory structure under ./test.
							resolvePath(projectRoot, "src"),
							dirPath,
						),
						fileName + ".test" + fileExt,
					);
					try {
						await fileExists(testFilePath);
						testFilePaths.add(testFilePath);
					} catch {
						// No related test file.
					}
				}
			}),
		);

		return testFilePaths.size
			? `node --test ${[...testFilePaths].join(" ")}`
			: [];
	},
});
