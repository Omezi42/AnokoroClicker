// 状態管理
let gameState = {
    energy: 0,
    energyPerClick: 1,
    energyPerSecond: 0,
    lastSaveTime: Date.now(),
    achievements: [],
    goldenClicks: 0,
    deck: [null, null, null, null, null],
    presets: {
        preset1: [null, null, null, null, null],
        preset2: [null, null, null, null, null]
    },
    selectedEnergySkin: null,
    allTimeEnergy: 0,
    unlockedFeatures: {
        deck: false,
        awakening: false,
        prestige: false,
        artifact: false,
        advancedTree: false
    },
    awakenedCards: [],
    awakenedCardTypes: {}, // cardId: 'click' or 'idle' (flipped type)
    memoryPoints: 0,
    skillTree: {
        node_alpha: { level: 0 },
        node_beta: { level: 0 },
        node_gamma: { level: 0 },
        node_delta: { level: 0 },
        node_epsilon: { level: 0 },
        node_inf_click: { level: 0 },
        node_inf_idle: { level: 0 },
        node_artifact_forge: { level: 0 },
        node_synergy_overdrive: { level: 0 },
        node_memory_resonance: { level: 0 }
    }
};

// スキルツリー（System Nodes）定義
const systemNodes = {
    node_alpha: { id: 'node_alpha', name: 'SYS.CORE_EXPANSION', desc: 'Global Production +100%', maxLevel: 100, cost: (lv) => 1 + lv },
    node_beta: { id: 'node_beta', name: 'SYS.COST_COMPRESSION', desc: 'Purchase Scaling Ratio -0.01', maxLevel: 10, cost: (lv) => 3 + lv * 2 },
    node_gamma: { id: 'node_gamma', name: 'SYS.PROBABILITY_OVERRIDE', desc: 'Rare Anomaly Spawn Rate +5%', maxLevel: 5, cost: (lv) => 5 + lv * 5 },
    node_delta: { id: 'node_delta', name: 'SYS.REWARD_AMPLIFIER', desc: 'Rare Anomaly Yield +50%', maxLevel: 10, cost: (lv) => 2 + lv * 3 },
    node_epsilon: { id: 'node_epsilon', name: 'SYS.AWAKEN_OPTIMIZATION', desc: 'Awakening Energy Requirement / 10', maxLevel: 5, cost: (lv) => 10 + lv * 10 },
    // 無限アップグレードノード (1e45以降)
    node_inf_click: { id: 'node_inf_click', name: 'SYS.INFINITY_CLICK', desc: 'Click Base Production +5% (Infinite)', maxLevel: Infinity, cost: (lv) => Math.floor(1e5 * Math.pow(1.5, lv)) },
    node_inf_idle: { id: 'node_inf_idle', name: 'SYS.INFINITY_IDLE', desc: 'Idle Base Production +5% (Infinite)', maxLevel: Infinity, cost: (lv) => Math.floor(1e5 * Math.pow(1.5, lv)) },
    // 上位ルートノード
    node_artifact_forge: { id: 'node_artifact_forge', name: 'SYS.ARTIFACT_FORGE', desc: 'Unlock 6th Artifact slot (AF)', maxLevel: 1, cost: (lv) => 1e6 },
    node_synergy_overdrive: { id: 'node_synergy_overdrive', name: 'SYS.SYNERGY_OVERDRIVE', desc: 'Deck Synergy limit +50%', maxLevel: 5, cost: (lv) => 1e8 * Math.pow(10, lv) },
    node_memory_resonance: { id: 'node_memory_resonance', name: 'SYS.MEMORY_RESONANCE', desc: 'Global production +1% per owned memory point', maxLevel: 10, cost: (lv) => 1e10 * Math.pow(10, lv) }
};

let buyMode = '1';
let selectingDeckSlot = -1;

// デッキ詳細モーダル用データ
let lastGlobalSynergyMultiplier = 1.0;
let lastIndividualBonus = {};
let lastAchievementMultiplier = 1.0;
let lastMemoryMultiplier = 1.0;
let lastAlphaBonus = 1.0;
let lastActiveGlobalSkills = [];
let lastDeckDetails = [];
let cards = window.generatedCards || [];

const achievementsList = [
    { id: 'a1', title: 'はじまりの一歩', desc: '初めてカードを購入する', condition: () => cards.some(c => c.count > 0) },
    { id: 'a5', title: 'カードコレクター', desc: 'カードを累計100枚購入する', condition: () => cards.reduce((a, b) => a + b.count, 0) >= 100 },
    { id: 'a5_2', title: 'カードマニア', desc: 'カードを累計500枚購入する', condition: () => cards.reduce((a, b) => a + b.count, 0) >= 500 },
    { id: 'a5_3', title: 'カードマスター', desc: 'カードを累計1000枚購入する', condition: () => cards.reduce((a, b) => a + b.count, 0) >= 1000 },
    { id: 'a5_4', title: 'カードの神', desc: 'カードを累計5000枚購入する', condition: () => cards.reduce((a, b) => a + b.count, 0) >= 5000 },
    { id: 'a5_5', title: 'コレクターの極致', desc: 'カードを累計10000枚購入する', condition: () => cards.reduce((a, b) => a + b.count, 0) >= 10000 },
    { id: 'a2', title: 'クリック名人', desc: 'レアカードをクリックする', condition: () => gameState.goldenClicks >= 1 },
    { id: 'a2_2', title: '幸運の持ち主', desc: 'レアカードを10回クリックする', condition: () => gameState.goldenClicks >= 10 },
    { id: 'a2_3', title: 'レアハンター', desc: 'レアカードを50回クリックする', condition: () => gameState.goldenClicks >= 50 },
    { id: 'a2_4', title: '奇跡の指先', desc: 'レアカードを100回クリックする', condition: () => gameState.goldenClicks >= 100 },
    { id: 'a3', title: '1Kの壁', desc: 'エネルギーが 1K を超える', condition: () => gameState.allTimeEnergy >= 1000 },
    { id: 'a4', title: 'ミリオネア', desc: 'エネルギーが 1M を超える', condition: () => gameState.allTimeEnergy >= 1e6 },
    { id: 'e_1b', title: 'ビリオネア', desc: 'エネルギーが 1B を超える', condition: () => gameState.allTimeEnergy >= 1e9 },
    { id: 'e_1t', title: 'トリリオネア', desc: 'エネルギーが 1T を超える', condition: () => gameState.allTimeEnergy >= 1e12 },
    { id: 'e_1qa', title: 'クアッドリリオネア', desc: 'エネルギーが 1Qa を超える', condition: () => gameState.allTimeEnergy >= 1e15 },
    { id: 'e_1qi', title: 'クインティリオン', desc: 'エネルギーが 1Qi を超える', condition: () => gameState.allTimeEnergy >= 1e18 },
    { id: 'e_1sx', title: 'セクスティリオン', desc: 'エネルギーが 1Sx を超える', condition: () => gameState.allTimeEnergy >= 1e21 },
    { id: 'e_1sp', title: 'セプティリオン', desc: 'エネルギーが 1Sp を超える', condition: () => gameState.allTimeEnergy >= 1e24 },
    { id: 'e_1oc', title: 'オクティリオン', desc: 'エネルギーが 1Oc を超える', condition: () => gameState.allTimeEnergy >= 1e27 },
    { id: 'e_1no', title: 'ノニリオン', desc: 'エネルギーが 1No を超える', condition: () => gameState.allTimeEnergy >= 1e30 },
    { id: 'e_1dc', title: 'デシリオン', desc: 'エネルギーが 1Dc を超える', condition: () => gameState.allTimeEnergy >= 1e33 },
    { id: 'c_1', title: '放置の目覚め', desc: '毎秒獲得量が 100 を超える', condition: () => gameState.energyPerSecond >= 100 },
    { id: 'a6', title: 'プロの放置民', desc: '毎秒獲得量が 10K を超える', condition: () => gameState.energyPerSecond >= 10000 },
    { id: 'c_3', title: '不労所得', desc: '毎秒獲得量が 1M を超える', condition: () => gameState.energyPerSecond >= 1e6 },
    { id: 'c_4', title: 'エネルギー工場', desc: '毎秒獲得量が 1B を超える', condition: () => gameState.energyPerSecond >= 1e9 },
    { id: 'c_5', title: '無限の泉', desc: '毎秒獲得量が 1T を超える', condition: () => gameState.energyPerSecond >= 1e12 },
    { id: 'c_6', title: '星の創造者', desc: '毎秒獲得量が 1Qa を超える', condition: () => gameState.energyPerSecond >= 1e15 },
    { id: 'c_7', title: '銀河の支配者', desc: '毎秒獲得量が 1Qi を超える', condition: () => gameState.energyPerSecond >= 1e18 },
    { id: 'c_8', title: '神の領域', desc: '毎秒獲得量が 1Sx を超える', condition: () => gameState.energyPerSecond >= 1e21 }
];

