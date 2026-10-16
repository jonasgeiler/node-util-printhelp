import { printHelp } from "../../src/printhelp.ts";

// Run this to copy the help text with ANSI colors to the Wayland clipboard:
//  COLUMNS=1000 FORCE_COLOR=1 node ./example-help-text.js | wl-copy
// Afterward, use https://boron.sh to create a nice SVG terminal "screenshot".
// Link with my config: https://boron.sh/?v=1&content=zhZK9jtswEIR7v4KbwTVJAEu-S5BG-akOBziFfcghlZGCllY2DyRX2F3ZVp4-oOyc1YUdd2Y-LAdcJe2otgVaH4xkAZcauOTC8Ifgui742pnnhMB7RSscMXAvMJLokwvlbDbfPsRf6vZUZZOQa0iw5S7H9De-Bt63PtD3-fY-Xtybi1aNk_n24cunjxEo2gWKouUQ-JQVjOfFhFxEolOmg5KJJ4VT2IEGOBF_pAnkNUNeldMNATw7URqf1rJEZ_jxsllPeRNAyIBARwrfyrK8Up7GdrAbxtCo4n1DreuDVbhbrZ82dx8mkDRCfCKdQNZ93JGAWwjVlAyjAcZovHbBDRPk5_sprkhcmI-k5mKnV9wjp3cGPfAJN20S0ryDkpP6cFvi-pB_Ne4GGJ0NLBDa98EJ6NwJqXpOE9Yxs44kefxW7LP4ZLhO4dOl2xycPXLdR0o2XisczDqtlks6u9gFKmuOy7e_smy41tlP6lgMK9We9H8JP7r-Ag&theme=nord&backdrop=none&syntax=ansi&padding=48&radius=12&titleBar=1&title=Example+Help+Text&shadow=100&columns=80&aspect=og

printHelp({
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
			default: 50,
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
	},
});
