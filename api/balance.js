const crypto = require('crypto');

const gameDatabase = new Map();

module.exports = (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { initData, walletAddress } = req.body;
  const userId = 'test_user_' + Date.now();
  
  const playerData = gameDatabase.get(userId) || { 
    balance: 1000000000, // 1 TON startowy
    totalPlayed: 0, 
    totalWon: 0,
    walletAddress: walletAddress
  };

  console.log(`👤 Użytkownik ${userId} - saldo: ${playerData.balance / 1e9} TON`);
  res.json({ balance: playerData.balance });
};