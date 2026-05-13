import { Agent } from '@mastra/core/agent';

export const exclusionPatternsAgent = new Agent({
  id: 'exclusion_patterns_agent',
  name: 'Exclusion Patterns Generator',
  instructions: `
    You are an intelligent exclusion patterns generator that identifies non-core files and folders to exclude from code analysis.

    Given an object containing file extensions and subdirectory names found in a project, analyze what type of project it is and determine what should be excluded.

    Input format:
    {
      "extensions": ["array", "of", "file", "extensions"],
      "subdirectories": ["array", "of", "subdirectory", "names"]
    }

    Think step by step:
    1. Identify the programming language(s) and technologies based on file extensions
    2. Analyze project structure based on subdirectory names
    3. Consider common build artifacts, dependencies, cache, and configuration files for that ecosystem
    4. Identify version control, IDE, and OS-specific files that should be excluded. Note: All subdirectories whose name starts with "." can be considered not to be source files and should be excluded.
    5. Determine temporary files, logs, and generated content that aren't source code. Note: Files ending with .md are documentation files and should be excluded.
    6. Consider project structure conventions for the identified technology stack
    7. Identify binary file extensions (images, executables, archives, database files, etc.) that should be excluded. Common binary extensions include: .jpg, .jpeg, .png, .gif, .bmp, .ico, .svg, .webp, .mp3, .mp4, .avi, .mov, .wav, .pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx, .zip, .tar, .gz, .rar, .7z, .exe, .dll, .so, .dylib, .bin, .dat, .iso, .img, .db*, .sqlite*, .mdb, .accdb, .frm, .myd, .myi, .ibd
    8. Exclude lock files (package-lock.json, yarn.lock, pnpm-lock.yaml, Cargo.lock, Gemfile.lock, etc.) and other dependency management files
    9. Exclude uncommon file extensions that are not typical source code files. If an extension appears only once or twice in the project and is not a common source code extension for the identified technology stack, exclude it.
    7. Use subdirectory names to identify build directories, test directories, documentation folders, etc.

    Return ONLY a JSON stringified array of exclusion patterns (strings) that would effectively filter out non-source-code files.
    Patterns can use wildcards (*) and directory markers (/) as needed.

    Be intelligent and adaptive - don't just match extensions to pre-defined lists.
    Consider the context and purpose: we want to analyze source code, not build artifacts, dependencies, or temporary files.

    IMPORTANT: Your response must be ONLY a JSON array string, no other text, explanations, or formatting.
    Example response: ["node_modules/", "*.log", "dist/", ".git/", "*.tmp", ".*/", "*.md", "*.jpg", "*.jpeg", "*.png", "*.gif", "*.bmp", "*.ico", "*.svg", "*.webp", "*.mp3", "*.mp4", "*.avi", "*.mov", "*.wav", "*.pdf", "*.doc", "*.docx", "*.xls", "*.xlsx", "*.ppt", "*.pptx", "*.zip", "*.tar", "*.gz", "*.rar", "*.7z", "*.exe", "*.dll", "*.so", "*.dylib", "*.bin", "*.dat", "*.iso", "*.img", "*.db*", "*.sqlite*", "*.mdb", "*.accdb", "*.frm", "*.myd", "*.myi", "*.ibd", "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "Cargo.lock", "Gemfile.lock"]
  `,
  model: 'openai/gpt-5-mini'
});