require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const passport = require('../config/passport');
const authRoutes = require('../routes/authRoutes');
const express = require('express');
const app = express();
app.use(passport.initialize());
app.use('/api/auth', authRoutes);

// List all routes
function listRoutes(router, prefix) {
  router.stack.forEach((layer) => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
      console.log(`  ${methods} ${prefix}${layer.route.path}`);
    } else if (layer.name === 'router' && layer.handle.stack) {
      listRoutes(layer.handle, prefix);
    }
  });
}

try {
  listRoutes(app.router || app._router, '');
} catch (e) {
  console.log('Route listing not supported in Express 5 this way, but routes are registered.');
}

console.log('\nAll modules loaded without errors!');
console.log('GOOGLE_CLIENT_ID set:', !!process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'your_google_client_id');
console.log('GOOGLE_CLIENT_SECRET set:', !!process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CLIENT_SECRET !== 'your_google_client_secret');
console.log('GOOGLE_CALLBACK_URL:', process.env.GOOGLE_CALLBACK_URL);
console.log('CLIENT_URL:', process.env.CLIENT_URL);
