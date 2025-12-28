import { FileNode, FileType } from '../types';

export interface GithubFile {
    name: string;
    path: string;
    type: 'file' | 'dir';
    content?: string; // Decoded content
}

export const parseGithubUrl = (url: string): { owner: string; repo: string } | null => {
    try {
        const urlObj = new URL(url);
        const parts = urlObj.pathname.split('/').filter(Boolean);
        if (parts.length >= 2) {
            return { owner: parts[0], repo: parts[1] };
        }
    } catch (e) {
        return null;
    }
    return null;
};

export const fetchRepoContents = async (url: string): Promise<string> => {
    const repoInfo = parseGithubUrl(url);
    if (!repoInfo) {
        throw new Error("Invalid GitHub URL");
    }

    const { owner, repo } = repoInfo;
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`GitHub API Error: ${response.statusText}`);
        }

        const items: any[] = await response.json();

        // Identify key files to fetch content for
        const keyFiles = ['package.json', 'README.md', 'tsconfig.json', 'go.mod', 'Cargo.toml', 'requirements.txt', 'pom.xml'];
        const filesToFetch = items.filter(item => item.type === 'file' && keyFiles.includes(item.name));

        let combinedContent = `// Analysis of GitHub Repo: ${owner}/${repo}\n\n`;

        // Fetch content for key files
        await Promise.all(filesToFetch.map(async (file) => {
            const fileRes = await fetch(file.url); // Use the API url provided in the response
            const fileData = await fileRes.json();

            if (fileData.content && fileData.encoding === 'base64') {
                const decoded = atob(fileData.content.replace(/\n/g, ''));
                combinedContent += `// File: ${file.name}\n${decoded}\n\n`;
            }
        }));

        // Also list the root directory structure
        combinedContent += `// Root Directory Structure:\n`;
        items.forEach(item => {
            combinedContent += `- ${item.name} (${item.type})\n`;
        });

        return combinedContent;

    } catch (error) {
        console.error("Failed to fetch repo:", error);
        throw error;
    }
};

export const createRepository = async (token: string, name: string, description: string, isPrivate: boolean): Promise<any> => {
    const response = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
            name,
            description,
            private: isPrivate,
            auto_init: true, // Initialize with README so we have a base commit
        }),
    });

    if (!response.ok) {
        const err = await response.json();
        const msg = typeof err?.message === 'string' ? err.message : 'Failed to create repository';
        if (msg.includes('Resource not accessible by personal access token')) {
            throw new Error('Token lacks repo scope or permissions for repository creation. Generate a classic PAT with "repo" scope or grant repository access.');
        }
        throw new Error(msg);
    }

    return response.json();
};

export const pushToGithub = async (token: string, owner: string, repo: string, files: FileNode[], message: string = 'Update repository'): Promise<void> => {
    const headers = {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
    };

    // Helper function to fetch all files recursively
    const fetchAllFiles = async (path: string = ''): Promise<{ [key: string]: { sha: string; type: string } }> => {
        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error(`Failed to fetch contents: ${response.statusText}`);
        const items = await response.json();

        const filesMap: { [key: string]: { sha: string; type: string } } = {};

        for (const item of items) {
            const fullPath = path ? `${path}/${item.name}` : item.name;
            if (item.type === 'file') {
                filesMap[fullPath] = { sha: item.sha, type: item.type };
            } else if (item.type === 'dir') {
                const subFiles = await fetchAllFiles(fullPath);
                Object.assign(filesMap, subFiles);
            }
        }

        return filesMap;
    };

    // Fetch existing files
    const existingFiles = await fetchAllFiles();

    // Flatten the provided files
    const providedFiles: { [key: string]: string } = {};
    const processNode = (node: FileNode, path: string) => {
        if (node.type === FileType.FOLDER) {
            if (node.children) {
                for (const child of node.children) {
                    processNode(child, path ? `${path}/${child.name}` : child.name);
                }
            }
        } else {
            const fullPath = path ? `${path}/${node.name}` : node.name;
            providedFiles[fullPath] = (typeof node.content === 'string') ? node.content : JSON.stringify(node.content ?? '', null, 2);
        }
    };
    for (const node of files) {
        processNode(node, '');
    }

    // Create or update files
    for (const [path, content] of Object.entries(providedFiles)) {
        const encodedContent = btoa(unescape(encodeURIComponent(content)));
        const body: any = {
            message,
            content: encodedContent,
            branch: 'main',
        };

        if (existingFiles[path]) {
            body.sha = existingFiles[path].sha; // For update
        }

        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Failed to create/update file ${path}: ${error.message}`);
        }

        delete existingFiles[path]; // Mark as processed
    }

    // Delete files not in provided list
    for (const [path, { sha }] of Object.entries(existingFiles)) {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
            method: 'DELETE',
            headers,
            body: JSON.stringify({
                message,
                sha,
                branch: 'main',
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Failed to delete file ${path}: ${error.message}`);
        }
    }
};
