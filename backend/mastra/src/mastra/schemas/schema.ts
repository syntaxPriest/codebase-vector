import z from "zod";


// Define the input schema as an object with a single property containing the discovery data
export const generateMapInputSchema = z.object({
    discoveryData: z.array(z.object({
        filePath: z.string().describe('File path'),
        exports: z.array(z.string()).describe('Array of exported symbols from the file'),
        imports: z.array(z.string()).describe('Array of import statements in the file')
    })).describe('Array of file analysis results from discovery workflow')
});

// Define Cytoscape element schemas
export const cytoscapeNodeSchema = z.object({
    data: z.object({
        id: z.string().describe('Unique identifier for the node'),
        label: z.string().describe('Display label for the node'),
        description: z.string().optional().describe('Description of the node\'s purpose'),
        filePath: z.string().optional().describe('Full file path for file nodes'),
        exports: z.array(z.string()).optional().describe('Array of exported symbols for file nodes'),
        imports: z.array(z.string()).optional().describe('Array of import statements for file nodes'),
        size: z.number().optional().describe('Visual size of the node in the graph visualization')
    })
});

export const cytoscapeEdgeSchema = z.object({
    data: z.object({
        id: z.string().describe('Unique identifier for the edge'),
        source: z.string().describe('ID of the source node'),
        target: z.string().describe('ID of the target node'),
        type: z.enum(['imports', 'exports', 'contains']).optional().describe('Type of relationship between nodes'),
        label: z.string().optional().describe('Display label for the edge'),
        importedProperty: z.string().optional().nullable().describe('Specific property being imported (if applicable)'),
        importCount: z.number().optional().describe('Number of imports consolidated in this edge'),
        allImports: z.array(z.string()).optional().describe('Array of all imported properties for this edge')
    })
});

export const cytoscapeGraphSchema = z.object({
    elements: z.object({
        nodes: z.array(cytoscapeNodeSchema).describe('Array of nodes in the graph'),
        edges: z.array(cytoscapeEdgeSchema).describe('Array of edges connecting nodes in the graph')
    }).describe('Graph elements including nodes and edges')
});

export const compressEdgesOutputSchema = z.object({
    edges: z.array(z.object({
        source: z.string().describe('ID of the source node'),
        target: z.string().describe('ID of the target node'),
        importedProperties: z.array(z.string()).describe('Array of imported properties for this edge'),
    }))
})

export const generateGraphOutputSchema = z.object({
    elements: z.object({
        nodes: z.array(z.object({
            data: z.object({
                id: z.string().describe('Unique identifier for the node'),
                label: z.string().describe('Display label for the node'),
                description: z.string().describe('Description of the node\'s purpose'),
                type: z.string().describe('Type of the node (e.g., group)'),
                memberCount: z.number().describe('Number of members in the group'),
                members: z.array(z.string()).describe('Array of member files'),
                size: z.number().describe('Visual size of the node in the graph visualization'),
                color: z.string().describe('Color of the node in the graph visualization')
            })
        })).describe('Array of nodes in the graph'),
        edges: z.array(z.object({
            data: z.object({
                id: z.string().describe('Unique identifier for the edge'),
                source: z.string().describe('ID of the source node'),
                target: z.string().describe('ID of the target node'),
                type: z.enum(['imports', 'exports', 'contains']).describe('Type of relationship between nodes'),
                label: z.string().describe('Display label for the edge'),
                importCount: z.number().describe('Number of imports consolidated in this edge'),
                importedProperties: z.array(z.string()).describe('Array of imported properties for this edge')
            })
        })).describe('Array of edges connecting nodes in the graph')
    }).describe('Graph data structure compatible with Cytoscape visualization library')
});

export const discoveryWorkflowOutputSchema = z.object({
    ...generateGraphOutputSchema.shape,
    summary: z.string().describe('Summary analysis of the graph structure')
})

export const graphProjectionOutputSchema = z.union([
    discoveryWorkflowOutputSchema,
    z.array(discoveryWorkflowOutputSchema)
]).describe('Single graph projection or array of multiple graph projections')

export const fileReconInputSchema = z.object({
    files: z.array(z.object({
        filePath: z.string().describe('File path'),
        content: z.string().describe('File content')
    }))
})

export const fileReconOutputSchema = z.object({
    discoveryData: z.array(z.object({
        filePath: z.string().describe('File path'),
        exports: z.array(z.string()).describe('Array of exported symbols from the file'),
        imports: z.array(z.string()).describe('Array of import statements in the file')
    }))
})

export const discoveryWorkflowInputSchema = z.object({
    basepath: z.string().describe('Base directory path to scan'),
    exclude: z.array(z.string()).optional().default([]).describe('Array of patterns to exclude (supports wildcards *)'),
});

export const codebaseGraphGeneratorWorkflowOutputSchema = z.object({
    elements: z.object({
        nodes: z.array(z.object({
            data: z.object({
                id: z.string(),
                label: z.string(),
                type: z.enum(['file', 'export', 'import']).optional(),
                description: z.string().optional(),
                filePath: z.string().optional(),
                exports: z.array(z.string()).optional(),
                imports: z.array(z.string()).optional(),
                size: z.number().optional()
            })
        })),
        edges: z.array(z.object({
            data: z.object({
                id: z.string(),
                source: z.string(),
                target: z.string(),
                type: z.enum(['imports', 'exports', 'contains']).optional(),
                label: z.string().optional(),
                importedProperty: z.string().optional().nullable()
            })
        }))
    }),
    summary: z.string().describe('Summary analysis of the graph structure')
})

export const exclusionPatternInputSchema = z.object({
    "file-extensions": z.object({
        extensions: z.array(z.string()).describe('Array of file extensions'),
        basepath: z.string().describe('Base directory path that was scanned')
    }),
    "subdirectories": z.object({
        subdirectories: z.array(z.string()).describe('Array of sub directories'),
        basepath: z.string().describe('Base directory path that was scanned')
    })
})

export const exclusionPatternWorkflowInputSchema = z.object({
    basepath: z.string().describe('Base directory path to scan'),
})