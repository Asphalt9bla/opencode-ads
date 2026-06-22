// Quick math check
const cpm = 500; // cents
const durationMs = 5000;
const earned = Math.floor((cpm * 0.7 * durationMs) / 1000000);
console.log("Raw earned (cents):", earned);
console.log("In dollars:", (earned / 100).toFixed(4));

// The issue: cpm is in cents, so 500 cents = $5
// Formula: (500 * 0.7 * 5000) / 1000000 = 1.75 cents
// But we want to store in smallest unit (like satoshi for BTC)
// Let's use 10000 as divisor to get "micro-cents" (1 cent = 100 micro-cents)
const earnedMicro = Math.floor((cpm * 0.7 * durationMs) / 10000);
console.log("Micro-cents:", earnedMicro);
console.log("In dollars:", (earnedMicro / 10000).toFixed(4));

// Or: just multiply by 1000 to get finer granularity
const earnedFine = Math.floor((cpm * durationMs * 0.7) / 1000);
console.log("Fine-grained:", earnedFine);
console.log("In dollars:", (earnedFine / 100000).toFixed(4));
