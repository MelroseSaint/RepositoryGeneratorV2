
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
