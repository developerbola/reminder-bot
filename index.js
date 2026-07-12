import TelegramBot from "node-telegram-bot-api";
import cron from "node-cron";

const _origLog = console.log.bind(console);
const _origError = console.error.bind(console);
function _formatTime() {
  return new Date().toISOString();
}
console.log = (...args) => _origLog(`[${_formatTime()}]`, ...args);
console.error = (...args) => _origError(`[${_formatTime()}]`, ...args);

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const TIMEZONE = "Asia/Tashkent";
const ADMIN_USERNAME = "@mutawirr";

if (!BOT_TOKEN || !CHANNEL_ID) {
  console.error("❌ BOT_TOKEN and CHANNEL_ID are required in .env");
  process.exit(1);
}

const zikrs = [
  "Astaghfirulloh",
  "Subhanalloh",
  "Alhamdulillah",
  "Allahu Akbar",
  "La ilaha illalloh",
  "La hawla wa la quwwata illa billah",
  "Subhanallahi wa bihamdihi",
  "Subhanallahil Azim",
  "HasbunAllahu wa ni'mal wakil",
  "La ilaha illallahu wahdahu la sharika lah",
];

let index = 0;

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

async function sendZikr() {
  const zikr = zikrs[index % zikrs.length];
  index++;
  try {
    await bot.sendMessage(CHANNEL_ID, `Say - ${zikr}`);
    console.log(`✅ Sent: Say - ${zikr}`);
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

const schedule = [
  "0 7 * * *",
  "30 8 * * *",
  "0 10 * * *",
  "30 11 * * *",
  "0 13 * * *",
  "30 14 * * *",
  "0 16 * * *",
  "30 17 * * *",
  "0 19 * * *",
  "0 21 * * *",
];

schedule.forEach((time) => {
  cron.schedule(time, sendZikr, { timezone: TIMEZONE });
});

// Admin commands
function getSafeUsername(msg) {
  const username = msg.from?.username;
  if (!username) return null;
  return username.startsWith("@") ? username : `@${username}`;
}

function isAdmin(msg) {
  return getSafeUsername(msg) === ADMIN_USERNAME;
}

bot.onText(/\/send/, async (msg) => {
  if (!isAdmin(msg)) {
    return bot.sendMessage(
      msg.chat.id,
      `❌ Only ${ADMIN_USERNAME} can use this command.`,
    );
  }

  await sendZikr();
  bot.sendMessage(msg.chat.id, "✅ Zikr sent!");
});

bot.onText(/\/status/, (msg) => {
  if (!isAdmin(msg)) {
    return bot.sendMessage(
      msg.chat.id,
      `❌ Only ${ADMIN_USERNAME} can use this command.`,
    );
  }

  bot.sendMessage(
    msg.chat.id,
    `✅ Bot is running. Next zikr will be sent according to schedule in timezone ${TIMEZONE}.\nAdmin: ${ADMIN_USERNAME}`,
  );
});

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "🤲 Zikr bot is running.\n\n" +
      "Sends 10 zikrs daily at:\n" +
      "7:00 • 8:30 • 10:00 • 11:30 • 13:00\n" +
      "14:30 • 16:00 • 17:30 • 19:00 • 21:00\n\n" +
      "/send — send a zikr now (admin only)\n" +
      "/status — admin-only bot status",
  );
});

bot.on("polling_error", (err) => console.error("Polling error:", err.message));

console.log(`✅ Bot running | 10 zikrs/day | Timezone: ${TIMEZONE}`);
