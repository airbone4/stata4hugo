---
title: Readme
description: Readme
tags: []
categories: []
series: []
editext: md
---
<!--more-->

To use this code, you'll need to:
1. Make sure TypeScript is installed in your project
2. Compile the TypeScript file to JavaScript
3. Import and use the function in your project

The function returns an array of `CodeBlock` objects, each containing:
- `code`: The extracted Python code
- `startLine`: The line number where the code block starts
- `endLine`: The line number where the code block ends
 

Created [](file:///d%3A/temp/20240823/tsconfig.json)
 

To use this code in your own project, you can:

 
```typescript
import { extractPythonCode } from './extractPythonCode';

// Read your markdown content from a file or string
const markdownContent = `your markdown here`;
const pythonBlocks = extractPythonCode(markdownContent);
```
``````{stata,echo=F,block.pre.class="ms-5.w-75"}
webuse auto
sum
```

```javascript
const { extractPythonCode } = require('./dist/extractPythonCode');
```

The project structure is now:
```
markdown-python-extractor/
├── extractPythonCode.ts    # Source TypeScript file
├── package.json           # Project configuration
├── tsconfig.json         # TypeScript configuration
├── dist/                 # Compiled JavaScript files
└── node_modules/         # Dependencies
```
```stata
sysuse auto
sum
```



 