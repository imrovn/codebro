// import { createAction } from "./actions";
//
// // For TypeScript to recognize process
// declare const process: {
//     cwd(): string;
// };
//
// // Mock implementation since we don't have direct access to the file system in browser environment
// async function mockSearch(query: string, options: any) {
//     console.log(`Searching for: ${query} with options:`, options);
//     // This would be replaced with actual implementation in a Node.js environment
//     return [];
// }
//
// export const codebaseSearch = createAction({
//     id: "codebase_search",
//     description: "Perform semantic search across the codebase",
//     parameters: {
//         type: "object",
//         properties: {
//             query: {
//                 type: "string",
//                 description: "Search query text",
//             },
//             targetDirectories: {
//                 type: "array",
//                 items: { type: "string" },
//                 description: "Optional list of directories to search in",
//             },
//         },
//         required: ["query"],
//     },
//     async run({ parameters }) {
//         const { query, targetDirectories } = parameters as {
//             query: string;
//             targetDirectories?: string[];
//         };
//
//         const searchDirs = targetDirectories || ["."];
//
//         try {
//             // In a real implementation, this would use a library or system command
//             // to perform the search
//             const results = await mockSearch(query, {
//                 directories: searchDirs,
//                 semanticSearch: true,
//             });
//
//             return {
//                 query,
//                 directories: searchDirs,
//                 results,
//             };
//         } catch (error) {
//             throw new Error(`Semantic search failed: ${error.message}`);
//         }
//     },
// });
//
// export const grepSearch = createAction({
//     id: "grep_search",
//     description: "Fast regex-based search limited to 50 matches",
//     parameters: {
//         type: "object",
//         properties: {
//             query: {
//                 type: "string",
//                 description: "Regex search pattern",
//             },
//             caseSensitive: {
//                 type: "boolean",
//                 description: "Whether to perform case-sensitive search",
//                 default: false,
//             },
//             includePattern: {
//                 type: "string",
//                 description: "Pattern for files to include",
//             },
//             excludePattern: {
//                 type: "string",
//                 description: "Pattern for files to exclude",
//             },
//         },
//         required: ["query"],
//     },
//     async run({ parameters }) {
//         const { query, caseSensitive, includePattern, excludePattern } =
//             parameters as {
//                 query: string;
//                 caseSensitive?: boolean;
//                 includePattern?: string;
//                 excludePattern?: string;
//             };
//
//         try {
//             // In a real implementation, this would use a library or system command
//             // like ripgrep to perform the search
//             const results = await mockSearch(query, {
//                 caseSensitive: caseSensitive || false,
//                 include: includePattern,
//                 exclude: excludePattern,
//                 maxResults: 50,
//             });
//
//             return {
//                 query,
//                 options: {
//                     caseSensitive: caseSensitive || false,
//                     includePattern,
//                     excludePattern,
//                 },
//                 results: results.slice(0, 50), // Ensure max 50 results
//             };
//         } catch (error) {
//             throw new Error(`Grep search failed: ${error.message}`);
//         }
//     },
// });
