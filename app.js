class SlotMachine {
    constructor() {
        this.symbols = ['🍒', '🍋', '🍊', '🍇', '🔔', '💎', '⭐'];
        this.balance = 0;
        this.connected = false;
        this.walletAddress = null;
        this.userId = null; // Stały user ID dla sesji
        this.backendUrl = '/api'; // Backend URL
        
        this.initTelegram();
        this.initEventListeners();
        this.updateBalance();
        
        console.log('🎰 TON Slot Machine initialized!');
    }

    initTelegram() {
        // Sprawdź czy działa w Telegram
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.ready();
            window.Telegram.WebApp.expand();
            
            // Ustaw theme z Telegram
            const themeParams = window.Telegram.WebApp.themeParams;
            if (themeParams && themeParams.bg_color) {
                document.body.style.background = themeParams.bg_color;
            }
            
            console.log('📱 Telegram WebApp detected');
            console.log('Init data:', window.Telegram.WebApp.initData);
            
            // Użyj prawdziwego Telegram ID jeśli dostępne
            if (window.Telegram.WebApp.initDataUnsafe?.user?.id) {
                this.userId = 'tg_user_' + window.Telegram.WebApp.initDataUnsafe.user.id;
                console.log('🆔 Using Telegram User ID:', this.userId);
            }
        } else {
            console.log('🌐 Running in browser (not Telegram)');
        }
    }

    initEventListeners() {
        // Spin button
        document.getElementById('spinButton').addEventListener('click', () => this.spin());
        
        // Connect/Disconnect wallet (demo)
        document.getElementById('connectWallet').addEventListener('click', () => this.connectWallet());
        document.getElementById('disconnectWallet').addEventListener('click', () => this.disconnectWallet());
        
        // Stats toggle
        document.getElementById('showStats').addEventListener('click', () => this.toggleStats());
        
        // Bet amount validation
        document.getElementById('betAmount').addEventListener('change', (e) => {
            const value = parseFloat(e.target.value);
            if (value < 0.01) e.target.value = 0.01;
            if (value > 10) e.target.value = 10;
        });
    }

    connectWallet() {
        // Demo połączenia portfela (później prawdziwy TON Connect)
        this.connected = true;
        this.walletAddress = 'EQDemo_' + Math.random().toString(36).substr(2, 8);
        
        // Ustaw stały user ID dla tej sesji (jeśli nie ma z Telegram)
        if (!this.userId) {
            this.userId = 'demo_user_' + Date.now();
            console.log('🆔 Generated demo User ID:', this.userId);
        }
        
        document.getElementById('connectWallet').style.display = 'none';
        document.getElementById('walletInfo').style.display = 'block';
        document.getElementById('walletAddress').textContent = 
            this.walletAddress.slice(0, 6) + '...' + this.walletAddress.slice(-4);
        
        document.getElementById('spinButton').disabled = false;
        
        this.updateBalance();
        console.log('🔗 Demo wallet connected:', this.walletAddress);
    }

    disconnectWallet() {
        this.connected = false;
        this.walletAddress = null;
        
        document.getElementById('connectWallet').style.display = 'block';
        document.getElementById('walletInfo').style.display = 'none';
        document.getElementById('spinButton').disabled = true;
        
        console.log('❌ Wallet disconnected');
    }

    async updateBalance() {
        try {
            const response = await fetch(`${this.backendUrl}/balance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    initData: this.userId || 'guest_user', // Użyj stałego ID
                    walletAddress: this.walletAddress
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            this.balance = data.balance || 0;
            document.getElementById('balance').textContent = 
                `${(this.balance / 1e9).toFixed(2)} TON`;
            
            console.log(`💰 Balance updated: ${(this.balance / 1e9).toFixed(2)} TON`);
        } catch (error) {
            console.error('❌ Error updating balance:', error);
            document.getElementById('balance').textContent = 'Error';
        }
    }

    async spin() {
        const betAmount = parseFloat(document.getElementById('betAmount').value);
        const betNanotons = Math.floor(betAmount * 1e9);
        
        // Walidacja
        if (betNanotons > this.balance) {
            alert('💸 Niewystarczające środki!\nMasz: ' + (this.balance / 1e9).toFixed(2) + ' TON');
            return;
        }
        
        if (betNanotons < 10000000) { // 0.01 TON
            alert('💰 Minimalna stawka to 0.01 TON');
            return;
        }
        
        // Zablokuj przycisk i wyczyść wyniki
        document.getElementById('spinButton').disabled = true;
        document.getElementById('resultMessage').textContent = '';
        document.getElementById('winAmount').textContent = '';
        
        // Pokaż loading
        this.showLoading(true);
        
        // Animacja spinowania
        this.animateReels();
        
        try {
            const response = await fetch(`${this.backendUrl}/spin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    initData: this.userId || 'guest_user', // Użyj stałego ID
                    walletAddress: this.walletAddress,
                    betAmount: betNanotons
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                // Czekaj na zakończenie animacji przed pokazaniem wyniku
                setTimeout(() => {
                    this.showResult(result);
                    this.showLoading(false);
                }, 1500);
            } else {
                throw new Error(result.error || 'Błąd gry');
            }
        } catch (error) {
            console.error('🎰 Spin error:', error);
            this.showLoading(false);
            alert('❌ Błąd podczas gry: ' + error.message);
            document.getElementById('spinButton').disabled = false;
        }
    }

    animateReels() {
        const reels = document.querySelectorAll('.reel');
        
        reels.forEach((reel, index) => {
            // Usuń poprzednie klasy
            reel.classList.remove('spinning', 'winning');
            
            // Dodaj animację z opóźnieniem
            setTimeout(() => {
                reel.classList.add('spinning');
                
                // Zmień symbole podczas animacji (efekt "kręcenia")
                const symbol = reel.querySelector('.symbol');
                const changeSymbol = () => {
                    symbol.textContent = this.symbols[Math.floor(Math.random() * this.symbols.length)];
                };
                
                // Zmieniaj symbole co 100ms
                const interval = setInterval(changeSymbol, 100);
                
                // Zatrzymaj zmiany po animacji
                setTimeout(() => {
                    clearInterval(interval);
                    reel.classList.remove('spinning');
                }, 1000 + index * 200);
                
            }, index * 100);
        });
    }

    showResult(result) {
        console.log('🎰 Spin result:', result);
        
        // Ustaw finalne symbole
        const reels = document.querySelectorAll('.reel .symbol');
        result.symbols.forEach((symbol, index) => {
            reels[index].textContent = symbol;
        });

        // Pokaż wynik
        if (result.won) {
            document.getElementById('resultMessage').textContent = '🎉 WYGRANA!';
            document.getElementById('winAmount').textContent = 
                `+${(result.winAmount / 1e9).toFixed(2)} TON (x${result.multiplier})`;
            
            // Animacja wygranej
            document.querySelectorAll('.reel').forEach(reel => {
                reel.classList.add('winning');
                setTimeout(() => reel.classList.remove('winning'), 2000);
            });
            
            // Efekt dźwiękowy (jeśli w Telegram)
            if (window.Telegram?.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
            }
            
        } else {
            document.getElementById('resultMessage').textContent = '😔 Spróbuj ponownie';
            document.getElementById('winAmount').textContent = '';
            
            // Wibracja porażki
            if (window.Telegram?.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
            }
        }

        // WAŻNE: Aktualizuj saldo bezpośrednio z wyniku spin
        this.balance = result.newBalance;
        document.getElementById('balance').textContent = 
            `${(this.balance / 1e9).toFixed(2)} TON`;
        
        console.log(`💰 Saldo zaktualizowane do: ${(this.balance / 1e9).toFixed(2)} TON`);
        
        // Odblokuj przycisk
        setTimeout(() => {
            document.getElementById('spinButton').disabled = false;
        }, 1000);
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        overlay.style.display = show ? 'flex' : 'none';
    }

    async toggleStats() {
        const statsInfo = document.getElementById('statsInfo');
        
        if (statsInfo.style.display === 'none') {
            // Pobierz statystyki
            try {
                const response = await fetch(`${this.backendUrl}/history`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        initData: this.userId || 'guest_user' // Użyj stałego ID
                    })
                });
                
                if (response.ok) {
                    const stats = await response.json();
                    document.getElementById('totalPlayed').textContent = 
                        `${(stats.totalPlayed / 1e9).toFixed(2)} TON`;
                    document.getElementById('totalWon').textContent = 
                        `${(stats.totalWon / 1e9).toFixed(2)} TON`;
                    document.getElementById('gamesCount').textContent = stats.gamesCount || 0;
                    
                    statsInfo.style.display = 'block';
                    document.getElementById('showStats').textContent = '📊 Ukryj';
                }
            } catch (error) {
                console.error('Stats error:', error);
            }
        } else {
            statsInfo.style.display = 'none';
            document.getElementById('showStats').textContent = '📊 Statystyki';
        }
    }

    // Test funkcja dla debugowania
    async testBackend() {
        try {
            const response = await fetch(`${this.backendUrl}/test`);
            const data = await response.json();
            console.log('🧪 Backend test:', data);
            return data;
        } catch (error) {
            console.error('🧪 Backend test failed:', error);
            return null;
        }
    }
}

// Inicjalizacja po załadowaniu strony
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded, initializing Slot Machine...');
    
    // Stwórz instancję gry
    window.slotMachine = new SlotMachine();
    
    // Test połączenia z backendem
    window.slotMachine.testBackend().then(result => {
        if (result) {
            console.log('✅ Backend connection successful');
        } else {
            console.log('❌ Backend connection failed');
            alert('⚠️ Nie można połączyć z serwerem gry.\nSprawdź połączenie internetowe.');
        }
    });
});

// Funkcje debugowania (dostępne w konsoli przeglądarki)
window.debugSlot = {
    getBalance: () => window.slotMachine?.balance,
    testSpin: () => window.slotMachine?.spin(),
    connectWallet: () => window.slotMachine?.connectWallet(),
    testBackend: () => window.slotMachine?.testBackend(),
    getUserId: () => window.slotMachine?.userId
};