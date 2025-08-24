// server.js
const app = require('./app');
const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log(`Workshop app running: http://localhost:${PORT}`));