const FORMAT_SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'Ud', 'Dd', 'Td', 'Qad', 'Qid', 'Sxd', 'Spd', 'Ocd', 'Nod', 'Vg', 'Uvg', 'Dvg', 'Tvg', 'Qavg', 'Qivg', 'Sxvg', 'Spvg', 'Ocvg', 'Novg', 'Tg', 'Utg', 'Dtg', 'Ttg', 'Qatg', 'Qitg', 'Sxtg', 'Sptg', 'Octg', 'Notg', 'Qag'];
function formatNumber(num) {
    if (num < 1000) return Math.floor(num).toString();
    let tier = Math.floor(Math.log10(num) / 3);
    if (tier >= FORMAT_SUFFIXES.length) return num.toExponential(2);
    let suffix = FORMAT_SUFFIXES[tier];
    let scale = Math.pow(10, tier * 3);
    return (num / scale).toFixed(2) + suffix;
}

const energyCountEl = document.getElementById('energy-count');
const energyPerClickEl = document.getElementById('energy-per-click');
const energyPerSecondEl = document.getElementById('energy-per-second');
const mainCoreEl = document.getElementById('main-core');
const corePlaceholderEl = document.getElementById('core-placeholder');
const coreContainerEl = document.getElementById('core-container');
const cardListEl = document.getElementById('card-list');

function init() {
    loadGame();

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

    // 転生関連ボタン
    document.getElementById('btn-prestige-open').addEventListener('click', () => {
        document.getElementById('current-memories').textContent = gameState.memoryPoints;
        let newMemories = Math.floor(Math.pow(Math.max(0, Math.log10(gameState.allTimeEnergy / 1e21)), 2));
        let gained = newMemories - gameState.memoryPoints;
        if (gained < 0) gained = 0;
        document.getElementById('pending-memories').textContent = `+${gained}`;
        document.getElementById('prestige-modal').style.display = 'flex';
    });
    document.getElementById('btn-cancel-prestige').addEventListener('click', () => {
        document.getElementById('prestige-modal').style.display = 'none';
    });
    document.getElementById('btn-do-prestige').addEventListener('click', doPrestige);

    // スキルツリー関連
    document.getElementById('btn-skilltree-open').addEventListener('click', () => {
        renderSkillTree();
        document.getElementById('skilltree-modal').style.display = 'flex';
    });
    document.getElementById('btn-skilltree-close').addEventListener('click', () => {
        document.getElementById('skilltree-modal').style.display = 'none';
    });

    document.querySelectorAll('.buy-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.buy-toggle').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            buyMode = e.target.dataset.amount;
            updateUI();
        });
    });

    document.querySelectorAll('.deck-slot').forEach(slot => {
        slot.addEventListener('click', (e) => {
            selectingDeckSlot = parseInt(e.currentTarget.dataset.index);
            openDeckSelectionModal();
        });
    });

    // Tab Listeners
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            
            e.target.classList.add('active');
            const targetId = e.target.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // Help Tab Listeners
    document.querySelectorAll('.help-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.help-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.help-tab-pane').forEach(p => {
                p.classList.remove('active');
                p.style.display = 'none';
            });
            
            e.target.classList.add('active');
            const targetId = e.target.getAttribute('data-target');
            const targetPane = document.getElementById(targetId);
            targetPane.classList.add('active');
            targetPane.style.display = 'flex';
        });
    });


    document.getElementById('btn-deck-close').addEventListener('click', () => {
        document.getElementById('deck-modal').style.display = 'none';
    });
    
    document.getElementById('btn-unequip').addEventListener('click', () => {
        if (selectingDeckSlot >= 0) {
            gameState.deck[selectingDeckSlot] = null;
            recalculateStats();
            renderDeck();
            document.getElementById('deck-modal').style.display = 'none';
        }
    });

    // デッキプリセット保存・読込処理のリスナー
    const savePreset = (num) => {
        gameState.presets[`preset${num}`] = [...gameState.deck];
        saveGame();
        showToast('デッキ', `プリセット${num}に現在のデッキを保存しました`, '💾');
    };

    const loadPreset = (num) => {
        const preset = gameState.presets[`preset${num}`];
        if (preset) {
            // 現在のデッキ長に合わせる（アーティファクト枠対応）
            const maxSlots = (gameState.unlockedFeatures.artifact || getSkillLevel('node_artifact_forge') > 0) ? 6 : 5;
            gameState.deck = [];
            for (let i = 0; i < maxSlots; i++) {
                gameState.deck.push(preset[i] !== undefined ? preset[i] : null);
            }
            recalculateStats();
            renderDeck();
            showToast('デッキ', `プリセット${num}を読み込みました`, '📂');
        } else {
            showToast('エラー', '保存されたプリセットがありません', '⚠');
        }
    };

    document.getElementById('btn-preset-save-1').addEventListener('click', () => savePreset(1));
    document.getElementById('btn-preset-load-1').addEventListener('click', () => loadPreset(1));
    document.getElementById('btn-preset-save-2').addEventListener('click', () => savePreset(2));
    document.getElementById('btn-preset-load-2').addEventListener('click', () => loadPreset(2));

    // 遊び方・ヘルプモーダル
    document.getElementById('btn-help-open').addEventListener('click', () => {
        document.getElementById('help-modal').style.display = 'flex';
    });
    document.getElementById('btn-help-close').addEventListener('click', () => {
        document.getElementById('help-modal').style.display = 'none';
    });

    // ボーナス詳細モーダル
    const btnSynergyOpen = document.getElementById('btn-synergy-open');
    if (btnSynergyOpen) {
        btnSynergyOpen.addEventListener('click', () => {
            renderSynergyDetails();
            document.getElementById('synergy-modal').style.display = 'flex';
        });
    }
    document.getElementById('btn-synergy-close').addEventListener('click', () => {
        document.getElementById('synergy-modal').style.display = 'none';
    });

    renderDeck();
    renderCards();
    recalculateStats();
    updateUnlockUI();

    setInterval(gameLoop, 1000);
    setInterval(saveGame, 10000);
    setInterval(spawnGoldenCard, 10000);
    setInterval(checkAchievements, 1000);
    setInterval(checkUnlocks, 1000);
    
    updateUI();
}

