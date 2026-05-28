// 状態管理
let gameState = {
    energy: 0,
    energyPerClick: 1,
    energyPerSecond: 0,
    lastSaveTime: Date.now(),
    achievements: [], // 解除済み実績ID
    goldenClicks: 0
};

// cardsData.js から読み込み
let cards = window.generatedCards || [];

// 実績データ
const achievementsList = [
    { id: 'a1', title: 'はじまりの一歩', desc: '初めてカードを購入する', condition: () => cards.some(c => c.count > 0) },
    { id: 'a2', title: 'クリック名人', desc: 'レアカードをクリックする', condition: () => gameState.goldenClicks > 0 },
    { id: 'a3', title: '1Kの壁', desc: 'エネルギーが1,000を超える', condition: () => gameState.energy >= 1000 },
    { id: 'a4', title: 'ミリオネア', desc: 'エネルギーが1,000,000を超える', condition: () => gameState.energy >= 1000000 },
    { id: 'a5', title: 'カードコレクター', desc: 'カードを合計100枚購入する', condition: () => cards.reduce((a, b) => a + b.count, 0) >= 100 },
    { id: 'a6', title: 'プロの放置民', desc: '毎秒獲得量が10,000を超える', condition: () => gameState.energyPerSecond >= 10000 }
];

// 数値フォーマット関数
const FORMAT_SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'Ud', 'Dd', 'Td', 'Qad', 'Qid', 'Sxd', 'Spd', 'Ocd', 'Nod', 'Vg'];

function formatNumber(num) {
    if (num < 1000) return Math.floor(num).toString();
    let tier = Math.floor(Math.log10(num) / 3);
    if (tier >= FORMAT_SUFFIXES.length) return num.toExponential(2);
    let suffix = FORMAT_SUFFIXES[tier];
    let scale = Math.pow(10, tier * 3);
    let scaled = num / scale;
    return scaled.toFixed(2) + suffix;
}

// DOM要素
const energyCountEl = document.getElementById('energy-count');
const energyPerClickEl = document.getElementById('energy-per-click');
const energyPerSecondEl = document.getElementById('energy-per-second');
const mainCoreEl = document.getElementById('main-core');
const corePlaceholderEl = document.getElementById('core-placeholder');
const coreContainerEl = document.getElementById('core-container');
const cardListEl = document.getElementById('card-list');

// 初期化
function init() {
    loadGame(); // ロード処理

    mainCoreEl.src = 'assets/ノーマルエネルギー.png';
    mainCoreEl.onload = () => {
        mainCoreEl.style.display = 'block';
        corePlaceholderEl.style.display = 'none';
    };

    coreContainerEl.addEventListener('click', handleCoreClick);

    document.getElementById('btn-achievements').addEventListener('click', () => {
        renderAchievements();
        document.getElementById('achievements-modal').style.display = 'flex';
    });

    document.getElementById('btn-achievements-close').addEventListener('click', () => {
        document.getElementById('achievements-modal').style.display = 'none';
    });

    document.getElementById('btn-save').addEventListener('click', () => {
        saveGame();
        showToast('システム', 'ゲームを手動セーブしました', '💾');
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
        if(confirm('本当にデータをリセットしますか？')) {
            localStorage.removeItem('anokoroSave');
            location.reload();
        }
    });

    document.getElementById('btn-modal-close').addEventListener('click', () => {
        document.getElementById('modal-overlay').style.display = 'none';
    });

    renderCards();
    recalculateStats();

    setInterval(gameLoop, 1000);
    setInterval(saveGame, 10000); // オートセーブ
    setInterval(spawnGoldenCard, 10000); // レアカード抽選
    setInterval(checkAchievements, 1000); // 実績判定
    
    updateUI();
}

// セーブ機能
function saveGame() {
    gameState.lastSaveTime = Date.now();
    const saveData = {
        state: gameState,
        cardCounts: cards.map(c => c.count)
    };
    localStorage.setItem('anokoroSave', JSON.stringify(saveData));
}

