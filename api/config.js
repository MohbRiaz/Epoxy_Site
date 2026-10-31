/* GET /api/config — tells the website which services are switched on */
const { send } = require('./_lib/http');
module.exports = (req, res) => send(res, 200, {
  razorpay: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
  shiprocket: !!(process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD)
});
