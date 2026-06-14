// Dependencies for bundling
require('express');
require('cors');
require('pg');
require('dotenv');
require('node-machine-id');
require('crypto');
require('path');
require('fs');
require('http');

const { runAutoRepair } = require('./db_init_service.js');

async function launch() {
    try {
        await runAutoRepair();
        // Load the actual obfuscated app (or normal app.js if not obfuscated)
        if (require('fs').existsSync(require('path').join(__dirname, 'app-obfuscated.js'))) {
            require('./app-obfuscated.js');
        } else {
            require('./app.js');
        }
    } catch (err) {
        console.error('SYSTEM_HALT: Could not initialize database. Application cannot start.');
        // Keep window open for user to see error
        setTimeout(() => {}, 1000000);
    }
}

launch();
