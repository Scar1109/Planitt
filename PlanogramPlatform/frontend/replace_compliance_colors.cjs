const fs = require('fs');

const files = [
    'c:\\Users\\kavee\\OneDrive\\Desktop\\Research\\Planitt\\PlanogramPlatform\\frontend\\src\\pages\\ComplianceDashboard.jsx',
    'c:\\Users\\kavee\\OneDrive\\Desktop\\Research\\Planitt\\PlanogramPlatform\\frontend\\src\\pages\\ShelfCompliance.jsx',
    'c:\\Users\\kavee\\OneDrive\\Desktop\\Research\\Planitt\\PlanogramPlatform\\frontend\\src\\pages\\SystemAnalysis.jsx'
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // Button states
    content = content.replace(/bg-blue-600/g, 'bg-[#1B4F72]');
    content = content.replace(/hover:bg-blue-700/g, 'hover:bg-[#164060]');
    content = content.replace(/focus:ring-blue-500(\/20)?/g, 'focus:ring-[#17A2B8]$1');
    content = content.replace(/focus:border-blue-500/g, 'focus:border-[#17A2B8]');

    // Gradients
    content = content.replace(/from-blue-600/g, 'from-[#1B4F72]');
    content = content.replace(/hover:from-blue-700/g, 'hover:from-[#164060]');
    content = content.replace(/to-blue-900/g, 'to-[#164060]');
    content = content.replace(/text-blue-100/g, 'text-[#17A2B8]');
    content = content.replace(/shadow-blue-200/g, 'shadow-[#17A2B8]/20');

    // Backgrounds
    content = content.replace(/bg-blue-50\/10/g, 'bg-[#17A2B8]/5');
    content = content.replace(/hover:bg-blue-50\/30/g, 'hover:bg-[#17A2B8]/10');
    content = content.replace(/bg-blue-50/g, 'bg-[#17A2B8]/10');

    // Text Colors
    content = content.replace(/text-blue-500/g, 'text-[#17A2B8]');
    content = content.replace(/text-blue-600/g, 'text-[#17A2B8]');
    content = content.replace(/text-blue-700/g, 'text-[#1B4F72]');
    content = content.replace(/text-blue-900/g, 'text-[#1B4F72]');
    content = content.replace(/group-hover:text-blue-500/g, 'group-hover:text-[#17A2B8]');
    content = content.replace(/hover:text-blue-500/g, 'hover:text-[#17A2B8]');
    content = content.replace(/hover:text-blue-600/g, 'hover:text-[#1B4F72]');

    // Borders
    content = content.replace(/border-blue-100/g, 'border-[#17A2B8]/20');
    content = content.replace(/border-blue-300/g, 'border-[#17A2B8]/40');
    content = content.replace(/hover:border-blue-300/g, 'hover:border-[#17A2B8]/50');
    content = content.replace(/border-blue-400/g, 'border-[#17A2B8]/60');
    content = content.replace(/hover:border-blue-400/g, 'hover:border-[#17A2B8]');
    content = content.replace(/border-blue-500/g, 'border-[#17A2B8]');
    content = content.replace(/border-blue-600/g, 'border-[#1B4F72]');

    // Fix Gradient Button edge cases
    content = content.replace(/bg-gradient-to-r from-\[#1B4F72\] to-\[#1B4F72\] hover:from-\[#164060\] hover:to-\[#164060\]/g, 'bg-[#1B4F72] hover:bg-[#164060]');

    fs.writeFileSync(file, content);
    console.log(`Updated blue occurrences in: ${file}`);
});
