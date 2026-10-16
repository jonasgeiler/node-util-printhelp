# `node:util` `printHelp`

> Utility to generate and print CLI help text from a Node.js [`util.parseArgs`][] configuration, designed minimally to resemble a potential future [Node.js built-in][`node:util`]. 

[![Version badge](https://img.shields.io/npm/v/node-util-printhelp?style=for-the-badge&label=Version&labelColor=333&color=e8e8e8)][latest-release]
[![NPM downloads badge](https://img.shields.io/npm/d18m/node-util-printhelp?style=for-the-badge&label=NPM%20Downloads&labelColor=333&color=5fa04e&cacheSeconds=86400)][package-on-npm]
[![JSR score badge](https://jsr.io/badges/@jonasgeiler/node-util-printhelp/score?style=for-the-badge&label=Score&logoColor=fff&labelColor=333&color=e8e8e8&cacheSeconds=86400)][package-on-jsr]
[![Minified size (gzip) badge](https://img.shields.io/bundlejs/size/node-util-printhelp?style=for-the-badge&labelColor=333&color=5fa04e&cacheSeconds=86400)][package-on-bundlejs]

![Example Help Text Screenshot](./.github/assets/example-help-text.svg)

## Example

Here is the code behind the ["Example Help Text" screenshot](#nodeutil-printhelp) above:

```ts
import { parseArgs } from "node:util";
import {
  type ParseArgsConfigWithHelpText,
  printHelp,
} from "node-util-printhelp";

// Configuration is shared between `parseArgs` and `printHelp`.
const config = {
  name: "logreader",
  description:
    "Inspect, filter, and analyze application logs from your terminal.",
  positionalsUsage: "<logfile>",
  footer:
    "Documentation: https://example.com/logreader/docs\n" +
    "Report Issues: https://example.com/logreader/issues",
  allowNegative: true,
  options: {
    follow: {
      type: "boolean",
      short: "f",
      description: "Stream new log entries as they arrive",
    },
    lines: {
      type: "string",
      default: "50",
      short: "n",
      description: "Number of recent lines to display",
    },
    level: {
      type: "string",
      default: "INFO",
      short: "l",
      description: "Filter by log level",
    },
    search: {
      type: "string",
      short: "s",
      description: "Filter entries by text or regular expression",
    },
    timestamps: {
      type: "boolean",
      default: true,
      description: "Don't show timestamps",
    },
    json: {
      type: "boolean",
      short: "j",
      description: "Parse and format JSON log entries",
    },
    version: {
      type: "boolean",
      short: "v",
      description: "Print version information",
    },
    help: {
      type: "boolean",
      short: "h",
      description: "Print help information",
    },
  },
} as const satisfies ParseArgsConfigWithHelpText;

// Parse command-line arguments as configured.
const args = parseArgs(config);
if (args.values.help) {
  // Print help text and exit, if "-h/--help" argument is used.
  printHelp(config);
  process.exit(0);
}

// Handle other arguments...

```

[`util.parseArgs`]: https://nodejs.org/api/util.html#utilparseargsconfig
[`node:util`]: https://nodejs.org/api/util.html
[latest-release]: https://github.com/jonasgeiler/node-util-printhelp/releases/latest
[package-on-bundlejs]: https://bundlejs.com/?q=node-util-printhelp
[package-on-jsr]: https://jsr.io/@jonasgeiler/node-util-printhelp
[package-on-npm]: https://www.npmjs.com/package/node-util-printhelp
