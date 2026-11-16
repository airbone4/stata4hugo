import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { getStataPath } from './statatool/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getStataDir(): string {
  const exePath = getStataPath();
  if (exePath) {
    return path.dirname(exePath).replaceAll('\\', '/') + '/';
  }
  return 'C:/Program Files/Stata18/';
}

function getContent(date: string, title: string) {
  const stataDir = getStataDir();
  const toolsDir = path.resolve(__dirname, '../../tools').replaceAll('\\', '/');

  const content = `{
 "cells": [
  {
   "cell_type": "raw",
   "id": "9771db81",
   "metadata": {
    "vscode": {
     "languageId": "raw"
    }
   },
   "source": [
    "---",
    "title: ${title}",
    "description: ${date}",
    "tags: []",
    "categories: []",
    "series: []",
    "editext: ipynb",
    "---",
    "<!--more-->"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": null,
   "id": "b15c0a14",
   "metadata": {
    "tags": [
     "hide"
    ]
   },
   "outputs": [],
   "source": [
    "import stata_setup",
    "stata_setup.config('${stataDir}', 'mp')"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": null,
   "id": "6e6a2ae1",
   "metadata": {
    "tags": [
     "hide"
    ]
   },
   "outputs": [],
   "source": [
    "%%stata",
    "set linesize 255",
    "adopath + \\"${toolsDir}\\""
   ]
  }
 ],
 "metadata": {
  "kernelspec": {
   "display_name": "Python 3",
   "language": "python",
   "name": "python3"
  },
  "language_info": {
   "codemirror_mode": {
    "name": "ipython",
    "version": 3
   },
   "file_extension": ".py",
   "mimetype": "text/x-python",
   "name": "python",
   "nbconvert_exporter": "python",
   "pygments_lexer": "ipython3",
   "version": "3.12.7"
  }
 },
 "nbformat": 4,
 "nbformat_minor": 5
}
`;
  return content;
}

export function newnb(adir: string, aname: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const date = `${year}/${month}/${day}`;

  fs.writeFileSync(path.join(adir, aname), getContent(date, path.parse(aname).name), 'utf8');
  console.log('File written successfully!');
}
