/**
 * GitHub Integration - Handles GitHub API interactions for PR-based editing
 */

class GitHubIntegration {
    constructor() {
        this.token = null;
        this.user = null;
        this.repoOwner = 'YuryNovozhilov'; // Repository owner
        this.repoName = 'MaterialMap';     // Repository name
        this.baseUrl = 'https://api.github.com';
        
        // Initialize OAuth client
        this.oauthClient = new GitHubOAuth();
        
        this.loadStoredAuth();
    }

    // Authentication methods

    async authenticateWithOAuth() {
        try {
            // Use OAuth client for authentication
            const result = await this.oauthClient.authenticate();
            
            this.token = result.token;
            this.user = result.user;
            
            return result.user;
            
        } catch (error) {
            this.token = null;
            this.user = null;
            throw new Error(`OAuth authentication failed: ${error.message}`);
        }
    }

    async authenticateWithToken(token) {
        try {
            // Validate token by getting user info
            this.token = token;
            const user = await this.makeRequest('/user');
            
            this.user = user;
            
            // Store token in sessionStorage for persistence
            sessionStorage.setItem('github_pat_token', token);
            sessionStorage.setItem('github_pat_user', JSON.stringify(user));
            sessionStorage.setItem('github_pat_expires', Date.now() + (24 * 3600 * 1000)); // 24 hours
            
            return user;
            
        } catch (error) {
            this.token = null;
            this.user = null;
            
            // Clear any stored PAT data
            sessionStorage.removeItem('github_pat_token');
            sessionStorage.removeItem('github_pat_user');
            sessionStorage.removeItem('github_pat_expires');
            
            throw new Error(`Personal Access Token authentication failed: ${error.message}`);
        }
    }

    async getCurrentUser() {
        if (this.user && this.token) {
            return this.user;
        }

        if (!this.token) {
            throw new Error('No authentication token available');
        }

        try {
            const response = await this.makeRequest('/user');
            this.user = response;
            return response;
            
        } catch (error) {
            throw new Error(`Failed to get user info: ${error.message}`);
        }
    }

    isAuthenticated() {
        return this.token !== null && this.user !== null;
    }

    logout() {
        this.token = null;
        this.user = null;
        
        // Clear OAuth data
        this.oauthClient.logout();
        
        // Clear Personal Access Token data
        sessionStorage.removeItem('github_pat_token');
        sessionStorage.removeItem('github_pat_user');
        sessionStorage.removeItem('github_pat_expires');
    }

    loadStoredAuth() {
        try {
            // First try to load OAuth authentication from sessionStorage
            const oauthData = this.oauthClient.getStoredAuthData();
            if (oauthData) {
                this.token = oauthData.token;
                this.user = oauthData.user;
                return;
            }
            
            // If no OAuth data, try to load Personal Access Token
            const patToken = sessionStorage.getItem('github_pat_token');
            const patUserJson = sessionStorage.getItem('github_pat_user');
            const patExpires = sessionStorage.getItem('github_pat_expires');
            
            if (patToken && patUserJson && patExpires) {
                const expiresTime = parseInt(patExpires);
                if (Date.now() < expiresTime) {
                    this.token = patToken;
                    this.user = JSON.parse(patUserJson);
                } else {
                    // Token expired, clear it
                    sessionStorage.removeItem('github_pat_token');
                    sessionStorage.removeItem('github_pat_user');
                    sessionStorage.removeItem('github_pat_expires');
                }
            }
        } catch (error) {
            console.warn('Failed to load stored authentication:', error);
            this.logout();
        }
    }

