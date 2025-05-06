import { glob } from "fast-glob";
import * as fs from "node:fs";
import * as typescript from "typescript";
import * as parser from "@typescript-eslint/parser";
import { ContentChunk, VectoredChunk } from "../search";
import { processChunksWithEmbedding } from "../chunkProcessor";

export interface TypeScriptReaderConfig {
  onReadProgress?: (index: number, length: number) => void;
  onEmbedProgress?: (index: number, length: number) => void;
  OPENAI_API_KEY: string;
  pattern: string;
}

interface TypeScriptItem {
  name: string;
  kind: string;
  comment?: string;
  params?: string[];
  returnType?: string;
  location: {
    filePath: string;
    line: number;
  };
}

/**
 * Generate TypeScript chunks from files matching the given pattern
 */
export async function generateTypeScriptChunks(config: TypeScriptReaderConfig): Promise<VectoredChunk[]> {
  // Step 1: Read all TypeScript files and extract items
  const tsItems = await readTypeScriptFiles(config.pattern);

  // Step 2: Convert items to chunks
  const chunks: ContentChunk[] = tsItems.map((item) => createChunkFromTypeScriptItem(item));

  // Step 3: Process chunks using the common processor
  const vectoredChunks = await processChunksWithEmbedding(chunks, {
    OPENAI_API_KEY: config.OPENAI_API_KEY,
    onReadProgress: config.onReadProgress,
    onEmbedProgress: config.onEmbedProgress,
  });

  return vectoredChunks;
}

/**
 * Read TypeScript files matching the given pattern and extract information
 */
async function readTypeScriptFiles(pattern: string): Promise<TypeScriptItem[]> {
  const filePaths = await glob(pattern);
  const items: TypeScriptItem[] = [];
  
  for (const filePath of filePaths) {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    try {
      const tsItems = parseTypeScriptFile(content, filePath);
      items.push(...tsItems);
    } catch (error) {
      console.error(`Error parsing file ${filePath}:`, error);
    }
  }
  
  return items;
}

/**
 * Parse a TypeScript file and extract information about classes, methods, and functions
 */
function parseTypeScriptFile(content: string, filePath: string): TypeScriptItem[] {
  const items: TypeScriptItem[] = [];
  
  // Parse the TypeScript file
  const ast = parser.parse(content, {
    loc: true,
    range: true,
    tokens: true,
    comment: true,
    jsx: true,
    sourceType: 'module',
    ecmaVersion: 2020,
    ecmaFeatures: {
      jsx: true,
    },
  });
  
  // Create TypeScript program to extract type information
  const program = typescript.createProgram([filePath], {
    target: typescript.ScriptTarget.ESNext,
    module: typescript.ModuleKind.ESNext,
  });
  
  const sourceFile = program.getSourceFile(filePath);
  const typeChecker = program.getTypeChecker();
  
  if (!sourceFile) {
    return items;
  }
  
  // Visit each node in the AST
  function visit(node: typescript.Node) {
    // Get JSDoc comment for the node
    const comment = getJsDocComment(node);
    
    // Make sure sourceFile exists
    if (!sourceFile) {
      return;
    }
    
    // Handle function declarations
    if (typescript.isFunctionDeclaration(node) && node.name) {
      const name = node.name.text;
      const params = getParametersInfo(node, typeChecker);
      const returnType = getReturnType(node, typeChecker);
      
      items.push({
        name,
        kind: 'function',
        comment,
        params,
        returnType,
        location: {
          filePath,
          line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
        },
      });
    }
    
    // Handle class declarations
    if (typescript.isClassDeclaration(node) && node.name) {
      const className = node.name.text;
      
      items.push({
        name: className,
        kind: 'class',
        comment,
        location: {
          filePath,
          line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
        },
      });
      
      // Process class methods
      node.members.forEach((member) => {
        if (
          typescript.isMethodDeclaration(member) && 
          member.name && 
          typescript.isIdentifier(member.name)
        ) {
          const methodName = member.name.text;
          const methodComment = getJsDocComment(member);
          const params = getParametersInfo(member, typeChecker);
          const returnType = getReturnType(member, typeChecker);
          
          items.push({
            name: `${className}.${methodName}`,
            kind: 'method',
            comment: methodComment,
            params,
            returnType,
            location: {
              filePath,
              line: sourceFile.getLineAndCharacterOfPosition(member.getStart()).line + 1,
            },
          });
        }
      });
    }
    
    // Handle interface declarations
    if (typescript.isInterfaceDeclaration(node) && node.name) {
      const interfaceName = node.name.text;
      
      items.push({
        name: interfaceName,
        kind: 'interface',
        comment,
        location: {
          filePath,
          line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
        },
      });
    }
    
    // Continue visiting children
    typescript.forEachChild(node, visit);
  }
  
  // Start traversing the AST
  visit(sourceFile);
  
  return items;
}

/**
 * Get JSDoc comment for a node
 */
function getJsDocComment(node: typescript.Node): string | undefined {
  const jsDocComments = typescript.getJSDocCommentsAndTags(node) as typescript.JSDoc[];
  
  if (jsDocComments && jsDocComments.length > 0) {
    const jsDoc = jsDocComments[0];
    if (jsDoc.comment) {
      return typeof jsDoc.comment === 'string' 
        ? jsDoc.comment 
        : jsDoc.comment.map(c => c.text).join('');
    }
  }
  
  return undefined;
}

/**
 * Get parameter information for a function or method
 */
function getParametersInfo(
  node: typescript.FunctionDeclaration | typescript.MethodDeclaration,
  typeChecker: typescript.TypeChecker
): string[] {
  const params: string[] = [];
  
  if (node.parameters) {
    node.parameters.forEach((param) => {
      if (param.name && typescript.isIdentifier(param.name)) {
        const paramName = param.name.text;
        let paramType = 'any';
        
        if (param.type) {
          paramType = param.type.getText();
        } else if (param.initializer) {
          const type = typeChecker.getTypeAtLocation(param);
          paramType = typeChecker.typeToString(type);
        }
        
        params.push(`${paramName}: ${paramType}`);
      }
    });
  }
  
  return params;
}

/**
 * Get return type for a function or method
 */
function getReturnType(
  node: typescript.FunctionDeclaration | typescript.MethodDeclaration,
  typeChecker: typescript.TypeChecker
): string | undefined {
  if (node.type) {
    return node.type.getText();
  }
  
  const signature = typeChecker.getSignatureFromDeclaration(node);
  if (signature) {
    const returnType = typeChecker.getReturnTypeOfSignature(signature);
    return typeChecker.typeToString(returnType);
  }
  
  return undefined;
}

/**
 * Create a ContentChunk from a TypeScriptItem
 */
function createChunkFromTypeScriptItem(item: TypeScriptItem): ContentChunk {
  // Template for converting TypeScript item to chunk text
  let content = `${item.kind.toUpperCase()}: ${item.name}\n`;
  
  if (item.comment) {
    content += `\nDescription: ${item.comment}\n`;
  }
  
  if (item.params && item.params.length > 0) {
    content += `\nParameters:\n${item.params.map(p => `- ${p}`).join('\n')}\n`;
  }
  
  if (item.returnType) {
    content += `\nReturns: ${item.returnType}\n`;
  }
  
  content += `\nFound in: ${item.location.filePath} (line ${item.location.line})`;
  
  return {
    filePath: item.location.filePath,
    header: item.name,
    content,
    charCount: content.length,
  };
}