function saveGame() {
    gameState.lastSaveTime = Date.now();
    const saveData = {
        state: gameState,
        cardCounts: cards.map(c => c.count)
    };
    localStorage.setItem('anokoroSave', JSON.stringify(saveData));
}

function loadGame() {
    const saved = localStorage.getItem('anokoroSave');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            gameState = { ...gameState, ...parsed.state };
            
            if (!gameState.deck) gameState.deck = [null, null, null, null, null];
            if (!gameState.presets) {
                gameState.presets = {
                    preset1: [null, null, null, null, null],
                    preset2: [null, null, null, null, null]
                };
            }
            if (gameState.allTimeEnergy === undefined) gameState.allTimeEnergy = gameState.energy;
            if (!gameState.unlockedFeatures) {
                gameState.unlockedFeatures = { deck: false, awakening: false, prestige: false, artifact: false, advancedTree: false };
            } else {
                if (gameState.unlockedFeatures.artifact === undefined) gameState.unlockedFeatures.artifact = false;
                if (gameState.unlockedFeatures.advancedTree === undefined) gameState.unlockedFeatures.advancedTree = false;
            }
            if (!gameState.awakenedCards) gameState.awakenedCards = [];
            if (!gameState.awakenedCardTypes) gameState.awakenedCardTypes = {};
            if (gameState.memoryPoints === undefined) gameState.memoryPoints = 0;
            const correctMaxMemories = Math.floor(Math.pow(Math.max(0, Math.log10(gameState.allTimeEnergy / 1e21)), 2));
            if (gameState.memoryPoints > correctMaxMemories) {
                gameState.memoryPoints = correctMaxMemories;
            }
            
            const defaultSkillTree = {
                node_alpha: { level: 0 },
                node_beta: { level: 0 },
                node_gamma: { level: 0 },
                node_delta: { level: 0 },
                node_epsilon: { level: 0 },
                node_inf_click: { level: 0 },
                node_inf_idle: { level: 0 },
                node_artifact_forge: { level: 0 },
                node_synergy_overdrive: { level: 0 },
                node_memory_resonance: { level: 0 }
            };
            if (!gameState.skillTree) {
                gameState.skillTree = defaultSkillTree;
            } else {
                gameState.skillTree = { ...defaultSkillTree, ...gameState.skillTree };
            }
            
            if (parsed.cardCounts) {
                cards.forEach((c, i) => {
                    c.count = parsed.cardCounts[i] || 0;
                });
            }

            const now = Date.now();
            const timeDiffSec = Math.floor((now - gameState.lastSaveTime) / 1000);
            
            if (timeDiffSec > 60 && gameState.energyPerSecond > 0) {
                const offlineSec = Math.min(timeDiffSec, 24 * 60 * 60);
                const offlineGain = offlineSec * gameState.energyPerSecond;
                gameState.energy += offlineGain;
                gameState.allTimeEnergy += offlineGain;
                
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

function getSkillLevel(nodeId) {
    return gameState.skillTree[nodeId] ? gameState.skillTree[nodeId].level : 0;
}

// 段階的アンロックの確認
function checkUnlocks() {
    let changed = false;
    if (!gameState.unlockedFeatures.deck && gameState.allTimeEnergy >= 1e12) {
        gameState.unlockedFeatures.deck = true;
        showToast('System Override', 'DECK_CONFIGURATION_UNLOCKED', '🃏');
        changed = true;
    }
    if (!gameState.unlockedFeatures.awakening && gameState.allTimeEnergy >= 1e15) {
        gameState.unlockedFeatures.awakening = true;
        showToast('System Override', 'CARD_AWAKENING_PROTOCOL_UNLOCKED', '🌟');
        changed = true;
    }
    if (!gameState.unlockedFeatures.prestige && gameState.allTimeEnergy >= 1e21) {
        gameState.unlockedFeatures.prestige = true;
        showToast('System Override', 'PRESTIGE_REBIRTH_UNLOCKED', '🔄');
        changed = true;
    }
    if (changed) {
        updateUnlockUI();
        renderCards();
    }
}

function updateUnlockUI() {
    document.getElementById('tab-btn-deck').style.display = gameState.unlockedFeatures.deck ? 'block' : 'none';
    document.getElementById('btn-prestige-open').style.display = gameState.unlockedFeatures.prestige ? 'block' : 'none';
    document.getElementById('btn-skilltree-open').style.display = gameState.unlockedFeatures.prestige ? 'block' : 'none';
}

// 転生処理
function doPrestige() {
    let newMemories = Math.floor(Math.pow(Math.max(0, Math.log10(gameState.allTimeEnergy / 1e21)), 2));
    let gained = newMemories - gameState.memoryPoints;
    if (gained < 0) gained = 0;
    
    gameState.energy = 0;
    gameState.energyPerClick = 1;
    gameState.energyPerSecond = 0;
    gameState.goldenClicks = 0;
    gameState.deck = [null, null, null, null, null];
    gameState.awakenedCards = [];
    gameState.memoryPoints += gained;
    
    cards.forEach(c => c.count = 0);
    
    document.getElementById('prestige-modal').style.display = 'none';
    recalculateStats();
    renderCards();
    renderDeck();
    updateUI();
    updateUnlockUI();
    saveGame();
    showToast('REBIRTH SUCCESS', 'System parameters reset. Memories retained.', '✨');
}

function renderSkillTree() {
    document.getElementById('available-memory').textContent = formatNumber(gameState.memoryPoints);
    const container = document.getElementById('skill-nodes-container');
    container.innerHTML = '';

    for (const [id, node] of Object.entries(systemNodes)) {
        // ペーシング制御：上位ツリーがアンロックされていない場合は上位ノードを表示しない
        const isAdvancedNode = ['node_inf_click', 'node_inf_idle', 'node_artifact_forge', 'node_synergy_overdrive', 'node_memory_resonance'].includes(id);
        if (isAdvancedNode && !gameState.unlockedFeatures.advancedTree) {
            continue;
        }

        const lv = getSkillLevel(id);
        const cost = node.cost(lv);
        const canBuy = gameState.memoryPoints >= cost && lv < node.maxLevel;
        
        const el = document.createElement('div');
        el.style.border = isAdvancedNode ? '1px solid #e040fb' : '1px solid #444';
        el.style.padding = '10px';
        el.style.background = isAdvancedNode ? '#1e002a' : '#222';
        el.style.fontFamily = 'monospace';
        
        const displayMax = node.maxLevel === Infinity ? '∞' : node.maxLevel;

        el.innerHTML = `
            <div style="color: ${isAdvancedNode ? '#e040fb' : '#00ffcc'}; font-size: 14px; font-weight: bold; margin-bottom: 5px;">${node.name}</div>
            <div style="color: #aaa; font-size: 11px; margin-bottom: 10px;">${node.desc}</div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #ffca28; font-size: 12px;">Lv. ${lv} / ${displayMax}</span>
                <button class="btn" style="background: ${canBuy ? (isAdvancedNode ? '#e040fb' : '#00ffcc') : '#444'}; color: ${canBuy ? '#000' : '#888'}; padding: 5px 10px; font-size: 10px;" ${canBuy ? '' : 'disabled'}>
                    ${lv >= node.maxLevel ? 'MAX' : `UPGRADE [${formatNumber(cost)} MEM]` }
                </button>
            </div>
        `;
        
        if (canBuy) {
            el.querySelector('button').addEventListener('click', () => {
                gameState.memoryPoints -= cost;
                gameState.skillTree[id].level++;
                recalculateStats();
                renderSkillTree();
                updateUI();
            });
        }
        
        container.appendChild(el);
    }
}

function openDeckSelectionModal() {
    const listEl = document.getElementById('deck-selection-list');
    listEl.innerHTML = '';
    const ownedCards = cards.filter(c => c.count > 0);
    
    if (ownedCards.length === 0) {
        listEl.innerHTML = '<p>装備可能なカードがありません。</p>';
    } else {
        ownedCards.forEach(card => {
            const isEquipped = gameState.deck.includes(card.id);
            const el = document.createElement('div');
            el.className = 'selectable-card';
            if (isEquipped) {
                el.style.opacity = '0.5';
                el.style.cursor = 'not-allowed';
            }
            
            el.innerHTML = `
                <img src="${card.image}" onerror="this.src='data:image/svg+xml;base64,...'">
                <div class="selectable-card-name">${card.name} (Lv.${card.count})</div>
                <div class="selectable-card-skill">${card.skill ? card.skill.name : ''}</div>
                ${isEquipped ? '<div style="font-size:10px; color:red;">装備中</div>' : ''}
            `;
            
            if (!isEquipped) {
                el.addEventListener('click', () => {
                    // 6番目のスロット（インデックス5）はアーティファクト専用
                    if (selectingDeckSlot === 5 && !card.name.includes('エネルギー')) {
                        showToast('エラー', 'アーティファクト枠には「エネルギー」カードのみ装備可能です', '⚠️');
                        return;
                    }
                    gameState.deck[selectingDeckSlot] = card.id;
                    document.getElementById('deck-modal').style.display = 'none';
                    recalculateStats();
                    renderDeck();
                });
            }
            listEl.appendChild(el);
        });
    }
    document.getElementById('deck-modal').style.display = 'flex';
}

function renderDeck() {
    const slots = document.querySelectorAll('.deck-slot');
    slots.forEach((slot, index) => {
        const cardId = gameState.deck[index];
        slot.innerHTML = '';
        
        // アーティファクトスロットの表示制御
        if (index === 5) {
            const isUnlocked = gameState.unlockedFeatures.artifact || getSkillLevel('node_artifact_forge') > 0;
            slot.style.display = isUnlocked ? 'flex' : 'none';
            if (!isUnlocked) return;
        }

        if (cardId) {
            const card = cards.find(c => c.id === cardId);
            if (card) {
                slot.style.position = 'relative';
                slot.innerHTML = `
                    <img src="${card.image}" title="${card.name}\n${card.skill.name}: ${card.skill.desc}" style="width:100%; height:100%; object-fit:cover; border-radius:5px;">
                    <div style="position: absolute; bottom: -5px; right: -5px; background: rgba(0,0,0,0.8); color: white; font-size: 10px; padding: 2px 5px; border-radius: 10px; font-weight: bold; pointer-events: none; border: 1px solid #444;">Lv.${card.count}</div>
                `;
            }
        } else {
            slot.innerHTML = `<span style="color:#aaa;">空き</span>`;
        }
    });
}

function getPurchaseScalingRatio() {
    const betaLv = getSkillLevel('node_beta');
    return Math.max(1.05, 1.15 - (betaLv * 0.01));
}

function calculateCumulativeCost(card, amount) {
    const r = getPurchaseScalingRatio();
    if (amount === 1) return card.baseCost * Math.pow(r, card.count);
    const currentCost = card.baseCost * Math.pow(r, card.count);
    return currentCost * (Math.pow(r, amount) - 1) / (r - 1);
}

function calculateMaxPurchase(card, currentEnergy) {
    let amount = 0;
    let totalCost = 0;
    const r = getPurchaseScalingRatio();
    let nextCost = card.baseCost * Math.pow(r, card.count);
    
    while (currentEnergy >= totalCost + nextCost && amount < 1000) {
        totalCost += nextCost;
        amount++;
        nextCost = card.baseCost * Math.pow(r, card.count + amount);
    }
    
    return { amount: Math.max(1, amount), cost: amount > 0 ? totalCost : nextCost };
}

function recalculateStats() {
    let baseClick = 1;
    let baseIdle = 0;
    
    // 無限アップグレードノードによる基礎値アップ
    const infClickLv = getSkillLevel('node_inf_click');
    const infIdleLv = getSkillLevel('node_inf_idle');
    
    let globalSynergyMultiplier = 1.0;
    const individualBonus = {};
    
    // スキルツリー Node Alpha ボーナス
    const alphaLv = getSkillLevel('node_alpha');
    globalSynergyMultiplier *= (1 + alphaLv * 1.0);
    
    // メモリー共鳴（SYS.MEMORY_RESONANCE）による全体倍率
    const memoryResonanceLv = getSkillLevel('node_memory_resonance');
    if (memoryResonanceLv > 0) {
        globalSynergyMultiplier *= (1 + (gameState.memoryPoints * 0.01 * memoryResonanceLv));
    }
    
    // シナジー倍率の制限解除（SYS.SYNERGY_OVERDRIVE）
    const synergyOverdriveLv = getSkillLevel('node_synergy_overdrive');
    const maxDeckSynergyBonus = 1.0 + (synergyOverdriveLv * 0.5); // デフォルト1.0x、レベル毎に+0.5x上限増加

    if (gameState.unlockedFeatures.deck) {
        let deckCards = gameState.deck.map(id => cards.find(c => c.id === id)).filter(Boolean);
        let totalOwnedCards = cards.reduce((sum, c) => sum + c.count, 0);

        deckCards.forEach(c => individualBonus[c.id] = 1.0);
        lastActiveGlobalSkills = [];

        deckCards.forEach((card, index) => {
            const skill = card.skill.id;
            // 反転したカードタイプを取得
            const cardType = (gameState.awakenedCards.includes(card.id) && gameState.awakenedCardTypes[card.id]) 
                ? gameState.awakenedCardTypes[card.id] 
                : card.type;

            switch (skill) {
                case 's1':
                    if (index > 0 && deckCards[index-1]) individualBonus[deckCards[index-1].id] *= 1.5;
                    if (index < deckCards.length - 1 && deckCards[index+1]) individualBonus[deckCards[index+1].id] *= 1.5;
                    break;
                case 's2':
                    if (deckCards.length === 1) individualBonus[card.id] *= 5;
                    break;
                case 's3':
                    if (deckCards.length === 5) {
                        const firstLevel = deckCards[0].count;
                        if (deckCards.every(c => c.count === firstLevel)) {
                            const mult = (3 * maxDeckSynergyBonus);
                            globalSynergyMultiplier *= mult;
                            lastActiveGlobalSkills.push({name: card.skill.name, desc: `全体生産力 x${mult.toFixed(2)}`});
                        }
                    }
                    break;
                case 's4':
                    const s4Mult = (1 + Math.floor(totalOwnedCards / 100) * 0.01 * maxDeckSynergyBonus);
                    if (s4Mult > 1.0) {
                        globalSynergyMultiplier *= s4Mult;
                        lastActiveGlobalSkills.push({name: card.skill.name, desc: `全体生産力 x${s4Mult.toFixed(2)} (カード${totalOwnedCards}枚)`});
                    }
                    break;
                case 's5':
                    individualBonus[card.id] *= (index + 1);
                    break;
                case 's6':
                    let othersMax = 0;
                    deckCards.forEach(c => { if(c.id !== card.id && c.count > othersMax) othersMax = c.count; });
                    if (card.count >= othersMax + 100) individualBonus[card.id] *= 4;
                    break;
                case 's7':
                    const clickCount = deckCards.filter(c => {
                        const t = (gameState.awakenedCards.includes(c.id) && gameState.awakenedCardTypes[c.id]) ? gameState.awakenedCardTypes[c.id] : c.type;
                        return t === 'click';
                    }).length;
                    individualBonus[card.id] *= (1 + clickCount * 0.3 * maxDeckSynergyBonus);
                    break;
                case 's8':
                    const idleCount = deckCards.filter(c => {
                        const t = (gameState.awakenedCards.includes(c.id) && gameState.awakenedCardTypes[c.id]) ? gameState.awakenedCardTypes[c.id] : c.type;
                        return t === 'idle';
                    }).length;
                    individualBonus[card.id] *= (1 + idleCount * 0.3 * maxDeckSynergyBonus);
                    break;
                case 's9':
                    if (index === 2 && deckCards.length === 5) {
                        const mult = (2 * maxDeckSynergyBonus);
                        globalSynergyMultiplier *= mult;
                        lastActiveGlobalSkills.push({name: card.skill.name, desc: `全体生産力 x${mult.toFixed(2)}`});
                    }
                    break;
                case 's10':
                    if (deckCards.length > 0 && deckCards.every(c => c.count % 2 !== 0)) {
                        const mult = (1.5 * maxDeckSynergyBonus);
                        globalSynergyMultiplier *= mult;
                        lastActiveGlobalSkills.push({name: card.skill.name, desc: `全体生産力 x${mult.toFixed(2)}`});
                    }
                    break;
                case 's11':
                    if (deckCards.length > 0 && deckCards.every(c => c.count % 2 === 0)) {
                        const mult = (1.5 * maxDeckSynergyBonus);
                        globalSynergyMultiplier *= mult;
                        lastActiveGlobalSkills.push({name: card.skill.name, desc: `全体生産力 x${mult.toFixed(2)}`});
                    }
                    break;
                case 's12':
                    const minIdCard = deckCards.reduce((prev, curr) => (parseInt(prev.id.split('_')[1]) < parseInt(curr.id.split('_')[1]) ? prev : curr));
                    if (minIdCard.id === card.id) individualBonus[card.id] *= 3;
                    break;
                case 's13':
                    const maxIdCard = deckCards.reduce((prev, curr) => (parseInt(prev.id.split('_')[1]) > parseInt(curr.id.split('_')[1]) ? prev : curr));
                    if (maxIdCard.id === card.id) individualBonus[card.id] *= 3;
                    break;
                case 's14':
                    const hasClick = deckCards.some(c => {
                        const t = (gameState.awakenedCards.includes(c.id) && gameState.awakenedCardTypes[c.id]) ? gameState.awakenedCardTypes[c.id] : c.type;
                        return t === 'click';
                    });
                    const hasIdle = deckCards.some(c => {
                        const t = (gameState.awakenedCards.includes(c.id) && gameState.awakenedCardTypes[c.id]) ? gameState.awakenedCardTypes[c.id] : c.type;
                        return t === 'idle';
                    });
                    if (hasClick && hasIdle) {
                        const mult = (1.5 * maxDeckSynergyBonus);
                        globalSynergyMultiplier *= mult;
                        lastActiveGlobalSkills.push({name: card.skill.name, desc: `全体生産力 x${mult.toFixed(2)}`});
                    }
                    break;
                case 's15':
                    if (deckCards.length === 5 && deckCards.every(c => {
                        const t = (gameState.awakenedCards.includes(c.id) && gameState.awakenedCardTypes[c.id]) ? gameState.awakenedCardTypes[c.id] : c.type;
                        const t0 = (gameState.awakenedCards.includes(deckCards[0].id) && gameState.awakenedCardTypes[deckCards[0].id]) ? gameState.awakenedCardTypes[deckCards[0].id] : deckCards[0].type;
                        return t === t0;
                    })) {
                        const mult = (2 * maxDeckSynergyBonus);
                        globalSynergyMultiplier *= mult;
                        lastActiveGlobalSkills.push({name: card.skill.name, desc: `全体生産力 x${mult.toFixed(2)}`});
                    }
                    break;
                case 's16':
                    const minCostCard = deckCards.reduce((prev, curr) => (prev.baseCost < curr.baseCost ? prev : curr));
                    if (minCostCard.id === card.id) individualBonus[card.id] *= 3;
                    break;
                case 's17':
                    const maxCostCard = deckCards.reduce((prev, curr) => (prev.baseCost > curr.baseCost ? prev : curr));
                    if (maxCostCard.id === card.id) individualBonus[card.id] *= 3;
                    break;
                case 's18':
                    const minLevelCard = deckCards.reduce((prev, curr) => (prev.count < curr.count ? prev : curr));
                    if (minLevelCard.id === card.id) individualBonus[card.id] *= 2;
                    break;
                case 's19':
                    if (deckCards.length === 5) {
                        let isStairs = true;
                        for(let i=0; i<4; i++) { if (deckCards[i].count >= deckCards[i+1].count) isStairs = false; }
                        if (isStairs) {
                            const mult = (3 * maxDeckSynergyBonus);
                            globalSynergyMultiplier *= mult;
                            lastActiveGlobalSkills.push({name: card.skill.name, desc: `全体生産力 x${mult.toFixed(2)}`});
                        }
                    }
                    break;
                case 's20':
                    const uniqueSkills = new Set(deckCards.map(c => c.skill.id)).size;
                    const s20Mult = (1 + uniqueSkills * 0.1 * maxDeckSynergyBonus);
                    if (s20Mult > 1.0) {
                        globalSynergyMultiplier *= s20Mult;
                        lastActiveGlobalSkills.push({name: card.skill.name, desc: `全体生産力 x${s20Mult.toFixed(2)} (スキル${uniqueSkills}種)`});
                    }
                    break;
            }
        });
    }

    const milestones = [10, 25, 50, 100, 250, 500, 1000];
    cards.forEach(card => {
        if (card.count === 0) return;
        
        let selfMultiplier = 1;
        milestones.forEach(m => {
            if (card.count >= m) selfMultiplier *= 2;
        });

        if (individualBonus[card.id]) {
            selfMultiplier *= individualBonus[card.id];
        }

        if (gameState.unlockedFeatures.awakening && gameState.awakenedCards.includes(card.id)) {
            selfMultiplier *= 100;
        }
        
        const totalValue = card.value * card.count * selfMultiplier;
        
        // 反転後のカードタイプに合わせて加算先を分ける
        const cardType = (gameState.awakenedCards.includes(card.id) && gameState.awakenedCardTypes[card.id]) 
            ? gameState.awakenedCardTypes[card.id] 
            : card.type;

        if (cardType === 'click') baseClick += totalValue;
        if (cardType === 'idle') baseIdle += totalValue;
    });

    // 無限アップグレードの基礎効果を乗算
    baseClick *= (1 + infClickLv * 0.05);
    baseIdle *= (1 + infIdleLv * 0.05);

    const achievementMultiplier = 1 + (gameState.achievements.length * 0.05);
    const memoryMultiplier = 1 + (gameState.memoryPoints * 0.1);

    gameState.energyPerClick = baseClick * achievementMultiplier * memoryMultiplier * globalSynergyMultiplier;
    gameState.energyPerSecond = baseIdle * achievementMultiplier * memoryMultiplier * globalSynergyMultiplier;

    // モーダル用に保存
    lastGlobalSynergyMultiplier = globalSynergyMultiplier;
    lastIndividualBonus = individualBonus;
    lastAchievementMultiplier = achievementMultiplier;
    lastMemoryMultiplier = memoryMultiplier;
    lastAlphaBonus = 1 + alphaLv * 1.0;
    
    lastDeckDetails = cards.filter(c => c.count > 0).map(card => {
        let levelMult = 1;
        [10, 25, 50, 100, 250, 500, 1000].forEach(m => {
            if (card.count >= m) levelMult *= 2;
        });
        const isAwakened = gameState.unlockedFeatures.awakening && gameState.awakenedCards.includes(card.id);
        if (isAwakened) levelMult *= 100;
        
        return {
            id: card.id,
            name: card.name,
            levelMult: levelMult,
            synergyMult: individualBonus[card.id] || 1.0
        };
    });

    const synergyBtn = document.getElementById('btn-synergy-open');
    if (synergyBtn) {
        synergyBtn.title = `実績: x${achievementMultiplier.toFixed(2)} | メモリー: x${memoryMultiplier.toFixed(2)} | システム: x${globalSynergyMultiplier.toFixed(2)}`;
    }
    
    // クリッカー対象（中央円）の進化ビジュアル更新
    updateClickerEvolutionVisual();
}

function renderSynergyDetails() {
    const container = document.getElementById('synergy-details-content');
    if (!container) return;

    let html = `<div style="margin-bottom: 20px;">
        <h4 style="margin: 0 0 5px 0; color: #333;">🌍 全体ボーナス (乗算)</h4>
        <ul style="margin: 0; padding-left: 20px; color: #555;">
            <li>🏆 <strong>実績ボーナス:</strong> x${lastAchievementMultiplier.toFixed(2)}</li>
            <li>🔄 <strong>メモリーボーナス:</strong> x${lastMemoryMultiplier.toFixed(2)}</li>
            <li>⚙️ <strong>システムノード(Alpha):</strong> x${lastAlphaBonus.toFixed(2)}</li>
            <li>🃏 <strong>デッキ全体シナジー:</strong> x${(lastGlobalSynergyMultiplier / lastAlphaBonus).toFixed(2)}</li>
            <li style="list-style: none; margin-top: 5px; font-weight: bold; color: #d32f2f;">🔥 最終全体倍率: x${(lastAchievementMultiplier * lastMemoryMultiplier * lastGlobalSynergyMultiplier).toFixed(2)}</li>
        </ul>
    </div>`;

    html += `<div>
        <h4 style="margin: 0 0 5px 0; color: #333;">🃏 個別カードボーナス</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; color: #555;">
            <tr style="background: #eee;">
                <th style="padding: 5px; border: 1px solid #ccc; text-align: left;">カード名</th>
                <th style="padding: 5px; border: 1px solid #ccc; text-align: right;">価格/レベル効果</th>
                <th style="padding: 5px; border: 1px solid #ccc; text-align: right;">デッキ効果</th>
            </tr>`;

    let deckCardsFound = false;
    lastDeckDetails.forEach(d => {
        if (gameState.deck.includes(d.id)) {
            deckCardsFound = true;
            html += `<tr>
                <td style="padding: 5px; border: 1px solid #ccc;">${d.name}</td>
                <td style="padding: 5px; border: 1px solid #ccc; text-align: right;">x${d.levelMult.toFixed(0)}</td>
                <td style="padding: 5px; border: 1px solid #ccc; text-align: right; color: #ff9800; font-weight: bold;">x${d.synergyMult.toFixed(2)}</td>
            </tr>`;
        }
    });

    if (!deckCardsFound) {
        html += `<tr><td colspan="3" style="padding: 10px; text-align: center; border: 1px solid #ccc;">デッキにカードが装備されていません</td></tr>`;
    }

    html += `</table></div>`;

    if (lastActiveGlobalSkills.length > 0) {
        html += `<div style="margin-top: 15px;">
            <h4 style="margin: 0 0 5px 0; color: #333;">✨ 発動中の全体スキル</h4>
            <ul style="margin: 0; padding-left: 20px; color: #d32f2f; font-size: 13px;">`;
        lastActiveGlobalSkills.forEach(skill => {
            html += `<li><strong>${skill.name}:</strong> ${skill.desc}</li>`;
        });
        html += `</ul></div>`;
    }
    
    container.innerHTML = html;
}

function getAwakenCost(card) {
    const epsLv = getSkillLevel('node_epsilon');
    const discount = Math.pow(10, epsLv);
    return (card.baseCost * 1e15) / discount;
}

function awakenCard(cardId) {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    const cost = getAwakenCost(card);
    if (gameState.energy >= cost) {
        gameState.energy -= cost;
        gameState.awakenedCards.push(cardId);
        showToast('AWAKENING', `${card.name} HAS BEEN AWAKENED`, '🌈');
        recalculateStats();
        renderCards();
        updateUI();
    }
}

function buyCard(cardId) {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    let buyAmount = 1;
    let cost = 0;

    if (buyMode === 'MAX') {
        const maxData = calculateMaxPurchase(card, gameState.energy);
        buyAmount = maxData.amount;
        cost = maxData.cost;
        if (gameState.energy < cost && buyAmount === 1) return;
    } else {
        buyAmount = parseInt(buyMode);
        cost = calculateCumulativeCost(card, buyAmount);
    }

    if (gameState.energy >= cost) {
        gameState.energy -= cost;
        card.count += buyAmount;
        recalculateStats();
        renderCards();
        renderDeck();
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
        
        let displayAmount = 1;
        let displayCost = 0;
        
        if (buyMode === 'MAX') {
            const maxData = calculateMaxPurchase(card, gameState.energy);
            displayAmount = maxData.amount;
            displayCost = maxData.cost;
            if (gameState.energy < displayCost && displayAmount === 1) {
                displayCost = calculateCumulativeCost(card, 1);
            }
        } else {
            displayAmount = parseInt(buyMode);
            displayCost = calculateCumulativeCost(card, displayAmount);
        }

        const canBuy = gameState.energy >= displayCost;
        const isAwakened = gameState.awakenedCards.includes(card.id);
        
        const cardEl = document.createElement('div');
        cardEl.className = `card ${canBuy ? '' : 'disabled'} ${isAwakened ? 'awakened' : ''}`;
        cardEl.dataset.id = card.id;
        
        const isNew = card.count === 0 && canBuy;
        const newTag = isNew ? '<span style="color:red; font-size:12px; font-weight:bold; margin-left:10px;">NEW!</span>' : '';

        let multiplier = 1;
        [10, 25, 50, 100, 250, 500, 1000].forEach(m => {
            if (card.count >= m) multiplier *= 2;
        });
        if (isAwakened) multiplier *= 100;

        const isEquipped = gameState.deck.includes(card.id);
        const equipTag = isEquipped ? '<span style="color:#ff9800; font-size:10px; margin-left:5px;">[装備中]</span>' : '';

        let awakenHtml = '';
        const currentType = (isAwakened && gameState.awakenedCardTypes[card.id]) ? gameState.awakenedCardTypes[card.id] : card.type;
        const typeLabel = currentType === 'click' ? 'クリック型' : '放置型';

        if (gameState.unlockedFeatures.awakening && !isAwakened) {
            const awakenCost = getAwakenCost(card);
            const canAwaken = gameState.energy >= awakenCost;
            awakenHtml = `<button class="btn-awaken" ${canAwaken ? '' : 'style="opacity:0.5;"'} onclick="awakenCard('${card.id}')">★覚醒 (${formatNumber(awakenCost)})</button>`;
        } else if (isAwakened) {
            awakenHtml = `
                <div style="display: flex; flex-direction: column; gap: 2px; align-items: center; justify-content: center; flex: 1;">
                    <span style="font-size:10px; color:magenta; font-weight:bold;">✨覚醒済 (${typeLabel})✨</span>
                    <button class="btn-sm" style="background:#673ab7; color:white; font-size:9px; padding: 2px 6px; border-radius:4px; border:none; cursor:pointer;" onclick="toggleCardType('${card.id}')">タイプ反転</button>
                </div>
            `;
        }

        const buyBtnText = `購入x${buyMode === 'MAX' ? displayAmount : buyMode} (${formatNumber(displayCost)})`;

        // 表示用のPrefixを反転タイプに合わせて変更
        const descPrefix = currentType === 'click' ? 'クリック獲得量 +' : '毎秒獲得量 +';

        cardEl.innerHTML = `
            <div class="card-image-container" title="${card.skill.name}: ${card.skill.desc}">
                <img src="${card.image}" alt="${card.name}" class="card-img" onerror="this.src='data:image/svg+xml;base64,...'">
            </div>
            <div class="card-info">
                <div class="card-name">${card.name} ${newTag} ${equipTag}</div>
                <div class="card-desc">${descPrefix} ${formatNumber(card.value * multiplier)} <br><span style="font-size:10px; color:#ff9800;">★${card.skill.name}</span></div>
                <div style="display: flex; gap: 5px; margin-top: 5px;">
                    <button class="btn-buy-card" onclick="buyCard('${card.id}')">${buyBtnText}</button>
                    ${awakenHtml}
                </div>
            </div>
            <div class="card-count">${card.count}</div>
        `;
        
        cardListEl.appendChild(cardEl);
    }
}

// カードのクリック・放置タイプ反転トグル
function toggleCardType(cardId) {
    const card = cards.find(c => c.id === cardId);
    if (!card || !gameState.awakenedCards.includes(cardId)) return;
    
    // 現在の反転タイプを確認し、トグルする
    const current = gameState.awakenedCardTypes[cardId] || card.type;
    const nextType = current === 'click' ? 'idle' : 'click';
    gameState.awakenedCardTypes[cardId] = nextType;
    
    recalculateStats();
    renderCards();
    renderDeck();
    updateUI();
    showToast('システム', `${card.name} のカード属性を「${nextType === 'click' ? 'クリック獲得' : '放置獲得'}」に反転しました`, '🔄');
}

// クリッカー進化ビジュアルの動的更新
function updateClickerEvolutionVisual() {
    const container = document.getElementById('core-container');
    const imgEl = document.getElementById('main-core');
    if (!container || !imgEl) return;
    
    // 所持している「エネルギー」系カードを抽出（IDでソートして最後が最高ランクになるようにする）
    const ownedEnergyCards = cards
        .filter(c => c.count > 0 && c.name.includes('エネルギー'))
        .sort((a, b) => {
            const idA = parseInt(a.id.split('_')[1]);
            const idB = parseInt(b.id.split('_')[1]);
            return idA - idB;
        });
    
    // デフォルト画像
    let targetSrc = 'assets/ノーマルエネルギー.png';
    
    // スキンが手動で選択されているかチェック
    if (gameState.selectedEnergySkin) {
        // 所持しているエネルギーカードの中から、選択されたIDを探す
        const selectedSkinCard = ownedEnergyCards.find(c => c.id === gameState.selectedEnergySkin);
        if (selectedSkinCard) {
            targetSrc = selectedSkinCard.image;
        } else {
            // 選択されたスキンカードを何らかの理由で失った場合や見つからない場合は選択をリセット
            gameState.selectedEnergySkin = null;
        }
    }
    
    // 自動（未選択）の場合、または上記でリセットされた場合
    if (!gameState.selectedEnergySkin) {
        if (ownedEnergyCards.length > 0) {
            const highestEnergyCard = ownedEnergyCards[ownedEnergyCards.length - 1];
            targetSrc = highestEnergyCard.image;
        }
    }
    
    if (imgEl.src !== targetSrc && !imgEl.src.endsWith(targetSrc)) {
        imgEl.src = targetSrc;
    }

    // The user requested to only swap the image without the CSS visual evolution
    container.className = 'core-container';
}

function openSkinModal() {
    const modal = document.getElementById('skin-modal');
    if (!modal) return;
    
    const listEl = document.getElementById('skin-list');
    listEl.innerHTML = '';
    
    const ownedEnergyCards = cards
        .filter(c => c.count > 0 && c.name.includes('エネルギー'))
        .sort((a, b) => {
            const idA = parseInt(a.id.split('_')[1]);
            const idB = parseInt(b.id.split('_')[1]);
            return idA - idB;
        });
        
    // 自動選択オプション
    const autoOption = document.createElement('div');
    autoOption.className = `skin-option ${gameState.selectedEnergySkin === null ? 'selected' : ''}`;
    autoOption.innerHTML = `
        <div style="font-size: 24px; text-align: center; margin-bottom: 5px;">✨</div>
        <div>自動（最高ランク）</div>
    `;
    autoOption.onclick = () => {
        gameState.selectedEnergySkin = null;
        saveGame();
        recalculateStats(); // updateClickerEvolutionVisual will be called
        document.getElementById('skin-modal').style.display = 'none';
    };
    listEl.appendChild(autoOption);
    
    ownedEnergyCards.forEach(c => {
        const option = document.createElement('div');
        option.className = `skin-option ${gameState.selectedEnergySkin === c.id ? 'selected' : ''}`;
        option.innerHTML = `
            <img src="${c.image}" style="width: 100%; height: 60px; object-fit: contain; margin-bottom: 5px;" onerror="this.style.display='none'">
            <div style="font-size: 10px;">${c.name}</div>
        `;
        option.onclick = () => {
            gameState.selectedEnergySkin = c.id;
            saveGame();
            recalculateStats();
            document.getElementById('skin-modal').style.display = 'none';
        };
        listEl.appendChild(option);
    });
    
    modal.style.display = 'flex';
}

// 段階的アンロックの確認
function checkUnlocks() {
    let changed = false;
    if (!gameState.unlockedFeatures.deck && gameState.allTimeEnergy >= 1e12) {
        gameState.unlockedFeatures.deck = true;
        showToast('System Override', 'DECK_CONFIGURATION_UNLOCKED', '🃏');
        changed = true;
    }
    if (!gameState.unlockedFeatures.awakening && gameState.allTimeEnergy >= 1e15) {
        gameState.unlockedFeatures.awakening = true;
        showToast('System Override', 'CARD_AWAKENING_PROTOCOL_UNLOCKED', '🌟');
        changed = true;
    }
    if (!gameState.unlockedFeatures.prestige && gameState.allTimeEnergy >= 1e21) {
        gameState.unlockedFeatures.prestige = true;
        showToast('System Override', 'PRESTIGE_REBIRTH_UNLOCKED', '🔄');
        changed = true;
    }
    if (!gameState.unlockedFeatures.artifact && gameState.allTimeEnergy >= 1e30) {
        gameState.unlockedFeatures.artifact = true;
        showToast('System Override', 'ARTIFACT_SLOT_UNLOCKED', '🔮');
        changed = true;
    }
    if (!gameState.unlockedFeatures.advancedTree && gameState.allTimeEnergy >= 1e45) {
        gameState.unlockedFeatures.advancedTree = true;
        showToast('System Override', 'ADVANCED_SYSTEM_NODES_UNLOCKED', '⚡');
        changed = true;
    }
    if (changed) {
        updateUnlockUI();
        renderCards();
        renderDeck();
    }
}

function updateUnlockUI() {
    document.getElementById('tab-btn-deck').style.display = gameState.unlockedFeatures.deck ? 'block' : 'none';
    document.getElementById('btn-prestige-open').style.display = gameState.unlockedFeatures.prestige ? 'block' : 'none';
    document.getElementById('btn-skilltree-open').style.display = gameState.unlockedFeatures.prestige ? 'block' : 'none';
    
    // スキルツリーの「ACCESS_SYSTEM_NODES」ボタンのテキストを進行度に応じてサイバーに変更
    const treeBtn = document.getElementById('btn-skilltree-open');
    if (treeBtn) {
        if (gameState.unlockedFeatures.advancedTree) {
            treeBtn.innerHTML = '[ACCESS_OVERDRIVE_NODES] ⚡';
            treeBtn.style.color = '#e040fb';
            treeBtn.style.borderColor = '#e040fb';
        } else {
            treeBtn.innerHTML = '[ACCESS_SYSTEM_NODES]';
            treeBtn.style.color = '#00ffcc';
            treeBtn.style.borderColor = '#00ffcc';
        }
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
            let cost;
            if(buyMode === 'MAX') {
                cost = calculateMaxPurchase(card, gameState.energy).cost;
            } else {
                cost = calculateCumulativeCost(card, parseInt(buyMode));
            }
            if (gameState.energy >= cost) {
                el.classList.remove('disabled');
            } else {
                el.classList.add('disabled');
            }
            
            const btnAwaken = el.querySelector('.btn-awaken');
            if (btnAwaken) {
                if (gameState.energy >= getAwakenCost(card)) {
                    btnAwaken.style.opacity = '1';
                } else {
                    btnAwaken.style.opacity = '0.5';
                }
            }
        }
    });

    const btnPrestige = document.getElementById('btn-prestige-open');
    if (btnPrestige && gameState.unlockedFeatures.prestige) {
        const newMemories = Math.floor(Math.pow(Math.max(0, Math.log10(gameState.allTimeEnergy / 1e21)), 2));
        const gained = Math.max(0, newMemories - gameState.memoryPoints);
        btnPrestige.innerHTML = `🔄 転生する <span style="font-size:10px; opacity:0.8;">(予定: +${gained})</span>`;
    }
    
    const unlockedCount = cardEls.length;
    if (unlockedCount < cards.length) {
        const nextCard = cards[unlockedCount - 1];
        if (nextCard && gameState.energy >= calculateCumulativeCost(nextCard, 1) * 0.5) {
            renderCards();
        }
    }
}