    // GitHub API methods
    async makeRequest(endpoint, options = {}) {
        if (!this.token) {
            throw new Error('Authentication required');
        }

        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            headers: {
                'Authorization': `token ${this.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
            
        } catch (error) {
            if (error.message.includes('401')) {
                this.logout();
                throw new Error('Authentication expired. Please log in again.');
            }
            throw error;
        }
    }

    // Repository operations
    async forkRepository() {
        try {
            // Check if fork already exists
            const forks = await this.makeRequest(`/repos/${this.repoOwner}/${this.repoName}/forks`);
            const existingFork = forks.find(fork => fork.owner.login === this.user.login);
            
            if (existingFork) {
                return existingFork;
            }
            
            // Create fork
            return await this.makeRequest(`/repos/${this.repoOwner}/${this.repoName}/forks`, {
                method: 'POST'
            });
            
        } catch (error) {
            throw new Error(`Failed to fork repository: ${error.message}`);
        }
    }

    async createBranch(branchName, baseBranch = 'main') {
        try {
            // Get the SHA of the base branch
            const baseRef = await this.makeRequest(
                `/repos/${this.user.login}/${this.repoName}/git/refs/heads/${baseBranch}`
            );
            
            // Create new branch
            await this.makeRequest(`/repos/${this.user.login}/${this.repoName}/git/refs`, {
                method: 'POST',
                body: JSON.stringify({
                    ref: `refs/heads/${branchName}`,
                    sha: baseRef.object.sha
                })
            });
            
            return branchName;
            
        } catch (error) {
            if (error.message.includes('Reference already exists')) {
                // Branch already exists, that's okay
                return branchName;
            }
            throw new Error(`Failed to create branch: ${error.message}`);
        }
    }

    async getFileContent(filePath, branch = 'main') {
        try {
            const response = await this.makeRequest(
                `/repos/${this.user.login}/${this.repoName}/contents/${filePath}?ref=${branch}`
            );
            
            // Decode base64 content
            const content = atob(response.content);
            
            return {
                content: content,
                sha: response.sha
            };
            
        } catch (error) {
            throw new Error(`Failed to get file content: ${error.message}`);
        }
    }

    async updateFile(filePath, content, message, branch, sha) {
        try {
            const response = await this.makeRequest(
                `/repos/${this.user.login}/${this.repoName}/contents/${filePath}`,
                {
                    method: 'PUT',
                    body: JSON.stringify({
                        message: message,
                        content: btoa(content), // Encode to base64
                        branch: branch,
                        sha: sha
                    })
                }
            );
            
            return response;
            
        } catch (error) {
            throw new Error(`Failed to update file: ${error.message}`);
        }
    }

    async createPullRequest(title, body, headBranch, baseBranch = 'main') {
        try {
            const response = await this.makeRequest(
                `/repos/${this.repoOwner}/${this.repoName}/pulls`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        title: title,
                        body: body,
                        head: `${this.user.login}:${headBranch}`,
                        base: baseBranch
                    })
                }
            );
            
            return response;
            
        } catch (error) {
            throw new Error(`Failed to create pull request: ${error.message}`);
        }
    }

    // High-level submission workflow
    async submitChanges(changeSet) {
        try {
            if (!this.isAuthenticated()) {
                throw new Error('Authentication required');
            }

            // Step 1: Fork repository if needed
            await this.forkRepository();
            
            // Step 2: Create branch
            const branchName = this.generateBranchName();
            await this.createBranch(branchName);
            
            // Step 3: Get current file content
            const filePath = `data/${changeSet.target.file}`;
            const fileData = await this.getFileContent(filePath);
            
            // Step 4: Apply changes to file content
            const updatedContent = await this.applyChangesToFile(
                fileData.content, 
                changeSet
            );
            
            // Step 5: Commit changes
            const commitMessage = this.generateCommitMessage(changeSet);
            await this.updateFile(
                filePath,
                updatedContent,
                commitMessage,
                branchName,
                fileData.sha
            );
            
            // Step 6: Create pull request
            const prTitle = this.generatePRTitle(changeSet);
            const prBody = this.generatePRBody(changeSet);
            
            const pullRequest = await this.createPullRequest(
                prTitle,
                prBody,
                branchName
            );
            
            return pullRequest.html_url;
            
        } catch (error) {
            throw new Error(`Failed to submit changes: ${error.message}`);
        }
    }

    async applyChangesToFile(fileContent, changeSet) {
        try {
            // Parse YAML content
            const materials = jsyaml.load(fileContent);
            
            if (!Array.isArray(materials)) {
                throw new Error('Invalid file format: expected array of materials');
            }
            
            // Find and update the target material
            const materialIndex = changeSet.target.materialIndex;
            
            if (materialIndex < 0 || materialIndex >= materials.length) {
                throw new Error('Material index out of range');
            }
            
            // Verify original hash matches (conflict detection)
            const currentMaterial = materials[materialIndex].material;
            const currentHash = this.generateMaterialHash(currentMaterial);
            
            if (currentHash !== changeSet.target.originalHash) {
                throw new Error('Material has been modified by someone else. Please refresh and try again.');
            }
            
            // Apply changes
            materials[materialIndex].material = changeSet.changes.after;
            
            // Convert back to YAML
            const updatedYaml = jsyaml.dump(materials, {
                indent: 2,
                lineWidth: 80,
                noRefs: true
            });
            
            return updatedYaml;
            
        } catch (error) {
            throw new Error(`Failed to apply changes: ${error.message}`);
        }
    }

    // Utility methods for GitHub workflow
    generateBranchName() {
        const timestamp = Date.now();
        const username = this.user.login.toLowerCase().replace(/[^a-z0-9]/g, '-');
        return `edit-${username}-${timestamp}`;
    }

    generateCommitMessage(changeSet) {
        const materialId = changeSet.changes.after.id || 'UNKNOWN';
        const materialType = changeSet.changes.after.mat || 'UNKNOWN';
        const description = changeSet.metadata.description || 'Update material data';
        
        return `Edit material: ${materialId}/${materialType} - ${description}`;
    }

    generatePRTitle(changeSet) {
        const materialId = changeSet.changes.after.id || 'UNKNOWN';
        const description = changeSet.metadata.description || 'Material update';
        
        return `Material Edit: [${materialId}] ${description}`;
    }

    generatePRBody(changeSet) {
        const material = changeSet.changes.after;
        const changes = changeSet.changes.fields;
        const validation = changeSet.validation;
        
        let body = `## Material Edit Request\n\n`;
        
        // Material information
        body += `**Material:** ${material.id || 'N/A'}/${material.mat || 'N/A'}\n`;
        body += `**File:** ${changeSet.target.file}\n`;
        body += `**Index:** ${changeSet.target.materialIndex}\n\n`;
        
        // Changes summary
        body += `## Changes Made\n\n`;
        if (changes.length === 0) {
            body += `No changes detected.\n\n`;
        } else {
            changes.forEach(change => {
                body += `- **${change.fieldPath}**: ${change.operation}\n`;
                if (change.operation === 'UPDATE') {
                    body += `  - From: \`${this.truncateValue(change.oldValue)}\`\n`;
                    body += `  - To: \`${this.truncateValue(change.newValue)}\`\n`;
                } else if (change.operation === 'ADD') {
                    body += `  - Added: \`${this.truncateValue(change.newValue)}\`\n`;
                } else if (change.operation === 'DELETE') {
                    body += `  - Removed: \`${this.truncateValue(change.oldValue)}\`\n`;
                }
            });
            body += `\n`;
        }
        
        // User description
        if (changeSet.metadata.description) {
            body += `## Description\n\n${changeSet.metadata.description}\n\n`;
        }
        
        // Validation status
        body += `## Validation Status\n\n`;
        if (validation.status === 'VALID') {
            body += `✅ All validation checks passed\n\n`;
        } else if (validation.status === 'WARNING') {
            body += `⚠️ Validation passed with warnings:\n`;
            validation.warnings.forEach(warning => {
                body += `- ${warning.field}: ${warning.message}\n`;
            });
            body += `\n`;
        } else {
            body += `❌ Validation failed:\n`;
            validation.errors.forEach(error => {
                body += `- ${error.field}: ${error.message}\n`;
            });
            body += `\n`;
        }
        
        // Metadata
        body += `## Metadata\n\n`;
        body += `- **Author:** @${this.user.login}\n`;
        body += `- **Timestamp:** ${changeSet.metadata.timestamp}\n`;
        body += `- **Change ID:** ${changeSet.metadata.id}\n`;
        
        // Files modified
        body += `\n## Files Modified\n\n`;
        body += `- \`data/${changeSet.target.file}\`\n`;
        
        return body;
    }

    truncateValue(value, maxLength = 100) {
        const str = typeof value === 'string' ? value : JSON.stringify(value);
        if (str.length <= maxLength) return str;
        return str.substring(0, maxLength) + '...';
    }

    generateMaterialHash(material) {
        // Create a hash from material data for verification
        const dataString = JSON.stringify(material, Object.keys(material).sort());
        return this.simpleHash(dataString);
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    // GitHub OAuth flow helpers
    getAuthUrl() {
        const clientId = 'your-github-app-client-id'; // This would need to be configured
        const redirectUri = encodeURIComponent(window.location.origin + window.location.pathname);
        const scope = 'public_repo';
        
        return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
    }

    // Rate limiting and error handling
    async handleRateLimit(error) {
        if (error.message.includes('rate limit')) {
            const resetTime = error.headers?.['x-ratelimit-reset'];
            if (resetTime) {
                const waitTime = (parseInt(resetTime) * 1000) - Date.now();
                if (waitTime > 0 && waitTime < 300000) { // Wait max 5 minutes
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    return true; // Indicate retry is possible
                }
            }
        }
        return false;
    }
}

// Export for use in other modules
window.GitHubIntegration = GitHubIntegration;