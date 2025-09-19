module.exports = {
    apps: [
        {
            name: "pos-api",
            script: "app.js", //  npm start
            instances: 1,
            autorestart: true,
            watch: false,
            exec_mode: "cluster",
            listen_timeout: 50000,
            kill_timeout: 5000,
            interpreter: "node",
            env: {
                NODE_ENV: "production",
                PORT: 4100,
            },
        },
    ],
};
 
 
// pm2 start ecosystem.config.js