function handleCoreClick(e) {
    gameState.energy += gameState.energyPerClick;
    gameState.allTimeEnergy += gameState.energyPerClick;
    updateUI();
    createClickEffect(e);
    createParticles(e);
}

function createParticles(e) {
    const container = document.querySelector('.click-area');
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 所持エネルギーカードの進化段階によって色を変える
    const ownedEnergyCardsCount = cards.filter(c => c.count > 0 && c.name.includes('エネルギー')).length;
    let particleColor = '#00ffff'; // デフォルト：シアン
    if (ownedEnergyCardsCount >= 25) particleColor = '#ff3d00'; // ブラックホール：赤橙
    else if (ownedEnergyCardsCount >= 15) particleColor = '#e040fb'; // 銀河：マゼンタ・紫
    else if (ownedEnergyCardsCount >= 8) particleColor = '#ffa500'; // 恒星：オレンジ・黄色
    else if (ownedEnergyCardsCount >= 2) particleColor = '#00e5ff'; // クリスタル：明るい水色

    const count = 10;
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'click-particle';
        p.style.backgroundColor = particleColor;
        p.style.left = `${x}px`;
        p.style.top = `${y}px`;
        
        // ランダムな飛び散り方向と距離
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 80 + 30; // 30〜110px
        const dx = Math.cos(angle) * speed;
        const dy = Math.sin(angle) * speed;
        
        p.style.setProperty('--dx', `${dx}px`);
        p.style.setProperty('--dy', `${dy}px`);
        
        container.appendChild(p);
        setTimeout(() => p.remove(), 600);
    }
}

