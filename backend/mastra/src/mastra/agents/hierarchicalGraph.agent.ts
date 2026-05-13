import { Agent } from '@mastra/core/agent';

export const hierarchicalGraphAgent = new Agent({
  id: 'hierarchical_graph_agent',
  name: 'Hierarchical Graph Abstraction Agent',
  instructions: `Input: [{source,target,importedProperties}]. Infer semantic groups from node names (e.g., auth, db, api, config, utils). Every group needs ≥1 edge. Edge source and target must differ (no self-loops). Output JSON: elements.nodes[] = {data:{id,label,type:"group",description,memberCount,members[],size,color}} and elements.edges[] = {data:{id,source,target,type:"imports",label,importCount,importedProperties[]}}. Size=100+memberCount*10 (+30-50 for hubs). Colors: blue=infra, green=UI, purple=data, orange=logic, gray=utils. Aggregate edges between groups. No extra text.`,
  model: 'openai/gpt-5-mini'
});