const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Konfiguracja z .env
const BOT_TOKEN = process.env.BOT_TOKEN;
const PORT = process.env.PORT || 3000;

// Symbole i wypłaty
const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '🔔', '💎', '⭐'];
const PAYOUTS = {
    3: 10, // 3 takie same = x10
    2: 2   // 2 takie same = x2
};

// Prosta baza danych w pamięci (tymczasowo zamiast MongoDB)
const gameDatabase = new Map();

// Walidacja Telegram WebApp InitData
function validateTelegramWebAppData(initData) {
    if (!initData) {
        console.log('No init data provided');
        return { id: 'test_user' }; // Na potrzeby testów lokalnych
    }
    
    try {
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');
        urlParams.delete('hash');
        
        const dataCheckString = Array.from(urlParams.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');
        
        const secretKey = crypto
            .createHmac('sha256', 'WebAppData')
            .update(BOT_TOKEN)
            .digest();
        
        const calculatedHash = crypto
            .createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');
        
        if (calculatedHash === hash) {
            return JSON.parse(urlParams.get('user') || '{}');
        }
    } catch (error) {
        console.error('Telegram validation error:', error);
    }
    
    // Fallback dla testów lokalnych
    return { id: 'test_user_' + Date.now() };
}

// Generowanie losowych symboli
function generateSpinResult() {
    const symbols = [
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
    ];
    
    const symbolCounts = {};
    symbols.forEach(symbol => {
        symbolCounts[symbol] = (symbolCounts[symbol] || 0) + 1;
    });
    
    const maxCount = Math.max(...Object.values(symbolCounts));
    const won = maxCount >= 2;
    const multiplier = PAYOUTS[maxCount] || 0;
    
    return { symbols, won, multiplier };
}

// TYMCZASOWO - symulacja wypłaty (później smart kontrakt)
async function sendWinnings(playerAddress, amount) {
    console.log(`💰 Symulacja wypłaty: ${amount / 1e9} TON do ${playerAddress}`);
    return true;
}

// API: Pobierz saldo gracza
app.post('/api/balance', async (req, res) => {
    try {
        const { initData, walletAddress } = req.body;
        const user = validateTelegramWebAppData(initData);
        
        if (!user || !user.id) {
            return res.status(401).json({ error: 'Invalid user data' });
        }
        
        const userId = user.id.toString();
        const playerData = gameDatabase.get(userId) || { 
            balance: 1000000000, // 1 TON startowy na testy
            totalPlayed: 0, 
            totalWon: 0,
            walletAddress: walletAddress
        };
        
        // Zapisz wallet address
        if (walletAddress && walletAddress !== playerData.walletAddress) {
            playerData.walletAddress = walletAddress;
            gameDatabase.set(userId, playerData);
        }
        
        console.log(`👤 Użytkownik ${userId} - saldo: ${playerData.balance / 1e9} TON`);
        res.json({ balance: playerData.balance });
    } catch (error) {
        console.error('Balance error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// API: Spin
app.post('/api/spin', async (req, res) => {
    try {
        const { initData, walletAddress, betAmount } = req.body;
        const user = validateTelegramWebAppData(initData);
        
        if (!user || !user.id) {
            return res.status(401).json({ error: 'Invalid user data' });
        }
        
        const userId = user.id.toString();
        const playerData = gameDatabase.get(userId) || { 
            balance: 1000000000, // 1 TON startowy
            totalPlayed: 0, 
            totalWon: 0,
            walletAddress: walletAddress
        };
        
        if (betAmount > playerData.balance) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }
        
        if (betAmount < 10000000) { // minimum 0.01 TON
            return res.status(400).json({ error: 'Minimum bet is 0.01 TON' });
        }
        
        // Generuj wynik
        const spinResult = generateSpinResult();
        const winAmount = spinResult.won ? betAmount * spinResult.multiplier : 0;
        
        // Aktualizuj saldo
        playerData.balance -= betAmount;
        playerData.totalPlayed += betAmount;
        
        if (spinResult.won) {
            playerData.balance += winAmount;
            playerData.totalWon += winAmount;
            
            // Wyślij wygraną (tymczasowo symulacja)
            if (winAmount > 0 && playerData.walletAddress) {
                await sendWinnings(playerData.walletAddress, winAmount);
            }
        }
        
        gameDatabase.set(userId, playerData);
        
        console.log(`🎰 Spin ${userId}: bet ${betAmount/1e9} TON, symbols: ${spinResult.symbols.join('')}, won: ${spinResult.won ? winAmount/1e9 + ' TON' : 'NO'}`);
        
        res.json({
            success: true,
            symbols: spinResult.symbols,
            won: spinResult.won,
            winAmount: winAmount,
            newBalance: playerData.balance,
            multiplier: spinResult.multiplier
        });
        
    } catch (error) {
        console.error('Spin error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// API: Historia gier
app.post('/api/history', (req, res) => {
    try {
        const { initData } = req.body;
        const user = validateTelegramWebAppData(initData);
        
        if (!user || !user.id) {
            return res.status(401).json({ error: 'Invalid user data' });
        }
        
        const userId = user.id.toString();
        const playerData = gameDatabase.get(userId) || { 
            balance: 1000000000,
            totalPlayed: 0, 
            totalWon: 0 
        };
        
        res.json({
            totalPlayed: playerData.totalPlayed,
            totalWon: playerData.totalWon,
            balance: playerData.balance,
            gamesCount: Math.floor(playerData.totalPlayed / 100000000) // przybliżona liczba gier
        });
    } catch (error) {
        console.error('History error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'TON Slot Machine Backend działa!', 
        timestamp: new Date().toISOString(),
        players: gameDatabase.size
    });
});

// Uruchom serwer
app.listen(PORT, () => {
    console.log(`🚀 TON Slot Machine Backend uruchomiony na porcie ${PORT}`);
    console.log(`📡 Test API: http://localhost:${PORT}/api/test`);
    console.log(`🎰 Gotowy do gry!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('💤 Zamykanie serwera...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('💤 Zamykanie serwera...');
    process.exit(0);
});