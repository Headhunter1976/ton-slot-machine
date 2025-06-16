const crypto = require('crypto');

// Konfiguracja
const BOT_TOKEN = process.env.BOT_TOKEN;

// Symbole i wypłaty
const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '🔔', '💎', '⭐'];
const PAYOUTS = {
    3: 10, // 3 takie same = x10
    2: 2   // 2 takie same = x2
};

// Baza danych - tylko dla statystyk (saldo przechowywane w frontend)
const gameDatabase = new Map();

// Walidacja Telegram WebApp InitData
function validateTelegramWebAppData(initData) {
    if (!initData || initData === 'guest_user' || initData.startsWith('demo_user_')) {
        return { id: initData || 'guest_user' };
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
            .update(BOT_TOKEN || 'test')
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
    
    return { id: initData || 'guest_user' };
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

// Pobierz lub utwórz dane gracza
function getPlayerData(userId, currentBalance, walletAddress) {
    let playerData = gameDatabase.get(userId);
    
    if (!playerData) {
        // Nowy gracz - utwórz dane
        playerData = {
            balance: currentBalance || 1000000000, // 1 TON startowy
            totalPlayed: 0,
            totalWon: 0,
            walletAddress: walletAddress,
            gamesCount: 0
        };
        gameDatabase.set(userId, playerData);
        console.log(`👤 Nowy gracz: ${userId}, startowe saldo: ${(playerData.balance / 1e9).toFixed(2)} TON`);
    } else {
        // Istniejący gracz - aktualizuj saldo jeśli podane
        if (currentBalance !== undefined && currentBalance !== null) {
            playerData.balance = currentBalance;
        }
        if (walletAddress && walletAddress !== playerData.walletAddress) {
            playerData.walletAddress = walletAddress;
        }
    }
    
    return playerData;
}

// GŁÓWNY HANDLER z routingiem
module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const { method } = req;
    const url = new URL(req.url, `https://${req.headers.host}`);
    const path = url.pathname;
    
    console.log(`🔄 API Request: ${method} ${path}`);
    
    try {
        // ROUTING według ścieżki
        
        // GET /api/test
        if (path === '/api/test' && method === 'GET') {
            return res.json({ 
                message: 'TON Slot Machine Backend działa!', 
                timestamp: new Date().toISOString(),
                players: gameDatabase.size
            });
        }
        
        // POST /api/balance
        if (path === '/api/balance' && method === 'POST') {
            const { initData, walletAddress, currentBalance } = req.body;
            const user = validateTelegramWebAppData(initData);
            
            if (!user || !user.id) {
                return res.status(401).json({ error: 'Invalid user data' });
            }
            
            const userId = user.id.toString();
            const playerData = getPlayerData(userId, currentBalance, walletAddress);
            
            console.log(`👤 Użytkownik ${userId} - saldo: ${(playerData.balance / 1e9).toFixed(2)} TON`);
            return res.json({ balance: playerData.balance });
        }
        
        // POST /api/spin
        if (path === '/api/spin' && method === 'POST') {
            const { initData, walletAddress, betAmount, currentBalance } = req.body;
            const user = validateTelegramWebAppData(initData);
            
            if (!user || !user.id) {
                return res.status(401).json({ error: 'Invalid user data' });
            }
            
            const userId = user.id.toString();
            
            // WAŻNE: Użyj currentBalance z frontend, nie z gameDatabase
            let playerBalance = currentBalance || 1000000000;
            
            if (betAmount > playerBalance) {
                return res.status(400).json({ error: 'Insufficient balance' });
            }
            
            if (betAmount < 10000000) {
                return res.status(400).json({ error: 'Minimum bet is 0.01 TON' });
            }
            
            // Generuj wynik
            const spinResult = generateSpinResult();
            const winAmount = spinResult.won ? betAmount * spinResult.multiplier : 0;
            
            // Oblicz nowe saldo
            const newBalance = playerBalance - betAmount + winAmount;
            
            // Aktualizuj statystyki gracza
            const playerData = getPlayerData(userId, newBalance, walletAddress);
            playerData.totalPlayed += betAmount;
            playerData.gamesCount += 1;
            
            if (spinResult.won) {
                playerData.totalWon += winAmount;
                
                // Wyślij wygraną (symulacja)
                if (winAmount > 0 && walletAddress) {
                    await sendWinnings(walletAddress, winAmount);
                }
            }
            
            // Zapisz zaktualizowane dane
            gameDatabase.set(userId, playerData);
            
            console.log(`🎰 Spin ${userId}: bet ${betAmount/1e9} TON, symbols: ${spinResult.symbols.join('')}, won: ${spinResult.won ? winAmount/1e9 + ' TON' : 'NO'}, newBalance: ${newBalance/1e9} TON`);
            
            return res.json({
                success: true,
                symbols: spinResult.symbols,
                won: spinResult.won,
                winAmount: winAmount,
                newBalance: newBalance, // Zwracamy nowe saldo
                multiplier: spinResult.multiplier,
                currentGame: playerData.gamesCount
            });
        }
        
        // POST /api/history
        if (path === '/api/history' && method === 'POST') {
            const { initData, currentBalance } = req.body;
            const user = validateTelegramWebAppData(initData);
            
            if (!user || !user.id) {
                return res.status(401).json({ error: 'Invalid user data' });
            }
            
            const userId = user.id.toString();
            const playerData = getPlayerData(userId, currentBalance, null);
            
            return res.json({
                totalPlayed: playerData.totalPlayed || 0,
                totalWon: playerData.totalWon || 0,
                balance: currentBalance || playerData.balance || 0,
                gamesCount: playerData.gamesCount || 0
            });
        }
        
        // 404 dla innych ścieżek
        return res.status(404).json({ error: 'Not found' });
        
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: 'Server error' });
    }
};