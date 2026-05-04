const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function getReplacementContext(prefix, numberStr, isPurple) {
    let num = parseInt(numberStr.split('/')[0], 10);
    let colorHex = '';

    // Light
    if (num <= 200) {
        if (prefix.includes('text') || prefix.includes('border')) colorHex = '#17A2B8';
        else colorHex = '#17A2B8]/10'; // Needs bracket closing format if we use bg-[
    }
    // Mid
    else if (num <= 400) {
        colorHex = '#17A2B8';
    }
    // Dark
    else if (num <= 600) {
        colorHex = '#1B4F72';
    }
    // Darker
    else {
        colorHex = '#164060';
    }

    // Format based on prefix
    if (prefix.endsWith('-')) {
        // e.g. "bg-", "text-", "focus:ring-"
        if (num <= 200 && !prefix.includes('text') && !prefix.includes('border')) {
            return `${prefix}[#17A2B8]/10`;
        }
        return `${prefix}[${colorHex}]`;
    }

    return `${prefix}[${colorHex}]`;
}

function processContent(content) {
    // Replace indigo
    content = content.replace(/([a-zA-Z0-9:-]+)-indigo-(\d{2,3}(?:\/\d{1,3})?)/g, (match, prefix, number) => {
        return getReplacementContext(prefix + '-', number, false);
    });

    // Replace purple
    content = content.replace(/([a-zA-Z0-9:-]+)-purple-(\d{2,3}(?:\/\d{1,3})?)/g, (match, prefix, number) => {
        return getReplacementContext(prefix + '-', number, true);
    });

    // Fix the broken amber backgrounds that were partially replaced
    // "bg-[#17A2B8]/10 text-amber-700" -> let's make it fully #17A2B8
    content = content.replace(/text-amber-(\d{2,3})/g, 'text-[#1B4F72]');
    content = content.replace(/bg-amber-(\d{2,3}(?:\/\d{1,3})?)/g, 'bg-[#17A2B8]/10');
    content = content.replace(/border-amber-(\d{2,3})/g, 'border-[#17A2B8]/20');
    content = content.replace(/border-l-amber-(\d{2,3})/g, 'border-l-[#17A2B8]');
    content = content.replace(/shadow-amber-(\d{2,3})/g, 'shadow-[#17A2B8]/20');
    content = content.replace(/from-amber-(\d{2,3})/g, 'from-[#17A2B8]/10');
    content = content.replace(/to-orange-(\d{2,3})/g, 'to-[#1B4F72]/10');
    content = content.replace(/hover:bg-amber-(\d{2,3})/g, 'hover:bg-[#164060]');

    return content;
}

function walkSync(currentDirPath, callback) {
    fs.readdirSync(currentDirPath).forEach(function (name) {
        var filePath = path.join(currentDirPath, name);
        var stat = fs.statSync(filePath);
        if (stat.isFile() && (filePath.endsWith('.jsx') || filePath.endsWith('.js'))) {
            callback(filePath, stat);
        } else if (stat.isDirectory()) {
            walkSync(filePath, callback);
        }
    });
}

let modifiedFiles = 0;

walkSync(srcDir, function (filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    content = processContent(content);

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
        modifiedFiles++;
    }
});

console.log(`\nReplacement complete! Modified ${modifiedFiles} files.`);
