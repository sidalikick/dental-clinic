// Launcher to help pkg find dependencies hidden by obfuscation
require('express');
require('cors');
require('pg');
require('dotenv');
require('node-machine-id');
require('crypto');
require('path');
require('fs');
require('http');

require('./db_cpanel.js');

// Load the actual obfuscated app
require('./app-obfuscated.js');
