// 状態管理
let gameState = {
    energy: 0,
    energyPerClick: 1,
    energyPerSecond: 0,
};

// cardsData.js から読み込み
let cards = window.generatedCards || [];

// 数値のフォーマット関数
const FORMAT_SUFFIXES = [
    '', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'Ud', 'Dd', 'Td', 'Qad', 'Qid', 'Sxd', 'Spd', 'Ocd', 'Nod', 'Vg'
];

function formatNumber(num) {
    if (num < 1000) return Math.floor(num).toString();
    
    let tier = Math.floor(Math.log10(num) / 3);
    if (tier >= FORMAT_SUFFIXES.length) {
        return num.toExponential(2); // 限界を超えたら指数表記
    }
    
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

// レアカード（ゴールデンクッキー）用要素
let goldenCardEl = null;

// 初期化
function init() {
    // 画像ロード
    mainCoreEl.src = 'assets/ノーマルエネルギー.png';
    mainCoreEl.onload = () => {
        mainCoreEl.style.display = 'block';
        corePlaceholderEl.style.display = 'none';
    };
    mainCoreEl.onerror = () => {
        corePlaceholderEl.textContent = '画像読み込みエラー';
    };

    // イベントリスナー
    coreContainerEl.addEventListener('click', handleCoreClick);

    // カードUI生成
    renderCards();

    // ゲームループ開始
    setInterval(gameLoop, 1000);
    
    // レアカード出現ループ
    setInterval(spawnGoldenCard, 10000); // 10秒ごとに判定
    
    // UI初期化
    updateUI();
}

// クリック処理
function handleCoreClick(e) {
    gameState.energy += gameState.energyPerClick;
    updateUI();
    
    // エフェクト生成
    createClickEffect(e);
}

// ゲームループ（毎秒処理）
function gameLoop() {
    if (gameState.energyPerSecond > 0) {
        gameState.energy += gameState.energyPerSecond;
        updateUI();
    }
}

// UI更新
function updateUI() {
    energyCountEl.textContent = formatNumber(gameState.energy);
    energyPerClickEl.textContent = formatNumber(gameState.energyPerClick);
    energyPerSecondEl.textContent = formatNumber(gameState.energyPerSecond);

    // カードの購入可能状態を更新
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
    
    // リストの動的更新判定（新しいカードを解放するかどうか）
    // 一番最後に表示されているカードのコストを余裕で超えたら再描画する等の処理
    const unlockedCount = cardEls.length;
    if (unlockedCount < cards.length) {
        const nextCard = cards[unlockedCount - 1]; // 表示中の最後のカード
        if (nextCard && gameState.energy >= calculateCost(nextCard) * 0.5) {
            // 次のカードが見えるくらいまでエネルギーが貯まったら再描画
            renderCards();
        }
    }
}

// コスト計算
function calculateCost(card) {
    return card.baseCost * Math.pow(1.15, card.count);
}

// カードの購入処理
function buyCard(cardId) {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    const cost = calculateCost(card);
    
    if (gameState.energy >= cost) {
        gameState.energy -= cost;
        card.count++;

        if (card.type === 'click') {
            gameState.energyPerClick += card.value;
        } else if (card.type === 'idle') {
            gameState.energyPerSecond += card.value;
        }

        renderCards(); // コスト再計算と再描画
        updateUI();
    }
}

// カードUIの生成と描画（プログレッシブ解放）
function renderCards() {
    cardListEl.innerHTML = '';
    
    // 表示すべきカードを決定（所持済み + 次の5枚）
    let lastOwnedIndex = -1;
    for (let i = cards.length - 1; i >= 0; i--) {
        if (cards[i].count > 0) {
            lastOwnedIndex = i;
            break;
        }
    }
    
    const displayCount = Math.min(lastOwnedIndex + 6, cards.length); // 5枚先まで表示
    
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

        cardEl.innerHTML = `
            <div class="card-image-container">
                <img src="${card.image}" alt="${card.name}" class="card-img" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNjY2MiLz48L3N2Zz4='">
            </div>
            <div class="card-info">
                <div class="card-name">${card.name} ${newTag}</div>
                <div class="card-desc">${card.descPrefix} ${formatNumber(card.value)}</div>
                <div class="card-cost">コスト: ${formatNumber(cost)}</div>
            </div>
            <div class="card-count">${card.count}</div>
        `;
        
        cardListEl.appendChild(cardEl);
    }
}

// クリック時のパーティクルエフェクト
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

    setTimeout(() => {
        effectEl.remove();
    }, 1000);
}

// レアカード（ゴールデンクッキー）の出現処理
function spawnGoldenCard() {
    if (goldenCardEl) return; // 既に存在する場合は無視
    
    // 10%の確率で出現
    if (Math.random() > 0.1) return;

    goldenCardEl = document.createElement('div');
    goldenCardEl.className = 'golden-card';
    
    // 画面のランダムな位置に配置
    const x = Math.random() * (window.innerWidth - 100);
    const y = Math.random() * (window.innerHeight - 150);
    
    goldenCardEl.style.left = `${x}px`;
    goldenCardEl.style.top = `${y}px`;
    
    // クリックイベント
    goldenCardEl.addEventListener('click', (e) => {
        // 報酬: 15分間分の毎秒エネルギー（最低でもクリック100回分）
        const reward = Math.max(gameState.energyPerClick * 100, gameState.energyPerSecond * 60 * 15);
        gameState.energy += reward;
        
        // 報酬エフェクト
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

    // 15秒で消滅
    setTimeout(() => {
        if (goldenCardEl) {
            goldenCardEl.remove();
            goldenCardEl = null;
        }
    }, 15000);
}

// アプリ起動
window.addEventListener('DOMContentLoaded', init);