// ロード機能とオフライン進行
function loadGame() {
    const saved = localStorage.getItem('anokoroSave');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            gameState = { ...gameState, ...parsed.state };
            
            if (parsed.cardCounts) {
                cards.forEach((c, i) => {
                    c.count = parsed.cardCounts[i] || 0;
                });
            }

            // オフライン進行計算
            const now = Date.now();
            const timeDiffSec = Math.floor((now - gameState.lastSaveTime) / 1000);
            
            if (timeDiffSec > 60 && gameState.energyPerSecond > 0) {
                // 最大24時間分まで
                const offlineSec = Math.min(timeDiffSec, 24 * 60 * 60);
                const offlineGain = offlineSec * gameState.energyPerSecond;
                gameState.energy += offlineGain;
                
                document.getElementById('offline-message').innerHTML = 
                    `前回プレイから <b>${Math.floor(offlineSec/60)}分</b> 経過しました。<br>` +
                    `オフライン中の獲得エネルギー:<br> <strong style="color:var(--accent-color); font-size:24px;">+${formatNumber(offlineGain)}</strong>`;
                document.getElementById('modal-overlay').style.display = 'flex';
            }
        } catch (e) {
            console.error('Save data is corrupted');
        }
    }
}

// 実績判定
function checkAchievements() {
    achievementsList.forEach(ach => {
        if (!gameState.achievements.includes(ach.id)) {
            if (ach.condition()) {
                gameState.achievements.push(ach.id);
                showToast('実績解除！', ach.title, '🏆');
                recalculateStats(); // ボーナス適用
            }
        }
    });
}

function showToast(title, message, icon) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-text">
            <h4>${title}</h4>
            <p>${message}</p>
        </div>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        if(toast.parentElement) toast.remove();
    }, 5000);
}

// 実績モーダルの描画
function renderAchievements() {
    const listEl = document.getElementById('achievements-list');
    listEl.innerHTML = '';
    
    // ボーナス表示の更新
    const bonusEl = document.getElementById('achievement-bonus');
    const bonusPercent = gameState.achievements.length * 5;
    bonusEl.textContent = `+${bonusPercent}%`;

    achievementsList.forEach(ach => {
        const isUnlocked = gameState.achievements.includes(ach.id);
        const item = document.createElement('div');
        item.className = `achievement-item ${isUnlocked ? 'unlocked' : 'locked'}`;
        
        item.innerHTML = `
            <div class="ach-icon">${isUnlocked ? '🏆' : '🔒'}</div>
            <div class="ach-info">
                <h4>${ach.title}</h4>
                <p>${isUnlocked ? ach.desc : '条件未達成'}</p>
            </div>
        `;
        listEl.appendChild(item);
    });
}

// ステータス再計算（実績ボーナスと相乗効果）
function recalculateStats() {
    let baseClick = 1;
    let baseIdle = 0;
    
    // 相乗効果の判定マイルストーン
    const milestones = [10, 25, 50, 100, 250, 500, 1000];

    cards.forEach(card => {
        if (card.count === 0) return;
        
        let multiplier = 1;
        // マイルストーンごとに効果が2倍になる
        milestones.forEach(m => {
            if (card.count >= m) multiplier *= 2;
        });
        
        const totalValue = card.value * card.count * multiplier;
        
        if (card.type === 'click') baseClick += totalValue;
        if (card.type === 'idle') baseIdle += totalValue;
    });

    // 実績1つにつきグローバル生産量 +5%
    const globalMultiplier = 1 + (gameState.achievements.length * 0.05);

    gameState.energyPerClick = baseClick * globalMultiplier;
    gameState.energyPerSecond = baseIdle * globalMultiplier;
}

function handleCoreClick(e) {
    gameState.energy += gameState.energyPerClick;
    updateUI();
    createClickEffect(e);
}

function gameLoop() {
    if (gameState.energyPerSecond > 0) {
        gameState.energy += gameState.energyPerSecond;
        updateUI();
    }
}

function updateUI() {
    energyCountEl.textContent = formatNumber(gameState.energy);
    energyPerClickEl.textContent = formatNumber(gameState.energyPerClick);
    energyPerSecondEl.textContent = formatNumber(gameState.energyPerSecond);

    const cardEls = document.querySelectorAll('.card');
    cardEls.forEach(el => {
        const id = el.dataset.id;
        const card = cards.find(c => c.id === id);
        if (card) {
            const cost = calculateCost(card);
            if (gameState.energy >= cost) {
                el.classList.remove('disabled');
            } else {
                el.classList.add('disabled');
            }
        }
    });
    
    const unlockedCount = cardEls.length;
    if (unlockedCount < cards.length) {
        const nextCard = cards[unlockedCount - 1];
        if (nextCard && gameState.energy >= calculateCost(nextCard) * 0.5) {
            renderCards();
        }
    }
}

