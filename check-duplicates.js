import { readFileSync } from 'fs';

const data = JSON.parse(readFileSync('./src/data/CCGS list.js', 'utf-8'));

const storeKeys = data.stores.map(s => s.key);
const uniqueKeys = new Set(storeKeys);

console.log('Total stores:', storeKeys.length);
console.log('Unique keys:', uniqueKeys.size);
console.log('Duplicates:', storeKeys.length - uniqueKeys.size);

if (storeKeys.length !== uniqueKeys.size) {
  const keyCount = {};
  storeKeys.forEach(key => {
    keyCount[key] = (keyCount[key] || 0) + 1;
  });

  const duplicateKeys = Object.entries(keyCount)
    .filter(([key, count]) => count > 1)
    .map(([key, count]) => ({ key: parseInt(key), count }));

  console.log('\nDuplicate keys found:');
  duplicateKeys.forEach(d => {
    console.log(`  Key ${d.key}: appears ${d.count} times`);
    const stores = data.stores.filter(s => s.key === d.key);
    stores.forEach((s, i) => {
      console.log(`    ${i + 1}. ${s.name} (parent: ${s.parentKey})`);
    });
  });
}
