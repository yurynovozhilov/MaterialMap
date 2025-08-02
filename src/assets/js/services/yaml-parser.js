/**
 * YAML Parser Service for Material MAP
 * Provides safe YAML parsing with validation
 */

/**
 * Parse YAML safely with validation
 * @param {string} yamlText - The YAML text to parse
 * @param {string} fileName - The name of the file being parsed (for error reporting)
 * @returns {Array} The parsed YAML data
 * @throws {Error} If parsing fails
 */
export function parseYAMLSafely(yamlText, fileName) {
  try {
    // Basic validation before parsing
    if (!yamlText || typeof yamlText !== 'string') {
      throw new Error('Invalid YAML content: empty or non-string input');
    }
    
    if (yamlText.trim().length === 0) {
      throw new Error('Invalid YAML content: empty file');
    }
    
    // Parse YAML with security options
    const parsed = jsyaml.load(yamlText, {
      schema: jsyaml.CORE_SCHEMA,
      json: false,
      filename: fileName
    });
    
    // Validate structure
    if (!Array.isArray(parsed)) {
      throw new Error('Invalid YAML structure: expected array of materials');
    }
    
    if (parsed.length === 0) {
      throw new Error('Invalid YAML content: empty materials array');
    }
    
    // Validate each material has required structure
    const validMaterials = [];
    for (let i = 0; i < parsed.length; i++) {
      const item = parsed[i];
      if (!item || typeof item !== 'object') {
        console.warn(`Skipping invalid material at index ${i} in ${fileName}`);
        continue;
      }
      
      // Check if item has material property or is a material itself
      const material = item.material || item;
      if (!material || typeof material !== 'object' || !material.id) {
        console.warn(`Skipping invalid material at index ${i} in ${fileName} - missing id`);
        continue;
      }
      
      validMaterials.push(item);
    }
    
    if (validMaterials.length === 0) {
      throw new Error('No valid materials found in file');
    }
    
    return validMaterials;
    
  } catch (error) {
    // Enhance error message with context
    const enhancedError = new Error(`YAML parsing failed in ${fileName}: ${error.message}`);
    enhancedError.originalError = error;
    enhancedError.fileName = fileName;
    throw enhancedError;
  }
}

/**
 * Validate a material object
 * @param {Object} material - The material to validate
 * @returns {boolean} Whether the material is valid
 */
export function isValidMaterial(material) {
  return (
    material && 
    typeof material === 'object' && 
    material.id && 
    typeof material.id === 'string'
  );
}

// Export a singleton instance for backward compatibility
const YAMLParser = {
  parseYAMLSafely,
  isValidMaterial
};

// For backward compatibility
window.YAMLParser = YAMLParser;

export default YAMLParser;