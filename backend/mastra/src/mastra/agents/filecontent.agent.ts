import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

export const fileContentAgent = new Agent({
  id: 'file_content_agent',
  name: 'File Content Analyzer',
  instructions: `ALWAYS return valid JSON: {imports: string[], exports: string[]}. No other text.

Extract imports and exports from code files. 
- Imports: format as "module.entity" (e.g., "path.join"). For local imports: resolve relative paths to absolute (e.g., "./config" → "/project/src/config") and remove extensions.
- Exports: list exported names.

Example: {"imports": ["path.join", "/project/src/config"], "exports": ["myFunction"]}`,
  model: 'openai/gpt-5-mini'
});