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
                throw new Error(err.message || 'Failed to create repository');
            }

            return response.json();
        };

        export const pushToGithub = async (token: string, owner: string, repo: string, files: FileNode[], message: string = 'Initial commit'): Promise<void> => {
            const headers = {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json',
            };

            // 1. Get the latest commit SHA of the main branch
            const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/main`, { headers });
            if (!refRes.ok) throw new Error('Failed to get main branch ref');
            const refData = await refRes.json();
            const latestCommitSha = refData.object.sha;

            // 2. Get the tree SHA of the latest commit
            const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits/${latestCommitSha}`, { headers });
            const commitData = await commitRes.json();
            const baseTreeSha = commitData.tree.sha;

            // 3. Create blobs for each file and build the tree array
            const treeItems = [];

            const processNode = async (node: FileNode, path: string) => {
                if (node.type === FileType.FOLDER) {
                    if (node.children) {
                        for (const child of node.children) {
                            await processNode(child, path ? `${path}/${child.name}` : child.name);
                        }
                    }
                } else {
                    // Create blob
                    const blobRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                            content: node.content || '',
                            encoding: 'utf-8',
                        }),
                    });
                    const blobData = await blobRes.json();

                    treeItems.push({
                        path: path ? `${path}/${node.name}` : node.name,
                        mode: '100644',
                        type: 'blob',
                        sha: blobData.sha,
                    });
                }
            };

            // Flatten files and create blobs
            for (const node of files) {
                await processNode(node, '');
            }

            // 4. Create a new tree
            const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    base_tree: baseTreeSha,
                    tree: treeItems,
                }),
            });
            const treeData = await treeRes.json();

            // 5. Create a new commit
            const newCommitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    message,
                    tree: treeData.sha,
                    parents: [latestCommitSha],
                }),
            });
            const newCommitData = await newCommitRes.json();

            // 6. Update the reference
            await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/main`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({
                    sha: newCommitData.sha,
                }),
            });
        };
