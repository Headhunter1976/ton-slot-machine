const { Telegraf, Markup } = require('telegraf');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const MINI_APP_URL = process.env.MINI_APP_URL || 'http://localhost:8080';

// Start command
bot.start((ctx) => {
    const user = ctx.from;
    console.log(`👤 New user: ${user.first_name} (${user.id})`);

    ctx.reply(
        `🎰 *TON Slot Machine* 🎰\n\n` +
        `Witaj ${user.first_name}! 👋\n\n` +
        `💎 Graj za prawdziwe TON!\n` +
        `🍒🍒🍒 = wygrana x10\n` +
        `🍋🍋 = wygrana x2\n` +
        `💰 Start z 1 TON demo\n\n` +
        `🌐 URL gry: ${MINI_APP_URL}\n` +
        `📱 Skopiuj i otwórz w przeglądarce!\n\n` +
        `🚀 Komendy:\n` +
        `/game - Link do gry\n` +
        `/help - Pomoc`,
        {
            parse_mode: 'Markdown'
        }
    );
});

// Game command
bot.command('game', (ctx) => {
    ctx.reply(
        `🎰 *Slot Machine*\n\n` +
        `🌐 ${MINI_APP_URL}\n\n` +
        `📱 Skopiuj link powyżej i otwórz w przeglądarce!`,
        { parse_mode: 'Markdown' }
    );
});

// Help command
bot.command('help', (ctx) => {
    ctx.reply(
        `🎰 *TON Slot Machine - Pomoc*\n\n` +
        `📱 /game - Otwórz grę\n` +
        `🎮 /stats - Twoje statystyki\n` +
        `ℹ️ /info - Informacje o grze\n\n` +
        `💡 *Zasady gry:*\n` +
        `🍒🍒🍒 = x10 stawki\n` +
        `🍋🍋 = x2 stawki\n` +
        `💰 Minimalna stawka: 0.01 TON\n\n` +
        `🎯 Powodzenia!`,
        { parse_mode: 'Markdown' }
    );
});

// Stats command
bot.command('stats', (ctx) => {
    const user = ctx.from;
    
    ctx.reply(
        `📊 *Statystyki gracza*\n\n` +
        `👤 ${user.first_name}\n` +
        `🆔 ID: ${user.id}\n\n` +
        `🎮 Aby zobaczyć szczegółowe statystyki\n` +
        `otwórz grę i kliknij "Statystyki"`,
        { parse_mode: 'Markdown' }
    );
});

// Info command
bot.command('info', (ctx) => {
    ctx.reply(
        `ℹ️ *TON Slot Machine*\n\n` +
        `🎰 Pierwsza gra hazardowa na TON\n` +
        `🔗 Integracja z portfelem TON\n` +
        `⚡ Natychmiastowe wypłaty\n` +
        `🎮 Sprawiedliwa gra (server-side)\n\n` +
        `🛡️ *Bezpieczeństwo:*\n` +
        `• Wszystkie transakcje przez blockchain\n` +
        `• Szyfrowane połączenia\n` +
        `• Walidacja Telegram WebApp\n\n` +
        `🎯 Graj odpowiedzialnie!`,
        { parse_mode: 'Markdown' }
    );
});

// Handle WebApp data (gdy użytkownik zamknie mini app)
bot.on('web_app_data', (ctx) => {
    const webAppData = ctx.webAppData;
    console.log('📱 WebApp data received:', webAppData);
    
    try {
        const data = JSON.parse(webAppData.data);
        
        if (data.action === 'game_result') {
            const { won, amount, symbols } = data;
            
            if (won) {
                ctx.reply(
                    `🎉 *WYGRANA!*\n\n` +
                    `🎰 ${symbols.join('')}\n` +
                    `💰 +${amount} TON\n\n` +
                    `Gratulacje! 🎊`,
                    { parse_mode: 'Markdown' }
                );
            }
        }
    } catch (error) {
        console.error('Error parsing WebApp data:', error);
    }
});

// Handle text messages
bot.on('text', (ctx) => {
    const text = ctx.message.text.toLowerCase();
    
    if (text.includes('gra') || text.includes('slot') || text.includes('graj')) {
        ctx.reply(
            `🎰 Użyj komendy /game aby otworzyć grę\n` +
            `lub /help aby zobaczyć wszystkie komendy!`
        );
    } else if (text.includes('pomoc') || text.includes('help')) {
        ctx.replyWithHTML('ℹ️ Użyj komendy <b>/help</b> aby zobaczyć pomoc!');
    } else {
        ctx.reply(
            `👋 Witaj! Jestem bot TON Slot Machine\n\n` +
            `🎮 /game - Zagraj\n` +
            `ℹ️ /help - Pomoc\n` +
            `📊 /stats - Statystyki`
        );
    }
});

// Error handling
bot.catch((err, ctx) => {
    console.error('Bot error:', err);
    ctx.reply('❌ Wystąpił błąd. Spróbuj ponownie za chwilę.');
});

// Launch bot
bot.launch().then(() => {
    console.log('🤖 TON Slot Machine Bot uruchomiony!');
    console.log(`📱 Mini App URL: ${MINI_APP_URL}`);
    console.log('🎯 Bot gotowy do gry!');
});

// Graceful stop
process.once('SIGINT', () => {
    console.log('💤 Zamykanie bota...');
    bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
    console.log('💤 Zamykanie bota...');
    bot.stop('SIGTERM');
});