function gameLoop() {
    if (gameState.energyPerSecond > 0) {
        gameState.energy += gameState.energyPerSecond;
        gameState.allTimeEnergy += gameState.energyPerSecond;
        updateUI();
    }
}

function checkAchievements() {
    achievementsList.forEach(ach => {
        if (!gameState.achievements.includes(ach.id)) {
            if (ach.condition()) {
                gameState.achievements.push(ach.id);
                showToast('実績解除！', ach.title, '🏆');
                recalculateStats();
            }
        }
    });
}

function showToast(title, message, icon) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<div class="toast-icon">${icon}</div><div class="toast-text"><h4>${title}</h4><p>${message}</p></div>`;
    container.appendChild(toast);
    setTimeout(() => { if(toast.parentElement) toast.remove(); }, 5000);
}

function renderAchievements() {
    const listEl = document.getElementById('achievements-list');
    listEl.innerHTML = '';
    const bonusEl = document.getElementById('achievement-bonus');
    bonusEl.textContent = `+${gameState.achievements.length * 5}%`;

    achievementsList.forEach(ach => {
        const isUnlocked = gameState.achievements.includes(ach.id);
        const item = document.createElement('div');
        item.className = `achievement-item ${isUnlocked ? 'unlocked' : 'locked'}`;
        item.innerHTML = `<div class="ach-icon">${isUnlocked ? '🏆' : '🔒'}</div><div class="ach-info"><h4>${ach.title}</h4><p>${isUnlocked ? ach.desc : '条件未達成'}</p></div>`;
        listEl.appendChild(item);
    });
}

function createClickEffect(e) {
    const container = document.querySelector('.click-area');
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

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
    
    const gammaLv = getSkillLevel('node_gamma');
    const spawnRate = 0.05 + (gammaLv * 0.05); // max 0.30 (30% chance every 10 sec)
    
    if (Math.random() > spawnRate) return;

    goldenCardEl = document.createElement('div');
    goldenCardEl.className = 'golden-card';
    goldenCardEl.style.left = `${Math.random() * (window.innerWidth - 100)}px`;
    goldenCardEl.style.top = `${Math.random() * (window.innerHeight - 150)}px`;
    
    goldenCardEl.addEventListener('click', (e) => {
        gameState.goldenClicks++;
        
        const deltaLv = getSkillLevel('node_delta');
        const rewardMult = 1 + (deltaLv * 0.5); // max 3.5x
        
        const reward = Math.max(gameState.energyPerClick * 100, gameState.energyPerSecond * 60 * 15) * rewardMult;
        gameState.energy += reward;
        gameState.allTimeEnergy += reward;
        
        const effectEl = document.createElement('div');
        effectEl.className = 'floating-number reward-text';
        effectEl.textContent = `Anomaly Detected! +${formatNumber(reward)}`;
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
