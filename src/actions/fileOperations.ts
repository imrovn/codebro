// import { createAction } from "./actions";
// import * as fs from "node:fs";
// import * as path from "node:path";
// import { promisify } from "node:util";
// import { z } from "zod";
//
// const readFileAsync = promisify(fs.readFile);
// const writeFileAsync = promisify(fs.writeFile);
// const unlinkAsync = promisify(fs.unlink);
// const accessAsync = promisify(fs.access);
// const mkdirAsync = promisify(fs.mkdir);
// const statAsync = promisify(fs.stat);
//
// // For TypeScript to recognize process
// declare const process: {
//   cwd(): string;
// };
//
// async function ensureDirectoryExists(filePath: string): Promise<void> {
//   const dir = path.dirname(filePath);
//   try {
//     await accessAsync(dir, fs.constants.W_OK);
//   } catch {
//     await mkdirAsync(dir, { recursive: true });
//   }
// }
//
// export const readFile = createAction({
//   id: "read_file",
//   description: "Read file contents with line range support. Maximum 250 lines per read.",
//   parameters: z.object({
//     relativePath: z.string().description("Relative workspace path to the file"),
//     startLine: z.number().min(1).optional().description("Starting line number (1-indexed)"),
//     endLine: z.number().min(1).optional().description("Ending line number (1-indexed, inclusive)"),
//   }),
//   async run({ relativePath, startLine, endLine }) {
//     // Validate file exists and is readable
//     const absolutePath = path.resolve(process.cwd(), relativePath);
//     try {
//       const stats = await statAsync(absolutePath);
//       if (!stats.isFile()) {
//         throw new Error(`Path is not a file: ${relativePath}`);
//       }
//       await accessAsync(absolutePath, fs.constants.R_OK);
//     } catch (error) {
//       throw new Error(`File not found or not readable: ${relativePath}`);
//     }
//
//     // Read file content
//     const content = await readFileAsync(absolutePath, "utf-8");
//     const lines = content.split("\n");
//
//     // Handle line range
//     if (endLine && startLine) {
//       if (startLine < 1) {
//         throw new Error("Starting line must be at least 1");
//       }
//       if (endLine < startLine) {
//         throw new Error("End line must be greater than or equal to start line");
//       }
//       if (endLine - startLine > 250) {
//         throw new Error("Cannot read more than 250 lines at once");
//       }
//       if (startLine > lines.length || endLine > lines.length) {
//         throw new Error(`Line range out of bounds. File has ${lines.length} lines`);
//       }
//       return lines.slice(startLine - 1, endLine).join("\n");
//     }
//
//     return content;
//   },
// });
//
// export const editFile = createAction({
//   id: "edit_file",
//   description: "Modify existing files while preserving unchanged sections",
//   parameters: {
//     type: "object",
//     properties: {
//       targetFile: {
//         type: "string",
//         description: "Path to the file to edit",
//       },
//       instructions: {
//         type: "string",
//         description: "Edit instructions",
//       },
//       codeEdit: {
//         type: "string",
//         description: "The code changes to apply",
//       },
//     },
//     required: ["targetFile", "codeEdit"],
//   },
//   async run({ parameters }) {
//     const { targetFile, codeEdit } = parameters;
//     const absolutePath = path.resolve(process.cwd(), targetFile);
//
//     // Ensure directory exists
//     await ensureDirectoryExists(absolutePath);
//
//     // Check if file exists and is writable
//     try {
//       const stats = await statAsync(absolutePath);
//       if (!stats.isFile()) {
//         throw new Error(`Path is not a file: ${targetFile}`);
//       }
//       await accessAsync(absolutePath, fs.constants.W_OK);
//     } catch (error) {
//       if (error.code === "ENOENT") {
//         // File doesn't exist, that's okay - we'll create it
//       } else {
//         throw new Error(`File not writable: ${targetFile}`);
//       }
//     }
//
//     // Write changes with atomic write
//     const tempPath = `${absolutePath}.tmp`;
//     try {
//       await writeFileAsync(tempPath, codeEdit, "utf-8");
//       await fs.promises.rename(tempPath, absolutePath);
//       return { success: true };
//     } catch (error) {
//       // Clean up temp file if it exists
//       try {
//         await unlinkAsync(tempPath);
//       } catch {}
//       throw new Error(`Failed to write file: ${targetFile}. ${error.message}`);
//     }
//   },
// });
//
// export const deleteFile = createAction({
//   id: "delete_file",
//   description: "Remove files from the workspace",
//   parameters: {
//     type: "object",
//     properties: {
//       targetFile: {
//         type: "string",
//         description: "Path to the file to delete",
//       },
//     },
//     required: ["targetFile"],
//   },
//   async run({ parameters }) {
//     const { targetFile } = parameters;
//     if (!targetFile) {
//       throw new Error(`Path is not a file: ${targetFile}`);
//     }
//     const absolutePath = path.resolve(process.cwd(), targetFile);
//
//     try {
//       const stats = await statAsync(absolutePath);
//       if (!stats.isFile()) {
//         throw new Error(`Path is not a file: ${targetFile}`);
//       }
//       await accessAsync(absolutePath, fs.constants.W_OK);
//       await unlinkAsync(absolutePath);
//       return { success: true };
//     } catch (error) {
//       if (error?.code === "ENOENT") {
//         throw new Error(`File not found: ${targetFile}`);
//       }
//       throw new Error(`Failed to delete file: ${targetFile}. ${error.message}`);
//     }
//   },
// });
