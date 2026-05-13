import { createTool } from '@mastra/core/tools';
import { generateMapInputSchema, cytoscapeEdgeSchema, cytoscapeGraphSchema, cytoscapeNodeSchema } from '../schemas/schema';
import z from 'zod';

export const generateEdgesTool = createTool({
  id: 'generate-edges',
  description: 'Transform discovery workflow output into Cytoscape-compatible edges',
  inputSchema: generateMapInputSchema,
  outputSchema: z.object({
    edges : z.array(cytoscapeEdgeSchema)
  }),
  execute: async (inputData) => {

    const checkIfFileExists = (filePaths : Array<string>, filePath : string) : string =>{
        for(let i = 0; i < filePaths.length; i++){
            if(filePaths[i].startsWith(filePath)){
                return filePaths[i];
            }
        }

        return '';
    }
    
    const edges: Array<{ data: any }> = [];

    const files = inputData.discoveryData;
    const filePaths = files.map(file => file.filePath);

    // Second pass: create nodes with size based on depth
    for(let i = 0; i < files.length; i++) {
      const currentFile = files[i];
      const filePath = currentFile.filePath;

      // Group imports by source file to consolidate multiple imports into single edges
      const importGroups: Record<string, string[]> = {};
      
      for(let j = 0; j < currentFile.imports.length; j++) {
        const importTarget = currentFile.imports[j];
        const importSplitted = importTarget.split('.');
        const importedProperty = importSplitted[importSplitted.length - 1];
        importSplitted.pop();
        const importFilePath = importSplitted.join('.');

        const foundFilePath = checkIfFileExists(filePaths, importFilePath);
        if(foundFilePath && importFilePath){
          if (!importGroups[foundFilePath]) {
            importGroups[foundFilePath] = [];
          }
          importGroups[foundFilePath].push(importedProperty);
        }
      }

      // Create consolidated edges for each source file
      for (const [sourceFilePath, importedProperties] of Object.entries(importGroups)) {
        const edgeId = `${filePath}-imports-${sourceFilePath}`;
        
        // Create aggregated label: first property + count of remaining
        let edgeLabel = '';
        let importedProperty = '';
        
        if (importedProperties.length === 1) {
          edgeLabel = importedProperties[0];
          importedProperty = importedProperties[0];
        } else {
          const firstProperty = importedProperties[0];
          const remainingCount = importedProperties.length - 1;
          edgeLabel = `${firstProperty} and ${remainingCount} others`;
          importedProperty = importedProperties.join(', ');
        }

        const _data = {
          id: edgeId,
          label: edgeLabel,
          source: filePath,
          target: sourceFilePath,
          type: 'imports',
          importedProperty: importedProperty,
          importCount: importedProperties.length,
          allImports: importedProperties
        }
        edges.push({ data: _data });
      }
    }

    return {
        edges
    }
  }
});