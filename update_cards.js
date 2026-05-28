const fs = require('fs');
let data = fs.readFileSync('cardsData.js', 'utf8');
let jsonStr = data.substring(data.indexOf('['), data.lastIndexOf(']') + 1);
let cards = JSON.parse(jsonStr);

let currentCost = 15;
let currentVal = 1;

// Use a dynamic ratio that starts slightly smaller to make the VERY first few minutes smooth,
// then ramps up to the target ratio.
cards.forEach((c, i) => {
    // Smoothed transition
    // i=0: costRatio=1.5, valRatio=1.2
    // i=30: costRatio=3.2, valRatio=2.6
    let progress = Math.min(1, i / 30);
    let costRatio = 1.5 + (3.2 - 1.5) * progress;
    let valRatio = 1.2 + (2.6 - 1.2) * progress;

    c.baseCost = Math.floor(currentCost);
    c.value = Math.max(1, Math.floor(currentVal));

    currentCost *= costRatio;
    currentVal *= valRatio;
});

let newData = 'window.generatedCards = ' + JSON.stringify(cards, null, 4) + ';';
fs.writeFileSync('cardsData.js', newData);
console.log('Successfully updated cardsData.js!');
