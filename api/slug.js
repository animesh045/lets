// forwards ALL requests to Express and strips the /api prefix
const app = require('../app');
module.exports = (req, res) => {
  req.url = req.url.replace(/^\/api(\/|$)/, '/') || '/';
  return app(req, res);
};
