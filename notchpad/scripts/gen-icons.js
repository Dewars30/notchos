#!/usr/bin/env node
/**
 * gen-icons.js
 * Generates placeholder PNG icons for Tauri bundling.
 * Run once: node scripts/gen-icons.js
 * 
 * For a real icon, drop a 1024x1024 icon.png into src-tauri/icons/
 * and run: npx @tauri-apps/cli icon src-tauri/icons/icon.png
 */

const fs = require("fs");
const path = require("path");

const iconsDir = path.join(__dirname, "../src-tauri/icons");
fs.mkdirSync(iconsDir, { recursive: true });

// Minimal valid 1x1 PNG (base64) - just enough to satisfy Tauri's bundler
// during dev. Replace with real icons before shipping.
const PLACEHOLDER_PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

const required = [
  "32x32.png",
  "128x128.png",
  "128x128@2x.png",
];

for (const name of required) {
  const dest = path.join(iconsDir, name);
  if (!fs.existsSync(dest)) {
    fs.writeFileSync(dest, PLACEHOLDER_PNG_1x1);
    console.log("created placeholder:", name);
  } else {
    console.log("exists:", name);
  }
}

// icon.icns and icon.ico are needed for bundle but can be empty during dev
// Tauri will warn but won't fail
for (const name of ["icon.icns", "icon.ico"]) {
  const dest = path.join(iconsDir, name);
  if (!fs.existsSync(dest)) {
    fs.writeFileSync(dest, Buffer.alloc(0));
    console.log("created empty:", name);
  }
}

console.log("\nDone. For real icons run:");
console.log("  npx @tauri-apps/cli icon your-1024x1024-icon.png");
