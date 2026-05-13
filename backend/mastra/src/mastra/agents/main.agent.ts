import { Agent } from '@mastra/core/agent';
import { codebaseGraphGeneratorWorkflow } from '../workflows/codebaseGraphGenerator.workflow';
import { graphProjectionOutputSchema } from '../schemas/schema';
import { readFiles } from '../tools/filesystem.tool';
import { fileReconTool } from '../tools/fileRecon.tool';
import { cloneRepositoryTool } from '../tools/cloneRepository.tool';

export const mainAgent = new Agent({
  id: 'main_agent',
  name: 'Codebase Graph Generator',
  instructions: `You generate dynamic visual projections of any codebase.

    Input can be a GitHub URL or a local filesystem path. For GitHub URLs, first use cloneRepository to clone the repo to a temp directory, then use the returned basepath.

    Start by running the codebaseGraphGeneratorWorkflow to get base graph data and summary. The workflow handles the full pipeline: listing files, reading contents, extracting imports/exports, generating edges, and producing a high-level graph with summary.

    To build alternative projections (execution flow, data flow, API map, etc.), read specific files with readFiles then analyze them with fileReconTool to understand their internal structure — imports, exports, and dependencies. Use this content-level knowledge to draw richer relationships.

    Output pure JSON: single object or array of {elements:{nodes:[{data:{id,label,type,description,memberCount,members,size,color}}],edges:[{data:{id,source,target,type,label,importCount,importedProperties}}]},summary:string}. No markdown.`,
  model: 'openai/gpt-5-mini',
  workflows: { codebaseGraphGeneratorWorkflow },
  tools: {
    readFiles,
    fileReconTool,
    cloneRepositoryTool
  },
});