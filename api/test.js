module.exports = (req, res) => {
  res.json({ 
    message: 'TON Slot Machine Backend działa!', 
    timestamp: new Date().toISOString(),
    players: 0
  });
};