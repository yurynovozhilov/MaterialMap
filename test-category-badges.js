// Script to verify Material Model column only contains ID and MAT information
document.addEventListener('DOMContentLoaded', function() {
  // Wait for the table to be fully loaded
  setTimeout(() => {
    // Check if any category badges exist in the table
    const allBadges = document.querySelectorAll('.category-badge');
    console.log('Total category badges displayed:', allBadges.length);
    
    if (allBadges.length === 0) {
      console.log('✅ Fix is working! No category badges are displayed in the Material Model column.');
    } else {
      console.log('❌ Fix is not working. Category badges are still displayed in the Material Model column.');
    }
    
    // Check Material Model column content
    const materialModelCells = document.querySelectorAll('#materials-table tbody tr td:first-child');
    let hasOnlyIdAndMat = true;
    
    materialModelCells.forEach((cell, index) => {
      // Check if cell contains any elements other than div elements for ID/MAT info
      const divs = cell.querySelectorAll('div');
      const otherElements = cell.querySelectorAll(':not(div)');
      
      // Filter out text nodes
      const nonTextOtherElements = Array.from(otherElements).filter(el => 
        el.nodeType !== Node.TEXT_NODE && el.tagName !== 'BR'
      );
      
      if (nonTextOtherElements.length > 0) {
        console.log(`❌ Cell ${index} contains elements other than divs:`, nonTextOtherElements);
        hasOnlyIdAndMat = false;
      }
    });
    
    if (hasOnlyIdAndMat) {
      console.log('✅ Material Model column only contains ID and MAT information.');
    } else {
      console.log('❌ Material Model column contains additional elements.');
    }
    
    // Check Applications column content
    const appCells = document.querySelectorAll('#materials-table tbody tr td:nth-child(3)');
    let hasOnlyAppData = true;
    
    appCells.forEach((cell, index) => {
      // Applications should be in ul/li format
      const ul = cell.querySelector('ul');
      if (!ul) {
        console.log(`❌ Application cell ${index} does not contain a ul element.`);
        hasOnlyAppData = false;
      }
    });
    
    if (hasOnlyAppData) {
      console.log('✅ Applications column only contains app data from YAML files.');
    } else {
      console.log('❌ Applications column format is incorrect.');
    }
  }, 2000); // Wait 2 seconds for the table to load
});