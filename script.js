(function () {
    'use strict';

    document.addEventListener('contextmenu', e => e.preventDefault());

    // الشاشات
    const homeScreen = document.getElementById("homeScreen");
    const levelMenuScreen = document.getElementById("levelMenuScreen");
    const multiSetupScreen = document.getElementById("multiSetupScreen");
    const gameScreen = document.getElementById("gameScreen");
    const shopScreen = document.getElementById("shopScreen");

    const toastNotification = document.getElementById("toastNotification");
    const multiCanvasWrapper = document.getElementById("multiCanvasWrapper");
    const overlay = document.getElementById("messageOverlay");
    const overlayTitle = document.getElementById("overlayTitle");
    const overlayText = document.getElementById("overlayText");
    const startBtn = document.getElementById("startBtn");

    let coins = localStorage.getItem('samball_coins') ? parseInt(localStorage.getItem('samball_coins')) : 0;
    let unlockedLevel = localStorage.getItem('samball_unlocked') ? parseInt(localStorage.getItem('samball_unlocked')) : 1;
    let equippedBall = localStorage.getItem('samball_ball') || 'ball_0';
    let ownedBalls = JSON.parse(localStorage.getItem('samball_owned_balls')) || ['ball_0'];
    let customImageBase64 = localStorage.getItem('samball_custom_img') || null;

    let isMultiplayer = false;
    let playerCount = 2;
    let gameRunning = false;
    let animationFrameId = null;
    let playerConfigs = [];
    let playersState = [];

    const ballsDatabase = [
        { id: 'ball_0', name: "الكرة الكلاسيكية", price: 0, color: "#ff4757" },
        { id: 'ball_1', name: "سبايدرمان 🕷️", price: 100, color: "#e74c3c" },
        { id: 'ball_2', name: "باتمان 🦇", price: 150, color: "#2f3640" },
        { id: 'ball_3', name: "آيمن مان ⚡", price: 200, color: "#f1c40f" },
        { id: 'ball_4', name: "سوبرمان 🦸‍♂️", price: 250, color: "#3498db" },
        { id: 'ball_5', name: "كابتن أمريكا 🛡️", price: 300, color: "#2980b9" },
        { id: 'ball_6', name: "ثور 🔨", price: 350, color: "#7f8c8d" },
        { id: 'ball_7', name: "هولك 🟢", price: 400, color: "#2ecc71" },
        { id: 'ball_8', name: "ديدبول ⚔️", price: 500, color: "#c0392b" },
        { id: 'ball_9', name: "فلاش ⚡", price: 600, color: "#d35400" }
    ];

    const playerColors = ["#ff4757", "#1e90ff", "#2ed573", "#ffa502"];

    // إشعار فوري (Toast) لمدة ثانيتين
    function showToast(msg) {
        if (!toastNotification) return;
        toastNotification.innerText = msg;
        toastNotification.classList.remove("hidden");
        setTimeout(() => {
            toastNotification.classList.add("hidden");
        }, 2000);
    }

    // اكتشاف أجهزة التحكم (Gamepad)
    window.addEventListener("gamepadconnected", (e) => {
        showToast(`🎮 تم توصيل ذراع التحكم: ${e.gamepad.id.substring(0, 15)}...`);
        renderMultiSetup();
    });

    window.addEventListener("gamepaddisconnected", () => {
        showToast("⚠️ تم فصل ذراع التحكم");
        renderMultiSetup();
    });

    // إعدادات اللاعبين المتاحة
    window.setPlayerCount = function (count) {
        playerCount = count;
        document.querySelectorAll('.count-btn').forEach(btn => btn.classList.remove('active'));
        if (count === 2) document.getElementById('btn2Players').classList.add('active');
        if (count === 3) document.getElementById('btn3Players').classList.add('active');
        if (count === 4) document.getElementById('btn4Players').classList.add('active');
        renderMultiSetup();
    };

    function openMultiplayerSetup() {
        if (homeScreen) homeScreen.classList.add("hidden");
        if (multiSetupScreen) multiSetupScreen.classList.remove("hidden");
        renderMultiSetup();
    }

    function renderMultiSetup() {
        const grid = document.getElementById("playersSetupGrid");
        if (!grid) return;
        grid.innerHTML = "";

        const gamepads = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];

        for (let i = 0; i < playerCount; i++) {
            const card = document.createElement("div");
            card.className = `player-card-setup p${i + 1}`;

            let defaultCtrl = "keys_ad";
            if (i === 1) defaultCtrl = "keys_arrows";
            if (i === 2 && gamepads[0]) defaultCtrl = "gamepad_0";
            if (i === 3 && gamepads[1]) defaultCtrl = "gamepad_1";

            let optionsHtml = `
                <option value="keys_ad" ${defaultCtrl === 'keys_ad' ? 'selected' : ''}>كيبورد (A / D)</option>
                <option value="keys_arrows" ${defaultCtrl === 'keys_arrows' ? 'selected' : ''}>كيبورد (الأسهم)</option>
                <option value="mouse" ${i === 0 ? '' : ''}>الماوس / اللمس</option>
            `;

            gamepads.forEach((gp, idx) => {
                optionsHtml += `<option value="gamepad_${idx}" ${defaultCtrl === `gamepad_${idx}` ? 'selected' : ''}>ذراع تحكم ${idx + 1}</option>`;
            });

            card.innerHTML = `
                <h3 style="color: ${playerColors[i]}">اللاعب ${i + 1} 🎮</h3>
                <label style="font-size:12px;">جهاز التحكم:</label>
                <select class="setup-control-select" id="ctrlP${i}">
                    ${optionsHtml}
                </select>
            `;

            grid.appendChild(card);
        }
    }

    function startMultiplayerGame() {
        playerConfigs = [];
        for (let i = 0; i < playerCount; i++) {
            const select = document.getElementById(`ctrlP${i}`);
            playerConfigs.push({
                id: i,
                control: select ? select.value : 'keys_ad',
                color: playerColors[i]
            });
        }

        isMultiplayer = true;
        if (multiSetupScreen) multiSetupScreen.classList.add("hidden");
        if (gameScreen) gameScreen.classList.remove("hidden");
        document.getElementById("singleStats").style.display = "none";
        document.getElementById("currentModeTitle").innerText = `تحدي ${playerCount} لاعبين 👥`;

        initMultiplayerCanvases();
        showOverlay("جاهزون للتحدي؟", "ابدأ اللعب الآن");
    }

    function initMultiplayerCanvases() {
        multiCanvasWrapper.innerHTML = "";
        multiCanvasWrapper.className = `multi-canvas-wrapper players-${playerCount}`;
        playersState = [];

        for (let i = 0; i < playerCount; i++) {
            const box = document.createElement("div");
            box.className = `single-player-box p${i + 1}`;

            const tag = document.createElement("div");
            tag.className = "player-tag";
            tag.style.color = playerColors[i];
            tag.innerText = `لاعب ${i + 1} | أرواح: 3 | نقاط: 0`;
            tag.id = `tagP${i}`;

            const canv = document.createElement("canvas");
            canv.id = `canvasP${i}`;
            canv.width = 400;
            canv.height = 300;

            box.appendChild(tag);
            box.appendChild(canv);
            multiCanvasWrapper.appendChild(box);

            playersState.push(createPlayerState(i, canv));
        }
    }

    function createPlayerState(id, canvas) {
        const ctx = canvas.getContext("2d");
        const paddleWidth = 70;
        const paddleHeight = 10;
        return {
            id,
            canvas,
            ctx,
            score: 0,
            lives: 3,
            x: canvas.width / 2,
            y: canvas.height - 30,
            dx: 3 * (Math.random() > 0.5 ? 1 : -1),
            dy: -4,
            paddleWidth,
            paddleHeight,
            paddleX: (canvas.width - paddleWidth) / 2,
            leftPressed: false,
            rightPressed: false,
            bricks: createBricksForCanvas(),
            isDead: false
        };
    }

    function createBricksForCanvas() {
        const cols = 5, rows = 4, bricks = [];
        for (let c = 0; c < cols; c++) {
            bricks[c] = [];
            for (let r = 0; r < rows; r++) {
                bricks[c][r] = { x: 0, y: 0, status: 1 };
            }
        }
        return bricks;
    }

    // إدارة مدخلات المفاتيح والأزرار
    const keysDown = {};
    document.addEventListener("keydown", e => {
        keysDown[e.code] = true;
        if (e.key === "Enter" || e.key === "Select") {
            showToast("🔘 تم الضغط بالريموت / المفتاح");
        }
    });

    document.addEventListener("keyup", e => {
        keysDown[e.code] = false;
    });

    function updateInputs() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];

        playersState.forEach((p) => {
            const ctrl = playerConfigs[p.id].control;
            p.leftPressed = false;
            p.rightPressed = false;

            if (ctrl === "keys_ad") {
                if (keysDown["KeyA"]) p.leftPressed = true;
                if (keysDown["KeyD"]) p.rightPressed = true;
            } else if (ctrl === "keys_arrows") {
                if (keysDown["ArrowLeft"]) p.leftPressed = true;
                if (keysDown["ArrowRight"]) p.rightPressed = true;
            } else if (ctrl.startsWith("gamepad_")) {
                const gpIdx = parseInt(ctrl.split("_")[1]);
                const gp = gamepads[gpIdx];
                if (gp) {
                    if (gp.axes[0] < -0.3 || (gp.buttons[14] && gp.buttons[14].pressed)) p.leftPressed = true;
                    if (gp.axes[0] > 0.3 || (gp.buttons[15] && gp.buttons[15].pressed)) p.rightPressed = true;
                }
            }
        });
    }

    function multiGameLoop() {
        if (!gameRunning) return;

        updateInputs();

        let activePlayers = 0;
        let winnerIndex = -1;

        playersState.forEach((p) => {
            if (p.isDead) return;

            activePlayers++;
            winnerIndex = p.id;

            const ctx = p.ctx;
            const canvas = p.canvas;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // رسم الطوب
            const brickWidth = 60, brickHeight = 15, brickPadding = 8, offsetTop = 25, offsetLeft = 30;
            let bricksLeft = 0;

            for (let c = 0; c < 5; c++) {
                for (let r = 0; r < 4; r++) {
                    let b = p.bricks[c][r];
                    if (b.status === 1) {
                        bricksLeft++;
                        let bx = (c * (brickWidth + brickPadding)) + offsetLeft;
                        let by = (r * (brickHeight + brickPadding)) + offsetTop;
                        b.x = bx; b.y = by;
                        ctx.beginPath();
                        ctx.roundRect(bx, by, brickWidth, brickHeight, 3);
                        ctx.fillStyle = playerColors[r % playerColors.length];
                        ctx.fill();
                        ctx.closePath();

                        // تصادم الكرة بالطوب
                        if (p.x > bx && p.x < bx + brickWidth && p.y > by && p.y < by + brickHeight) {
                            p.dy = -p.dy;
                            b.status = 0;
                            p.score += 10;
                            document.getElementById(`tagP${p.id}`).innerText = `لاعب ${p.id + 1} | أرواح: ${p.lives} | نقاط: ${p.score}`;
                        }
                    }
                }
            }

            // فوز اللاعب بتحطيم كل الطوب
            if (bricksLeft === 0) {
                gameRunning = false;
                showOverlay(`🎉 مبروك! اللاعب ${p.id + 1} هو الفائز بإنهاء الطوب أولاً!`, "تحدي جديد");
                return;
            }

            // رسم الكرة
            ctx.beginPath();
            ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
            ctx.fillStyle = playerColors[p.id];
            ctx.fill();
            ctx.closePath();

            // رسم المضارب
            if (p.leftPressed && p.paddleX > 0) p.paddleX -= 5;
            if (p.rightPressed && p.paddleX < canvas.width - p.paddleWidth) p.paddleX += 5;

            ctx.beginPath();
            ctx.roundRect(p.paddleX, canvas.height - p.paddleHeight - 5, p.paddleWidth, p.paddleHeight, 4);
            ctx.fillStyle = "#ffffff";
            ctx.fill();
            ctx.closePath();

            // حركة الكرة والتصادم
            if (p.x + p.dx > canvas.width - 7 || p.x + p.dx < 7) p.dx = -p.dx;
            if (p.y + p.dy < 7) p.dy = -p.dy;
            else if (p.y + p.dy > canvas.height - 12) {
                if (p.x > p.paddleX && p.x < p.paddleX + p.paddleWidth) {
                    p.dy = -Math.abs(p.dy);
                } else {
                    p.lives--;
                    document.getElementById(`tagP${p.id}`).innerText = `لاعب ${p.id + 1} | أرواح: ${p.lives} | نقاط: ${p.score}`;
                    if (p.lives <= 0) {
                        p.isDead = true;
                    } else {
                        p.x = canvas.width / 2;
                        p.y = canvas.height - 30;
                        p.dy = -4;
                    }
                }
            }

            p.x += p.dx;
            p.y += p.dy;
        });

        if (activePlayers === 1 && playerCount > 1) {
            gameRunning = false;
            showOverlay(`👑 فاز اللاعب ${winnerIndex + 1} بسبب صموده للنهاية!`, "تحدي جديد");
            return;
        } else if (activePlayers === 0) {
            gameRunning = false;
            showOverlay("💥 خسر جميع اللاعبين!", "حاولوا مجدداً");
            return;
        }

        animationFrameId = requestAnimationFrame(multiGameLoop);
    }

    function showOverlay(title, btnText) {
        if (overlayTitle) overlayTitle.innerText = title;
        if (overlayText) overlayText.innerText = "استمتعوا بالتحدي الآن!";
        if (startBtn) startBtn.innerText = btnText;
        if (overlay) overlay.classList.remove("hidden");
    }

    if (startBtn) {
        startBtn.addEventListener("click", () => {
            if (overlay) overlay.classList.add("hidden");
            gameRunning = true;
            if (isMultiplayer) {
                animationFrameId = requestAnimationFrame(multiGameLoop);
            }
        });
    }

    window.openGameMenu = () => {
        showToast("🎮 جاري فتح التحدي الفردي");
        if (homeScreen) homeScreen.classList.add("hidden");
        if (levelMenuScreen) levelMenuScreen.classList.remove("hidden");
    };

    window.openMultiplayerSetup = openMultiplayerSetup;
    window.openShopMenu = () => {
        if (homeScreen) homeScreen.classList.add("hidden");
        if (shopScreen) shopScreen.classList.remove("hidden");
    };

    window.backToHome = () => {
        gameRunning = false;
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        [levelMenuScreen, shopScreen, gameScreen, multiSetupScreen].forEach(s => s && s.classList.add("hidden"));
        if (homeScreen) homeScreen.classList.remove("hidden");
        if (overlay) overlay.classList.add("hidden");
    };

    document.addEventListener("DOMContentLoaded", () => {
        showToast("🌟 أهلاً بك في لعبة Samball!");
    });
})();
