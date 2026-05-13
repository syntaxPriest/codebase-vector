import { cytoscapeEdgeSchema, cytoscapeGraphSchema } from "../schemas/schema";
import { createTool } from "@mastra/core/tools";
import { compressEdgesOutputSchema } from "../schemas/schema";
import z from "zod";

export const compressEdgesTool = createTool({
    id: "compress-edges",
    description: "Compress the edges list by removing unncessary properties from the object.",
    inputSchema: z.object({
        edges: z.array(cytoscapeEdgeSchema.describe('Array of edges connecting nodes in the graph')),
    }),
    outputSchema: compressEdgesOutputSchema.describe("Compressed edges data structure"),
    execute: async (inputData) => {
        const compressedEdges = inputData.edges.map(edge => {
            const { source, target, importedProperty } = edge.data;
            return {
                source,
                target,
                importedProperties: importedProperty ? [importedProperty] : []
            }
        });

        return { edges: compressedEdges };
    }
})