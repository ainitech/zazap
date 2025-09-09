module.exports = {
  apps: [
    {
      name: 'zazap-backend',
      script: 'index.js',
      cwd: __dirname,
      instances: process.env.WEB_CONCURRENCY || 1,
      exec_mode: 'fork', // usar 'cluster' só se Redis/socket escalado
      watch: false,
      env: {
        NODE_ENV: 'production'
      },
      env_production: {
        NODE_ENV: 'production'
      },
      max_restarts: 10,
      min_uptime: '30s',
      restart_delay: 5000,
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      merge_logs: true,
      time: true,
      kill_timeout: 10000,
    }
  ]
};
