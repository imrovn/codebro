// import { createAction } from "./actions";
// import { exec, spawn } from "node:child_process";
// import { promisify } from "node:util";
// import * as path from "node:path";
// import * as fs from "node:fs";
//
// const execAsync = promisify(exec);
// const readdirAsync = promisify(fs.readdir);
// const statAsync = promisify(fs.stat);
//
// // For TypeScript to recognize process
// declare const process: {
//     cwd(): string;
// };
//
// interface ListParameters {
//     relativePath: string;
// }
//
// interface CommandParameters {
//     command: string;
//     isBackground?: boolean;
//     requireUserApproval?: boolean;
// }
//
// async function getFileInfo(filePath: string): Promise<{
//     name: string;
//     type: 'file' | 'directory' | 'symlink' | 'other';
//     size: number;
//     modified: Date;
// }> {
//     const stats = await statAsync(filePath);
//     return {
//         name: path.basename(filePath),
//         type: stats.isFile() ? 'file' :
//               stats.isDirectory() ? 'directory' :
//               stats.isSymbolicLink() ? 'symlink' : 'other',
// // Mock implementations since we don't have direct access to the file system in browser environment
// async function mockListDirectory(directory: string) {
//     console.log(`Listing directory: ${directory}`);
//     // This would be replaced with actual implementation in a Node.js environment
//     return [
//         { name: "example.txt", type: "file" },
//         { name: "example-dir", type: "directory" },
//     ];
// }
//
// async function mockExecuteCommand(command: string, options: any) {
//     console.log(`Executing command: ${command} with options:`, options);
//     // This would be replaced with actual implementation in a Node.js environment
//     return {
//         stdout: `Mock execution of: ${command}`,
//         stderr: "",
//         exitCode: 0,
//     };
// }
//
// export const listDirectory = createAction({
//     id: "list_dir",
//     description: "List contents of a directory",
//     parameters: {
//         type: "object",
//         properties: {
//             relativePath: {
//                 type: "string",
//                 description: "Relative workspace path to list",
//             },
//         },
//         required: ["relativePath"],
//     },
//     async run({ parameters }) {
//         const { relativePath } = parameters as { relativePath: string };
//
//         try {
//             // In a real implementation, this would use fs.readdir
//             const entries = await mockListDirectory(relativePath);
//             return {
//                 directory: relativePath,
//                 entries,
//             };
//         } catch (error) {
//             throw new Error(`Failed to list directory: ${error.message}`);
//         }
//     },
// });
//
// export const runTerminalCommand = createAction({
//     id: "run_terminal_cmd",
//     description:
//         "Execute terminal commands with optional background processing",
//     parameters: {
//         type: "object",
//         properties: {
//             command: {
//                 type: "string",
//                 description: "Command to execute",
//             },
//             isBackground: {
//                 type: "boolean",
//                 description: "Whether to run in background",
//                 default: false,
//             },
//             requireUserApproval: {
//                 type: "boolean",
//                 description: "Whether user approval is needed",
//                 default: false,
//             },
//         },
//         required: ["command"],
//     },
//     async run({ parameters }) {
//         const { command, isBackground, requireUserApproval } = parameters as {
//             command: string;
//             isBackground?: boolean;
//             requireUserApproval?: boolean;
//         };
//
//         // Validate command
//         if (command.includes("\n")) {
//             throw new Error("Command cannot contain newlines");
//         }
//
//         if (requireUserApproval) {
//             console.log("User approval required for command:", command);
//             // In a real implementation, this would prompt for user approval
//         }
//
//         try {
//             // In a real implementation, this would use child_process.exec or similar
//             const result = await mockExecuteCommand(command, {
//                 background: isBackground || false,
//             });
//
//             return {
//                 command,
//                 background: isBackground || false,
//                 ...result,
//             };
//         } catch (error) {
//             throw new Error(`Command execution failed: ${error.message}`);
//         }
//     },
// });
