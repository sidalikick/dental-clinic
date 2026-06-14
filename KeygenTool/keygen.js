const crypto = require('crypto');
const readline = require('readline');

const SECRET_KEY = "BM_SOFT_CLINIC_SECURE_KEY_2026"; // Keep this identical in backend

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("==================================================");
console.log("  DENTAL CLINIC SYSTEM - SERIAL KEY GENERATOR");
console.log("==================================================\n");

rl.question("Enter the client's Machine ID: ", (machineId) => {
  machineId = machineId.trim();
  
  if (!machineId) {
    console.error("Machine ID cannot be empty!");
    rl.close();
    return;
  }

  // Generate Serial Key
  const hash = crypto.createHmac('sha256', SECRET_KEY).update(machineId).digest('hex').toUpperCase();
  
  // Format the serial key like AAAA-BBBB-CCCC-DDDD
  const formattedSerial = hash.match(/.{1,4}/g).slice(0, 4).join('-');

  console.log("\n--------------------------------------------------");
  console.log("  MACHINE ID: " + machineId);
  console.log("  SERIAL KEY: " + formattedSerial);
  console.log("--------------------------------------------------\n");
  console.log("Copy the SERIAL KEY and give it to the client.");
  
  rl.close();
});
