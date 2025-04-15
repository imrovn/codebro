import ora, { type Ora } from "ora";

export class OraManager {
  private spinner: Ora | null = null;

  start(message: string) {
    if (this.spinner) this.spinner.stop();
    this.spinner = ora({ text: message, discardStdin: false }).start();
  }

  update(message: string) {
    if (this.spinner) this.spinner.text = message;
  }

  succeed(message?: string) {
    if (this.spinner) {
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
