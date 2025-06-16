const crypto = require('crypto');

// Symbole i wypłaty
const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '🔔', '💎', '⭐'];
const PAYOUTS = {
    3: 10, // 3 takie same = x10
    2: 2   // 2 takie same = x2
};

// Prosta baza danych w pamięci (dla Vercel)
const gameDatabase = new Map();

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

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { initData, walletAddress, betAmount } = req.body;
        
        // Prosta walidacja użytkownika (dla demo)
        const userId = 'test_user_' + (initData ? crypto.createHash('md5').update(initData).digest('hex').substr(0, 8) : Date.now());
        
        const playerData = gameDatabase.get(userId) || { 
            balance: 1000000000, // 1 TON startowy
            totalPlayed: 0, 
            totalWon: 0,
            walletAddress: walletAddress
        };
        
        if (betAmount > playerData.balance) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }
        
        if (betAmount < 10000000) { // 0.01 TON
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
            
            // Wyślij wygraną (symulacja)
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
};