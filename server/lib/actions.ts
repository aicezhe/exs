import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Every command is a fixed program + fixed arguments. Nothing from the
// request ever reaches these arrays: the label is only used as a key.
function run(file: string, args: string[]) {
  return execFileAsync(file, args, { timeout: 10_000 });
}

// Hides (not quits) every visible foreground app except VS Code and Safari.
const HIDE_OTHERS_SCRIPT = `
tell application "System Events"
  set visible of (every application process whose visible is true and background only is false and name is not "Code" and name is not "Safari") to false
end tell
`;

export type Action = {
  description: string;
  run: () => Promise<string>;
};

export const ACTIONS: Readonly<Record<string, Action>> = Object.freeze({
  telegram: {
    description: "open Telegram",
    run: async () => {
      await run("open", ["-a", "Telegram"]);
      return "opened Telegram";
    },
  },
  elly: {
    description: "open Elly courses page",
    run: async () => {
      await run("open", ["https://elly2026.didattica.unipr.it/my/courses.php"]);
      return "opened Elly courses page";
    },
  },
  slack: {
    description: "open Slack",
    run: async () => {
      await run("open", ["-a", "Slack"]);
      return "opened Slack";
    },
  },
  focus: {
    description: "hide all apps except VS Code and Safari, turn on Do Not Disturb",
    run: async () => {
      await run("osascript", ["-e", HIDE_OTHERS_SCRIPT]);
      try {
        await run("shortcuts", ["run", "exs focus on"]);
        return "hid other apps, Do Not Disturb on";
      } catch (err) {
        console.error('[focus] shortcut "exs focus on" failed:', err);
        return 'hid other apps; shortcut "exs focus on" failed (see server log)';
      }
    },
  },
});

export const IGNORED_LABELS: ReadonlySet<string> = new Set(["noise", "unknown"]);

export function isKnownAction(label: string): boolean {
  return Object.hasOwn(ACTIONS, label);
}

export async function runAction(label: string, dryRun: boolean): Promise<string> {
  if (!isKnownAction(label)) throw new Error(`unknown action: ${label}`);
  const action = ACTIONS[label];
  if (dryRun) return `[dry-run] would ${action.description}`;
  return action.run();
}
