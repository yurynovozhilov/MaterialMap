/**
 * Path utilities for Material MAP
 * Provides consistent path resolution across the application
 */

/**
 * Get the base path for the application
 * Handles different environments (file://, localhost, production)
 * @returns {string} The base path
 */
export function getBasePath() {
  const { origin, pathname, port } = window.location;

  // Check if the site is running via file:// protocol
  if (origin.startsWith("file://")) {
    const pathParts = pathname.split("/");
    pathParts.pop(); // Remove 'index.html' or the last segment
    return pathParts.join("/");
  }

  // Check if the site is running on localhost with a non-privileged port
  if (origin.includes("localhost") || origin.includes("127.0.0.1") || (port && parseInt(port) > 1024)) {
    return "./";
  }

  // For GitHub Pages deployment
  const repoName = pathname.split("/")[1];
  return repoName ? `/${repoName}` : "/";
}

/**
 * Get the full URL for a resource
 * @param {string} path - The relative path to the resource
 * @returns {string} The full URL
 */
export function getResourceUrl(path) {
  const base = getBasePath();
  return `${base}${path.startsWith('/') ? path : '/' + path}`;
}

// Export a singleton instance for backward compatibility
const PathUtils = {
  getBasePath,
  getResourceUrl
};

// For backward compatibility
window.PathUtils = PathUtils;

export default PathUtils;