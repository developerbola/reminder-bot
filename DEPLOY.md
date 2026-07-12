# Deploying Reminder Bot to Low-Resource Server

**Server Specs:** 1GB Disk | 0.25 CPU | 256MB RAM

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Preparation](#server-preparation)
3. [Install Node.js](#install-nodejs)
4. [Deploy the Bot](#deploy-the-bot)
5. [Configure Environment](#configure-environment)
6. [Run with PM2](#run-with-pm2)
7. [Auto-Start on Boot](#auto-start-on-boot)
8. [Monitoring & Logs](#monitoring--logs)
9. [Resource Optimization](#resource-optimization)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Server IP address and SSH access (root or sudo user)
- Bot token from [@BotFather](https://t.me/BotFather)
- Telegram channel ID where bot will send messages
- Local machine with `scp` or `rsync`

---

## Server Preparation

SSH into your server:

```bash
ssh root@YOUR_SERVER_IP
```

Update the system:

```bash
apt update && apt upgrade -y
```

Install essential packages:

```bash
apt install -y curl git build-essential
```

---

## Install Node.js

Use Node.js v20 LTS (lightweight and stable):

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

Verify installation:

```bash
node -v   # Should show v20.x.x
npm -v    # Should show 10.x.x
```

Clean npm cache to save disk space:

```bash
npm cache clean --force
```

---

## Deploy the Bot

### Option A: Clone from Git (if repo is on GitHub)

```bash
cd /opt
git clone https://github.com/YOUR_USERNAME/reminder-bot.git
cd reminder-bot
```

### Option B: Upload via SCP (from your local machine)

Run this from your **local machine**, not the server:

```bash
scp -r /path/to/reminder-bot root@YOUR_SERVER_IP:/opt/reminder-bot
```

Then on the server:

```bash
cd /opt/reminder-bot
```

---

## Configure Environment

Create the `.env` file:

```bash
nano .env
```

Add your credentials:

```
BOT_TOKEN=your_bot_token_here
CHANNEL_ID=your_channel_id_here
```

Save and exit (`Ctrl+X`, then `Y`, then `Enter`).

Set proper permissions:

```bash
chmod 600 .env
```

---

## Install Dependencies

```bash
npm install --omit=dev
```

This skips dev dependencies and saves disk space.

---

## Run with PM2

PM2 keeps the bot running 24/7 and restarts it if it crashes.

Install PM2 globally:

```bash
npm install -g pm2
```

Start the bot:

```bash
cd /opt/reminder-bot
pm2 start index.js --name reminder-bot
```

Save PM2 process list:

```bash
pm2 save
```

---

## Auto-Start on Boot

Generate startup script:

```bash
pm2 startup
```

Run the command it outputs (looks like):

```bash
env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root
```

Verify it's set up:

```bash
pm2 status
```

---

## Monitoring & Logs

Check bot status:

```bash
pm2 status
```

View live logs:

```bash
pm2 logs reminder-bot
```

View error logs only:

```bash
pm2 logs reminder-bot --err
```

Monitor resource usage:

```bash
pm2 monit
```

---

## Resource Optimization

Since your server has only 256MB RAM and 0.25 CPU, apply these optimizations:

### 1. Limit PM2 Memory

Edit ecosystem config:

```bash
cd /opt/reminder-bot
pm2 start index.js --name reminder-bot --max-memory-restart 150M
```

This auto-restarts the bot if it uses more than 150MB RAM.

### 2. Create Ecosystem File

```bash
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    {
      name: "reminder-bot",
      script: "index.js",
      node_args: "--max-old-space-size=128",
      max_memory_restart: "150M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
```

Restart with ecosystem:

```bash
pm2 delete reminder-bot
pm2 start ecosystem.config.js
pm2 save
```

### 3. Add Swap Space (Important for 256MB RAM)

```bash
fallocate -l 256M /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
```

Verify swap:

```bash
free -h
```

### 4. Disable Unnecessary Services

```bash
systemctl disable cups bluetooth ModemManager 2>/dev/null
```

### 5. Clean Disk Space

```bash
apt autoremove -y
apt clean
rm -rf /var/log/*.gz /var/log/*.1
journalctl --vacuum-size=50M
```

---

## Systemd Alternative (Without PM2)

If you prefer systemd over PM2:

```bash
nano /etc/systemd/system/reminder-bot.service
```

```ini
[Unit]
Description=Reminder Telegram Bot
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/reminder-bot
ExecStart=/usr/bin/node --env-file=.env index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=NODE_OPTIONS=--max-old-space-size=128

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
systemctl daemon-reload
systemctl enable reminder-bot
systemctl start reminder-bot
```

Check status:

```bash
systemctl status reminder-bot
```

View logs:

```bash
journalctl -u reminder-bot -f
```

---

## Troubleshooting

### Bot keeps crashing (OOM killed)

```bash
dmesg | grep -i "out of memory"
```

Solution: Increase swap or reduce `--max-old-space-size`.

### Cannot connect to Telegram API

```bash
curl -s https://api.telegram.org/bot$BOT_TOKEN/getMe
```

Solution: Check firewall allows outbound HTTPS (port 443).

```bash
apt install -y ufw
ufw allow 443/tcp
ufw allow 22/tcp
ufw enable
```

### Bot not sending messages

1. Verify `CHANNEL_ID` is correct (should be like `-100xxxxxxxxxx`)
2. Bot must be admin in the channel
3. Check logs: `pm2 logs reminder-bot`

### Disk full

```bash
df -h
```

Clean up:

```bash
npm cache clean --force
apt autoremove -y
apt clean
pm2 logs reminder-bot --lines 0  # Truncate logs
```

### High CPU usage

0.25 CPU is very limited. The bot uses polling which is lightweight, but if CPU spikes:

```bash
pm2 unpublish reminder-bot   # Stops PM2 web interface
pm2 set pm2:NoDaemon true    # Reduces overhead
```

---

## Quick Reference Commands

| Action | Command |
|--------|---------|
| Check status | `pm2 status` |
| Restart bot | `pm2 restart reminder-bot` |
| Stop bot | `pm2 stop reminder-bot` |
| View logs | `pm2 logs reminder-bot` |
| Monitor | `pm2 monit` |
| Edit ecosystem | `nano /opt/reminder-bot/ecosystem.config.js` |
| Check RAM | `free -h` |
| Check disk | `df -h` |
| Check swap | `swapon --show` |

---

## Deployment Checklist

- [ ] Server updated and essentials installed
- [ ] Node.js v20 installed
- [ ] Bot code deployed to `/opt/reminder-bot`
- [ ] `.env` file created with `BOT_TOKEN` and `CHANNEL_ID`
- [ ] Dependencies installed with `npm install --omit=dev`
- [ ] PM2 installed and bot started
- [ ] PM2 startup configured for auto-restart on reboot
- [ ] Swap space added (256MB)
- [ ] Ecosystem file configured with memory limits
- [ ] Bot tested with `/start` command in Telegram
- [ ] Disk cleanup performed
