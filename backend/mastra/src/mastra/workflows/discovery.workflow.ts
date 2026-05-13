import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { listFiles, readFiles } from "../tools/filesystem.tool";
import { generateEdgesTool } from "../tools/generateEdges.tool";
import { compressEdgesTool } from "../tools/compressEdges.tool";
import { discoveryWorkflowInputSchema, discoveryWorkflowOutputSchema } from "../schemas/schema";
import { generateHighLevelGraphTool } from "../tools/generateHighLevelGraph.tool";
import { generateCodebaseSummaryTool } from "../tools/generateCodebaseSummary.tool";
import { fileReconTool } from "../tools/fileRecon.tool";

const listFilesStep = createStep(listFiles);
const readFilesStep = createStep(readFiles);
const generateEdgesStep = createStep(generateEdgesTool);
const compressEdgesStep = createStep(compressEdgesTool);
const generateHighLevelGraphStep = createStep(generateHighLevelGraphTool);
const generateSummaryStep = createStep(generateCodebaseSummaryTool);
const fileContentReconStep = createStep(fileReconTool)

export const discoveryWorkflow = createWorkflow({
    id: "project_discovery_workflow",
    inputSchema: discoveryWorkflowInputSchema,
    outputSchema: discoveryWorkflowOutputSchema
})
.then(listFilesStep)
.then(readFilesStep)
.then(fileContentReconStep)
.then(generateEdgesStep)
.then(compressEdgesStep)
.then(generateHighLevelGraphStep)
.then(generateSummaryStep)
.commit()