const gameDatabase = new Map();

module.exports = (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = 'test_user_demo';
  const playerData = gameDatabase.get(userId) || { 
    balance: 1000000000,
    totalPlayed: 0, 
    totalWon: 0 
  };
  
  res.json({
    totalPlayed: playerData.totalPlayed,
    totalWon: playerData.totalWon,
    balance: playerData.balance,
    gamesCount: Math.floor(playerData.totalPlayed / 100000000)
  });
};