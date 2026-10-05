// Run from this directory: pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'yosis',
      cwd: __dirname,
      script: './scripts/start.mjs',
      interpreter: process.execPath,
      exec_mode: 'fork',
      instances: 1,
      watch: false,
      autorestart: true,
      wait_ready: true,
      listen_timeout: 600000,
      kill_timeout: 15000,
      shutdown_with_message: true,
      restart_delay: 2000,
      max_restarts: 5,
      time: true,
      env: {
        NODE_ENV: 'production',
        PORT: '4444',
        YOSIS_API_PORT: '4444',
        YOSIS_LISTEN_HOST: '0.0.0.0',
        YOSIS_STANDALONE: '1',
      },
    },
  ],
};
