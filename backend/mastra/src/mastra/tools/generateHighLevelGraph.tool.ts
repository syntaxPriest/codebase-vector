import { createTool } from "@mastra/core/tools";
import { compressEdgesOutputSchema, generateGraphOutputSchema } from "../schemas/schema";
import { hierarchicalGraphAgent } from "../agents/hierarchicalGraph.agent";
import { getCache } from "../../config/lmdb.config";
import { getSha512OfString } from "../../utils/hash";

export const generateHighLevelGraphTool = createTool({
    id : "generate_high_level_graph",
    inputSchema : compressEdgesOutputSchema,
    outputSchema : generateGraphOutputSchema,
    description: "Generate a high level graph representation of the codebase structure based on file paths and directory hierarchy",
    execute : async (inputData)=>{

        const cacheKey = `highLevelGraph:${getSha512OfString(JSON.stringify(inputData.edges))}`;
        const cache = getCache();
        const cachedResult = cache.get(cacheKey);

        console.log(cachedResult);

        if(cachedResult){
            console.log(`Cache hit for high level graph generation`);
            return cachedResult;
        } 

        console.log(`Cache miss for high level graph generation. Invoking agent...`);
        let response: any = await hierarchicalGraphAgent.generate(`Analyze the following edges and generate a high level graph representation:\n\n${JSON.stringify(inputData.edges)}`);
        response = JSON.parse(response.text);
        console.log(`Storing high level graph in cache`);
        await cache.put(cacheKey, response);

        return response;
    }
})