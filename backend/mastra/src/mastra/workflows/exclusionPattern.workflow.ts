import { createWorkflow, createStep } from "@mastra/core/workflows";
import { listFiles, fileExtensions, subdirectories } from "../tools/filesystem.tool";
import { exclusionPatternTool } from "../tools/exclusionPattern.tool";
import { discoveryWorkflowInputSchema, exclusionPatternWorkflowInputSchema } from "../schemas/schema";

const listFilesStep = createStep(listFiles);
const fileExtensionsStep = createStep(fileExtensions);
const subDirectoriesStep = createStep(subdirectories);
const exclusionPatternsStep = createStep(exclusionPatternTool);

export const exclusionPatternWorkflow = createWorkflow({
  id: "exclusion_pattern_workflow",
  inputSchema: exclusionPatternWorkflowInputSchema,
  outputSchema: discoveryWorkflowInputSchema,
})
.then(listFilesStep)
.parallel([fileExtensionsStep, subDirectoriesStep])
.then(exclusionPatternsStep)
.commit()