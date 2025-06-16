// Vercel Serverless Function
const crypto = require('crypto');

// Konfiguracja
const BOT_TOKEN = process.env.BOT_TOKEN;

// Symbole i wypłaty
const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '🔔', '💎', '⭐'];
const PAYOUTS = {
    3: 10, // 3 takie same = x10
    2: 2   // 2 takie same = x2
};

// Prosta baza danych w pamięci (dla Vercel)
const gameDatabase = new Map();

// Walidacja Telegram WebApp InitData
function validateTelegramWebAppData(initData) {
    if (!initData) {
        return { id: 'test_user_' + Date.now() };
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

// Symulacja wypłaty
async function sendWinnings(playerAddress, amount) {
    console.log(`💰 Symulacja wypłaty: ${amount / 1e9} TON do ${playerAddress}`);
    return true;
}

// Main handler
async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const { method, body } = req;
    const url = new URL(req.url, `https://${req.headers.host}`);
    const path = url.pathname;
    
    try {
        // API Routes
        if (path === '/test' && method === 'GET') {
            return res.json({ 
                message: 'TON Slot Machine Backend działa!', 
                timestamp: new Date().toISOString(),
                players: gameDatabase.size
            });
        }
        
        if (path === '/balance' && method === 'POST') {
            const { initData, walletAddress } = body;
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
            
            if (walletAddress && walletAddress !== playerData.walletAddress) {
                playerData.walletAddress = walletAddress;
                gameDatabase.set(userId, playerData);
            }
            
            console.log(`👤 Użytkownik ${userId} - saldo: ${playerData.balance / 1e9} TON`);
            return res.json({ balance: playerData.balance });
        }
        
        if (path === '/spin' && method === 'POST') {
            const { initData, walletAddress, betAmount } = body;
            const user = validateTelegramWebAppData(initData);
            
            if (!user || !user.id) {
                return res.status(401).json({ error: 'Invalid user data' });
            }
            
            const userId = user.id.toString();
            const playerData = gameDatabase.get(userId) || { 
                balance: 1000000000,
                totalPlayed: 0, 
                totalWon: 0,
                walletAddress: walletAddress
            };
            
            if (betAmount > playerData.balance) {
                return res.status(400).json({ error: 'Insufficient balance' });
            }
            
            if (betAmount < 10000000) {
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
                
                if (winAmount > 0 && playerData.walletAddress) {
                    await sendWinnings(playerData.walletAddress, winAmount);
                }
            }
            
            gameDatabase.set(userId, playerData);
            
            console.log(`🎰 Spin ${userId}: bet ${betAmount/1e9} TON, symbols: ${spinResult.symbols.join('')}, won: ${spinResult.won ? winAmount/1e9 + ' TON' : 'NO'}`);
            
            return res.json({
                success: true,
                symbols: spinResult.symbols,
                won: spinResult.won,
                winAmount: winAmount,
                newBalance: playerData.balance,
                multiplier: spinResult.multiplier
            });
        }
        
        if (path === '/history' && method === 'POST') {
            const { initData } = body;
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
            
            return res.json({
                totalPlayed: playerData.totalPlayed,
                totalWon: playerData.totalWon,
                balance: playerData.balance,
                gamesCount: Math.floor(playerData.totalPlayed / 100000000)
            });
        }
        
        // 404 for other routes
        return res.status(404).json({ error: 'Not found' });
        
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: 'Server error' });
    }
}

module.exports = handler;