import { exec } from "node:child_process";

/**
 * Gets the current content from the clipboard
 */
export async function getClipboardContent(): Promise<string | undefined> {
  try {
    return await getClipboardData();
  } catch (error: any) {
    console.warn("Could not access clipboard:", error);
    return undefined;
  }
}

/**
 * Platform-specific clipboard access
 */
function getClipboardData(): Promise<string> {
  return new Promise((resolve, reject) => {
    let command = "";

    if (process.platform === "darwin") {
      command = "pbpaste";
    } else if (process.platform === "win32") {
      command = 'powershell.exe -command "Get-Clipboard"';
    } else if (process.platform === "linux") {
      command = "xclip -selection clipboard -o";
    } else {
      reject(new Error("Unsupported platform"));
      return;
    }

    exec(command, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout.trim());
    });
  });
}

/**
 * Writes content to the clipboard
 */
export function writeToClipboard(content: string): Promise<boolean> {
  return new Promise(resolve => {
    let command = "";

    if (process.platform === "darwin") {
      // For macOS
      command = `echo "${content}" | pbcopy`;
    } else if (process.platform === "win32") {
      // For Windows
      command = `powershell.exe -command "Set-Clipboard -Value '${content}'"`;
    } else if (process.platform === "linux") {
      // For Linux
      command = `echo "${content}" | xclip -selection clipboard`;
    } else {
      console.error("Unsupported platform for clipboard operations");
      resolve(false);
      return;
    }

    exec(command, error => {
      if (error) {
        console.error("Error writing to clipboard:", error);
        resolve(false);
        return;
      }
      resolve(true);
    });
  });
}
