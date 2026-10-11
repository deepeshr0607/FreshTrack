// Vercel detects this root Express entry; local listening remains in src/server.ts.
const express = require('express');
const { requirePreviewEnvironment } = require('./scripts/deployment.cjs');
requirePreviewEnvironment();
const { createApp } = require('./dist/app.js');
const app = express();
app.use(createApp());
module.exports = app;
