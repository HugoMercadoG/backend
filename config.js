const config = {
    host: process.env.MYSQLHOST || 'roundhouse.proxy.rlwy.net',
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || 'HftLWUWWxXwfulIXtKseGFiwuBmmxUWN',
    database: process.env.MYSQLDATABASE || 'railway',
    port: process.env.MYSQLPORT || 48983
  };
  
  module.exports = config;
  