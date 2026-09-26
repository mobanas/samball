(function () {
    'use strict';

    document.addEventListener('contextmenu', e => e.preventDefault());

    const homeScreen = document.getElementById("homeScreen");
    const levelMenuScreen = document.getElementById("levelMenuScreen");
    const multiSetupScreen = document.getElementById("multiSetupScreen");
    const gameScreen = document.getElementById("gameScreen");
    const shopScreen = document.getElementById("shopScreen");

    const toastNotification = document.getElementById("toastNotification");
    const multiCanvasWrapper = document.getElementById("multiCanvasWrapper");
    const overlay = document.getElementById("messageOverlay");
    const overlayTitle = document.getElementById("overlayTitle");
    const startBtn = document.getElementById("startBtn");

    let isMultiplayer = false;
    let playerCount = 2;
    let gameRunning = false;
    let animationFrameId = null;
    let playerConfigs = [];
    let playersState = [];

    const playerColors = ["#ff4757", "#1e90ff", "#2ed573", "#ffa502"];

    function showToast(msg) {
        if (!toastNotification) return;
        toastNotification.innerText = msg;
        toastNotification.classList.remove("hidden");
        setTimeout(() => { toastNotification.classList.add("hidden"); }, 2000);
    }

    window.addEventListener("gamepadconnected", (e) => {
        showToast(`🎮 تم توصيل الذراع: ${e.gamepad.id.substring(0, 15)}...`);
        renderMultiSetup();
    });

    window.addEventListener("gamepaddisconnected", () => {
        showToast("⚠️ تم فصل ذراع التحكم");
        renderMultiSetup();
    });

    window.setPlayerCount = function (count) {
        playerCount = count;
        document.querySelectorAll('.count-btn').forEach(btn => btn.classList.remove('active'));
        if (count === 2) document.getElementById('btn2Players').classList.add('active');
        if (count === 3) document.getElementById('btn3Players').classList.add('active');
        if (count === 4) document.getElementById('btn4Players').classList.add('active');
        renderMultiSetup();
    };

    window.openMultiplayerSetup = function () {
        if (homeScreen) homeScreen.classList.add("hidden");
        if (multiSetupScreen) multiSetupScreen.classList.remove("hidden");
        renderMultiSetup();
    };

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
            `;

            gamepads.forEach((gp, idx) => {
                optionsHtml += `<option value="gamepad_${idx}" ${defaultCtrl === `gamepad_${idx}` ? 'selected' : ''}>ذراع تحكم ${idx + 1}</option>`;
            });

            card.innerHTML = `
                <h3 style="color: ${playerColors[i]}">اللاعب ${i + 1} 🎮</h3>
                <label style="font-size:12px;">جهاز التحكم:</label>
                <select class="setup-control-select" id="ctrlP${i}">${optionsHtml}</select>
            `;
            grid.appendChild(card);
        }
    }

    window.startMultiplayerGame = function () {
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
    };

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

            const pState = createPlayerState(i, canv);
            playersState.push(pState);

            // تفعيل حركة المضرب عن طريق اللمس والمؤشر مباشرة
            bindTouchAndMouseEvents(canv, pState);
        }
    }

    function bindTouchAndMouseEvents(canvas, pState) {
        const updatePaddle = (clientX) => {
            const rect = canvas.getBoundingClientRect();
            const touchX = clientX - rect.left;
            const ratio = canvas.width / rect.width;
            pState.paddleX = (touchX * ratio) - (pState.paddleWidth / 2);
        };

        canvas.addEventListener("touchmove", (e) => {
            if (e.touches.length > 0) {
                updatePaddle(e.touches[0].clientX);
            }
        }, { passive: true });

        canvas.addEventListener("mousemove", (e) => {
            updatePaddle(e.clientX);
        });
    }

    function createPlayerState(id, canvas) {
        const ctx = canvas.getContext("2d");
        const paddleWidth = 70, paddleHeight = 10;
        return {
            id, canvas, ctx,
            score: 0, lives: 3,
            x: canvas.width / 2, y: canvas.height - 30,
            dx: 3 * (Math.random() > 0.5 ? 1 : -1), dy: -4,
            paddleWidth, paddleHeight,
            paddleX: (canvas.width - paddleWidth) / 2,
            leftPressed: false, rightPressed: false,
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

    const keysDown = {};
    document.addEventListener("keydown", e => { keysDown[e.code] = true; });
    document.addEventListener("keyup", e => { keysDown[e.code] = false; });

    function updateInputs() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        playersState.forEach((p) => {
            const ctrl = playerConfigs[p.id].control;

            if (ctrl === "keys_ad") {
                if (keysDown["KeyA"]) p.paddleX -= 6;
                if (keysDown["KeyD"]) p.paddleX += 6;
            } else if (ctrl === "keys_arrows") {
                if (keysDown["ArrowLeft"]) p.paddleX -= 6;
                if (keysDown["ArrowRight"]) p.paddleX += 6;
            } else if (ctrl.startsWith("gamepad_")) {
                const gpIdx = parseInt(ctrl.split("_")[1]);
                const gp = gamepads[gpIdx];
                if (gp) {
                    if (gp.axes[0] < -0.3 || (gp.buttons[14] && gp.buttons[14].pressed)) p.paddleX -= 6;
                    if (gp.axes[0] > 0.3 || (gp.buttons[15] && gp.buttons[15].pressed)) p.paddleX += 6;
                }
            }

            // منع خروج المضرب خارج حدود الكانفاس
            if (p.paddleX < 0) p.paddleX = 0;
            if (p.paddleX > p.canvas.width - p.paddleWidth) p.paddleX = p.canvas.width - p.paddleWidth;
        });
    }

    function multiGameLoop() {
        if (!gameRunning) return;
        updateInputs();

        let activePlayers = 0, winnerIndex = -1;

        playersState.forEach((p) => {
            if (p.isDead) return;
            activePlayers++; winnerIndex = p.id;

            const ctx = p.ctx, canvas = p.canvas;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

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

                        if (p.x > bx && p.x < bx + brickWidth && p.y > by && p.y < by + brickHeight) {
                            p.dy = -p.dy; b.status = 0; p.score += 10;
                            document.getElementById(`tagP${p.id}`).innerText = `لاعب ${p.id + 1} | أرواح: ${p.lives} | نقاط: ${p.score}`;
                        }
                    }
                }
            }

            if (bricksLeft === 0) {
                gameRunning = false;
                showOverlay(`🎉 مبروك! اللاعب ${p.id + 1} هو الفائز!`, "تحدي جديد");
                return;
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
            ctx.fillStyle = playerColors[p.id];
            ctx.fill();
            ctx.closePath();

            ctx.beginPath();
            ctx.roundRect(p.paddleX, canvas.height - p.paddleHeight - 5, p.paddleWidth, p.paddleHeight, 4);
            ctx.fillStyle = "#ffffff";
            ctx.fill();
            ctx.closePath();

            if (p.x + p.dx > canvas.width - 7 || p.x + p.dx < 7) p.dx = -p.dx;
            if (p.y + p.dy < 7) p.dy = -p.dy;
            else if (p.y + p.dy > canvas.height - 12) {
                if (p.x > p.paddleX && p.x < p.paddleX + p.paddleWidth) {
                    p.dy = -Math.abs(p.dy);
                } else {
                    p.lives--;
                    document.getElementById(`tagP${p.id}`).innerText = `لاعب ${p.id + 1} | أرواح: ${p.lives} | نقاط: ${p.score}`;
                    if (p.lives <= 0) p.isDead = true;
                    else { p.x = canvas.width / 2; p.y = canvas.height - 30; p.dy = -4; }
                }
            }

            p.x += p.dx; p.y += p.dy;
        });

        if (activePlayers === 1 && playerCount > 1) {
            gameRunning = false;
            showOverlay(`👑 فاز اللاعب ${winnerIndex + 1} للصمود!`, "تحدي جديد");
            return;
        }

        animationFrameId = requestAnimationFrame(multiGameLoop);
    }

    function showOverlay(title, btnText) {
        if (overlayTitle) overlayTitle.innerText = title;
        if (startBtn) startBtn.innerText = btnText;
        if (overlay) overlay.classList.remove("hidden");
    }

    if (startBtn) {
        startBtn.addEventListener("click", () => {
            if (overlay) overlay.classList.add("hidden");
            gameRunning = true;
            if (isMultiplayer) animationFrameId = requestAnimationFrame(multiGameLoop);
        });
    }

    window.openGameMenu = () => { showToast("🎮 فتح التحدي الفردي"); };
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
        showToast("🌟 أهلاً بك في Samball!");
    });
})();
