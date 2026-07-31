const fs = require('fs');
const csvText = fs.readFileSync('latest_gviz.csv', 'utf8');

function parseCSVRow(str) {
    let result = [];
    let cur = '';
    let inQuotes = false;
    for(let i=0; i<str.length; i++) {
        const c = str[i];
        if(c === '"') {
            inQuotes = !inQuotes;
        } else if(c === ',' && !inQuotes) {
            result.push(cur);
            cur = '';
        } else {
            cur += c;
        }
    }
    result.push(cur);
    return result;
}

let sums = {};
csvText.split('\n').forEach(line => {
    if(!line.trim()) return;
    const r = parseCSVRow(line);
    if(r.length > 7) {
        const dateStr = r[1] || '';
        const incStr = r[7] || '0';
        const inc = parseFloat(incStr.replace(/[^0-9.-]/g, '')) || 0;
        
        let m = -1;
        if (dateStr.includes('/10/2568')) m = 10;
        if (dateStr.includes('/11/2568')) m = 11;
        if (dateStr.includes('/12/2568')) m = 12;
        if (dateStr.includes('/01/2569')) m = 1;
        if (dateStr.includes('/02/2569')) m = 2;
        if (dateStr.includes('/03/2569')) m = 3;
        if (dateStr.includes('/04/2569')) m = 4;
        if (dateStr.includes('/05/2569')) m = 5;
        if (dateStr.includes('/06/2569')) m = 6;
        if (dateStr.includes('/07/2569')) m = 7;
        
        if (m !== -1) {
            sums[m] = (sums[m] || 0) + inc;
        }
    }
});
console.log('Correct Income Sums:', sums);
