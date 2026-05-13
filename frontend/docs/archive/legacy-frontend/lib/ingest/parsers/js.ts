import { parse, type ParserOptions } from "@babel/parser";

const PARSER_OPTS: ParserOptions = {
  sourceType: "unambiguous",
  errorRecovery: true,
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
  plugins: [
    "typescript",
    "jsx",
    "decorators-legacy",
    "classProperties",
    "classPrivateProperties",
    "classPrivateMethods",
    "exportDefaultFrom",
    "exportNamespaceFrom",
    "importMeta",
    "topLevelAwait",
    "dynamicImport",
    "objectRestSpread",
  ],
};

interface AnyNode {
  type?: string;
  source?: { value?: string };
  callee?: AnyNode;
  arguments?: AnyNode[];
  name?: string;
  value?: string;
  [k: string]: unknown;
}

// Extract the set of import specifiers in a source file.
// Walks the full AST so dynamic imports / require() calls anywhere in
// the file are captured.
export function extractImports(source: string): string[] {
  let ast: any;
  try {
    ast = parse(source, PARSER_OPTS);
  } catch {
    return [];
  }

  const out = new Set<string>();
  walk(ast.program as AnyNode, (node) => {
    switch (node.type) {
      case "ImportDeclaration":
        if (node.source?.value) out.add(node.source.value);
        break;
      case "ExportNamedDeclaration":
      case "ExportAllDeclaration":
        if (node.source?.value) out.add(node.source.value);
        break;
      case "CallExpression": {
        const callee = node.callee;
        const arg = node.arguments?.[0];
        const argVal = arg?.type === "StringLiteral" ? (arg as AnyNode).value : null;
        if (!argVal || typeof argVal !== "string") break;
        if (callee?.type === "Import") out.add(argVal);
        else if (callee?.type === "Identifier" && callee.name === "require") out.add(argVal);
        break;
      }
    }
  });

  return [...out];
}

function walk(node: AnyNode | null | undefined, visit: (node: AnyNode) => void): void {
  if (!node || typeof node !== "object") return;
  if (node.type) visit(node);
  for (const key in node) {
    if (key === "loc" || key === "range" || key === "start" || key === "end") continue;
    const v = (node as any)[key];
    if (Array.isArray(v)) {
      for (const c of v) walk(c, visit);
    } else if (v && typeof v === "object" && (v as AnyNode).type) {
      walk(v as AnyNode, visit);
    }
  }
}