function calculateCost(card) {
    return card.baseCost * Math.pow(1.15, card.count);
}

function buyCard(cardId) {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    const cost = calculateCost(card);
    if (gameState.energy >= cost) {
        gameState.energy -= cost;
        card.count++;

        // マイルストーン通知
        const milestones = [10, 25, 50, 100, 250, 500, 1000];
        if (milestones.includes(card.count)) {
            showToast('レベルアップ！', `${card.name} の効果が2倍に！`, '✨');
        }

        recalculateStats();
        renderCards();
        updateUI();
    }
}

function renderCards() {
    cardListEl.innerHTML = '';
    
    let lastOwnedIndex = -1;
    for (let i = cards.length - 1; i >= 0; i--) {
        if (cards[i].count > 0) {
            lastOwnedIndex = i;
            break;
        }
    }
    
    const displayCount = Math.min(lastOwnedIndex + 6, cards.length);
    
    for (let i = 0; i < displayCount; i++) {
        const card = cards[i];
        const cost = calculateCost(card);
        const canBuy = gameState.energy >= cost;
        
        const cardEl = document.createElement('div');
        cardEl.className = `card ${canBuy ? '' : 'disabled'}`;
        cardEl.dataset.id = card.id;
        cardEl.addEventListener('click', () => buyCard(card.id));
        
        const isNew = card.count === 0 && canBuy;
        const newTag = isNew ? '<span style="color:red; font-size:12px; font-weight:bold; margin-left:10px;">NEW!</span>' : '';

        // 現在のカードの相乗効果倍率を計算
        let multiplier = 1;
        [10, 25, 50, 100, 250, 500, 1000].forEach(m => {
            if (card.count >= m) multiplier *= 2;
        });

        cardEl.innerHTML = `
            <div class="card-image-container">
                <img src="${card.image}" alt="${card.name}" class="card-img" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNjY2MiLz48L3N2Zz4='">
            </div>
            <div class="card-info">
                <div class="card-name">${card.name} ${newTag} <span style="color:#007bff; font-size:12px;">(x${multiplier})</span></div>
                <div class="card-desc">${card.descPrefix} ${formatNumber(card.value * multiplier)}</div>
                <div class="card-cost">コスト: ${formatNumber(cost)}</div>
            </div>
            <div class="card-count">${card.count}</div>
        `;
        
        cardListEl.appendChild(cardEl);
    }
}

function createClickEffect(e) {
    const container = document.querySelector('.click-area');
    const containerRect = container.getBoundingClientRect();
    const x = e.clientX - containerRect.left;
    const y = e.clientY - containerRect.top;

    const effectEl = document.createElement('div');
    effectEl.className = 'floating-number';
    effectEl.textContent = `+${formatNumber(gameState.energyPerClick)}`;
    effectEl.style.left = `${x - 20}px`;
    effectEl.style.top = `${y - 20}px`;
    
    container.appendChild(effectEl);
    setTimeout(() => effectEl.remove(), 1000);
}

let goldenCardEl = null;
function spawnGoldenCard() {
    if (goldenCardEl) return;
    if (Math.random() > 0.1) return;

    goldenCardEl = document.createElement('div');
    goldenCardEl.className = 'golden-card';
    
    const x = Math.random() * (window.innerWidth - 100);
    const y = Math.random() * (window.innerHeight - 150);
    goldenCardEl.style.left = `${x}px`;
    goldenCardEl.style.top = `${y}px`;
    
    goldenCardEl.addEventListener('click', (e) => {
        gameState.goldenClicks++; // 実績用
        
        const reward = Math.max(gameState.energyPerClick * 100, gameState.energyPerSecond * 60 * 15);
        gameState.energy += reward;
        
        const effectEl = document.createElement('div');
        effectEl.className = 'floating-number reward-text';
        effectEl.textContent = `Lucky! +${formatNumber(reward)}`;
        effectEl.style.left = `${e.clientX}px`;
        effectEl.style.top = `${e.clientY - 50}px`;
        document.body.appendChild(effectEl);
        
        setTimeout(() => effectEl.remove(), 2000);
        goldenCardEl.remove();
        goldenCardEl = null;
        updateUI();
    });

    document.body.appendChild(goldenCardEl);
    setTimeout(() => {
        if (goldenCardEl) {
            goldenCardEl.remove();
            goldenCardEl = null;
        }
    }, 15000);
}

window.addEventListener('DOMContentLoaded', init);
