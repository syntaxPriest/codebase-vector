import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { fileReconInputSchema } from '../schemas/schema';

const readFileAsync = promisify(fs.readFile);

export const listFiles = createTool({
  id: 'list-files',
  description: 'Recursively list all files in a directory, optionally excluding patterns',
  inputSchema: z.object({
    basepath: z.string().describe('Base directory path to scan'),
    exclude: z.array(z.string()).optional().default([]).describe('Array of patterns to exclude (supports wildcards *)'),
  }),
  outputSchema: z.object({
    files: z.array(z.string()).describe('Array of relative file paths'),
    basepath : z.string().describe('Base directory path that was scanned')
  }),
  execute: async (inputData) => {
    const { basepath, exclude = [] } = inputData;

    function shouldExclude(itemPath: string): boolean {
      return exclude.some(pattern => {
        let regexPattern = pattern
          .replace(/[.+^${}()|[\]\\]/g, '\\$&')
          .replace(/\*\*/g, '.*')
          .replace(/\?/g, '[^/]')
          .replace(/\*/g, '[^/]*');
        
        // Handle directory patterns (ending with /)
        if (pattern.endsWith('/')) {
          // Match directory at any level
          regexPattern = `(^|/)${regexPattern.slice(0, -1)}(/|$)`;
        } else {
          // Match file or directory name
          regexPattern = `(^|/)${regexPattern}$`;
        }
        
        const regex = new RegExp(regexPattern);
        return regex.test(itemPath);
      });
    }
    
    const result: string[] = [];
    
    function readDirRecursive(currentPath: string): void {
      const items = fs.readdirSync(currentPath, { withFileTypes: true });
      for (const item of items) {
        const itemRelativePath = `${item.parentPath}/${item.name}`;

        if (shouldExclude(itemRelativePath)) {
          continue;
        }
        
        if (item.isDirectory()) {
          readDirRecursive(itemRelativePath);
        } else {
          result.push(itemRelativePath);
        }
      }
    }
    
    readDirRecursive(basepath);
    return { files: result, basepath };
  },
});

export const readFiles = createTool({
  id: 'read-files',
  description: 'Read multiple files concurrently and return their contents',
  inputSchema: z.object({
    files: z.array(z.string()).describe('Array of relative file paths'),
    basepath : z.string().describe('Base directory path that was scanned')
  }),
  outputSchema: fileReconInputSchema,
  execute: async (inputData) => {
    const readPromises = inputData.files.map(async (filepath) => {
      const fullPath = filepath;
      try {
        const content = await readFileAsync(fullPath, 'utf-8');
        return { filePath: filepath, content };
      } catch (error) {
        return { filePath: filepath, content: `Error reading file: ${error}` };
      }
    });
    
    const results = await Promise.all(readPromises);
    
    return { files: results, basepath: inputData.basepath };
  },
});

export const fileExtensions = createTool({
  id: 'file-extensions',
  description: 'Extract unique file extensions from an array of file paths',
  inputSchema: z.object({
    files: z.array(z.string()).describe('Array of relative file paths'),
    basepath : z.string().describe('Base directory path that was scanned')
  }),
  outputSchema: z.object({
    extensions: z.array(z.string()).describe('Unique collection of file extensions'),
    basepath : z.string().describe('Base directory path that was scanned')
  }),
  execute: async (inputData) => {
    const extensions = new Set<string>();
    
    inputData.files.forEach((path) => {
      // Extract extension from file path
      const lastDotIndex = path.lastIndexOf('.');
      if (lastDotIndex !== -1 && lastDotIndex < path.length - 1) {
        const extension = path.substring(lastDotIndex + 1).toLowerCase();
        extensions.add(extension);
      }
    });
    
    return { extensions: Array.from(extensions).sort(), basepath: inputData.basepath };
  },
});

export const subdirectories = createTool({
  id: 'subdirectories',
  description: 'Extract unique subdirectory names from an array of file paths',
  inputSchema: z.object({
    files: z.array(z.string()).describe('Array of relative file paths'),
    basepath : z.string().describe('Base directory path that was scanned')
  }),
  outputSchema: z.object({
    subdirectories: z.array(z.string()).describe('Unique collection of subdirectory names'),
    basepath : z.string().describe('Base directory path that was scanned')
  }),
  execute: async (inputData) => {
    const dirNames = new Set<string>();
    
    inputData.files.forEach((path) => {
      // Extract directory path from file path
      const dirPath = path.substring(0, path.lastIndexOf('/'));
      
      // Split directory path into individual folder names
      const folders = dirPath.split('/').filter(folder => folder.trim() !== '');
      
      // Add each folder name to the set, excluding the root directory
      // (skip the first element which is the root directory name)
      if (folders.length > 1) {
        folders.slice(1).forEach(folder => dirNames.add(folder));
      }
    });
    
    return { subdirectories: Array.from(dirNames).sort(), basepath: inputData.basepath };
  },
});