import ora, { type Ora } from "ora";
import chalk from "chalk";

export class OraManager {
  private spinner: Ora | null = null;

  start(message: string, suffix: string = "") {
    if (this.spinner) this.spinner.stop();
    const options = { text: message, discardStdin: false, suffixText: suffix };
    this.spinner = ora(options).start();
  }

  startTool(message: string, suffix: string = "") {
    this.start(message, suffix);
    if (this.spinner) {
      this.spinner.prefixText = chalk.dim("[tool]");
    }
  }

  update(message: string) {
    if (this.spinner) this.spinner.text = message;
  }

  updateWithSuffix(message: string, suffix: string) {
    if (this.spinner) {
      this.spinner.text = message;
      this.spinner.suffixText = suffix;
    }
  }

  append(chunk: string) {
    if (this.spinner) this.spinner.text = this.spinner.text + chunk;
  }

  succeed(message?: string, suffix: string = "") {
    if (this.spinner) {
      if (suffix) {
        this.spinner.suffixText = suffix;
      }
      this.spinner.succeed(message);
      this.spinner = null;
    }
  }

  fail(message?: string) {
    if (this.spinner) {
      this.spinner.fail(message);
      this.spinner = null;
    }
  }

  stop() {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }
}

export function formatSuffix(suffix: string) {
  return suffix ? `\t [${suffix}]` : suffix;
}
