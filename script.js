(function () {
    'use strict';

    // --- 🔒 طبقة الحماية القصوى ضد الـ Console والـ DevTools ---
    document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
    });

    document.addEventListener('keydown', function (e) {
        if (
            e.key === 'F12' ||
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
            (e.ctrlKey && e.key === 'U')
        ) {
            e.preventDefault();
        }
    });

    document.addEventListener('touchmove', function (e) {
        if (e.scale !== 1) { return; }
        if (e.target.closest('#gameCanvas')) {
            return;
        }
        e.preventDefault();
    }, { passive: false });

    // العناصر الرئيسية للواجهات
    const homeScreen = document.getElementById("homeScreen");
    const levelMenuScreen = document.getElementById("levelMenuScreen");
    const gameScreen = document.getElementById("gameScreen");
    const shopScreen = document.getElementById("shopScreen");
    const celebrationScreen = document.getElementById("celebrationScreen");

    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas ? canvas.getContext("2d") : null;

    const scoreEl = document.getElementById("score");
    const livesEl = document.getElementById("lives");
    const gameCoinsEl = document.getElementById("gameCoins");
    const totalCoinsEl = document.getElementById("totalCoins");
    const currentModeTitle = document.getElementById("currentModeTitle");

    const overlay = document.getElementById("messageOverlay");
    const overlayTitle = document.getElementById("overlayTitle");
    const overlayText = document.getElementById("overlayText");
    const startBtn = document.getElementById("startBtn");

    let score = 0;
    let lives = 3;
    let coins = localStorage.getItem('samball_coins') ? parseInt(localStorage.getItem('samball_coins')) : 0;
    let currentDifficulty = 1; 
    let gameRunning = false;
    let animationFrameId = null;

    let unlockedLevel = localStorage.getItem('samball_unlocked') ? parseInt(localStorage.getItem('samball_unlocked')) : 1;

    let equippedBall = localStorage.getItem('samball_ball') || 'default';
    let ownedBalls = JSON.parse(localStorage.getItem('samball_owned_balls')) || ['default'];

    const speeds = {
        1: { dx: 4,   dy: -5 },
        2: { dx: 5,   dy: -7 },
        3: { dx: 7,   dy: -10 },
        4: { dx: 9,   dy: -15 },
        5: { dx: 25,  dy: -100 }
    };

    const modeNames = {
        1: "القسم السهل",
        2: "القسم المتوسط",
        3: "القسم الصعب",
        4: "الصعب جداً",
        5: "المستوى المستحيل (اكسب 100$ 💵)"
    };

    let x = canvas ? canvas.width / 2 : 0;
    let y = canvas ? canvas.height - 40 : 0;
    let dx = 4;
    let dy = -5;
    const ballRadius = 9;

    const paddleHeight = 14;
    const paddleWidth = 90;
    let paddleX = canvas ? (canvas.width - paddleWidth) / 2 : 0;

    let rightPressed = false;
    let leftPressed = false;
    let ballTrail = [];

    // --- التنقل بين الشاشات ---
    function openGameMenu() {
        if (homeScreen) homeScreen.classList.add("hidden");
        if (levelMenuScreen) levelMenuScreen.classList.remove("hidden");
        updateLevelButtons();
    }

    function backToHome() {
        gameRunning = false;
        if (animationFrameId) cancelAnimationFrame(animationFrameId);

        if (levelMenuScreen) levelMenuScreen.classList.add("hidden");
        if (shopScreen) shopScreen.classList.add("hidden");
        if (gameScreen) gameScreen.classList.add("hidden");
        if (celebrationScreen) celebrationScreen.classList.add("hidden");
        if (homeScreen) homeScreen.classList.remove("hidden");
        
        if (overlay) overlay.classList.add("hidden");
    }

    function openShopMenu() {
        if (homeScreen) homeScreen.classList.add("hidden");
        if (shopScreen) shopScreen.classList.remove("hidden");
        updateShopUI();
    }

    function updateCoinsDisplay() {
        if (gameCoinsEl) gameCoinsEl.innerText = coins;
        if (totalCoinsEl) totalCoinsEl.innerText = coins;
        localStorage.setItem('samball_coins', coins);
    }

    function updateShopUI() {
        updateCoinsDisplay();
        
        ['default', 'fire', 'neon', 'devil'].forEach(ballType => {
            const itemContainer = document.getElementById(`item-${ballType}`);
            if (!itemContainer) return;
            
            const btn = itemContainer.querySelector(".shop-btn");
            if (!btn) return;

            if (equippedBall === ballType) {
                btn.innerText = "مستخدم حالياً";
                btn.className = "shop-btn equipped";
                btn.onclick = null;
            } else if (ownedBalls.includes(ballType)) {
                btn.innerText = "تجهيز";
                btn.className = "shop-btn";
                btn.onclick = () => equipItem(ballType);
            } else {
                btn.innerText = "شراء";
                btn.className = "shop-btn";
                let price = ballType === 'fire' ? 150 : (ballType === 'neon' ? 300 : 500);
                btn.onclick = () => buyItem(ballType, price);
            }
        });
    }

    function buyItem(ballType, price) {
        if (ownedBalls.includes(ballType)) {
            equipItem(ballType);
            return;
        }

        if (coins >= price) {
            coins -= price;
            ownedBalls.push(ballType);
            equippedBall = ballType;
            
            localStorage.setItem('samball_owned_balls', JSON.stringify(ownedBalls));
            localStorage.setItem('samball_ball', equippedBall);
            
            updateShopUI();
            alert("🎉 تم الشراء والتجهيز بنجاح!");
        } else {
            alert("❌ لا تمتلك نقاط كافية للشراء!");
        }
    }

    function equipItem(ballType) {
        if (ownedBalls.includes(ballType)) {
            equippedBall = ballType;
            localStorage.setItem('samball_ball', equippedBall);
            updateShopUI();
        }
    }

    function updateLevelButtons() {
        for (let i = 1; i <= 5; i++) {
            let btn = document.getElementById(`btn-level-${i}`);
            if (!btn) {
                createLevelButtonInDom(i);
                btn = document.getElementById(`btn-level-${i}`);
            }
            if (btn) {
                if (i <= unlockedLevel) {
                    btn.classList.remove("locked");
                    let lockIcon = btn.querySelector(".lock-icon");
                    if (lockIcon) lockIcon.style.display = "none";
                } else {
                    btn.classList.add("locked");
                }
            }
        }
    }

    function createLevelButtonInDom(i) {
        let container = document.querySelector(".difficulty-buttons");
        if (!container) return;
        if (document.getElementById(`btn-level-${i}`)) return;

        let btn = document.createElement("button");
        btn.className = `diff-btn ${i === 5 ? 'impossible' : (i === 4 ? 'extreme' : (i === 3 ? 'hard' : (i === 2 ? 'medium' : 'easy')))}`;
        btn.id = `btn-level-${i}`;
        btn.onclick = () => selectLevel(i);
        
        let titleText = i === 5 ? "المستوى المستحيل (اكسب 100$ 💵) <span class='lock-icon'>🔒</span>" : (i === 4 ? "الصعب جداً 🔴 <span class='lock-icon'>🔒</span>" : (i === 3 ? "القسم الصعب 🟠 <span class='lock-icon'>🔒</span>" : (i === 2 ? "القسم المتوسط 🟡 <span class='lock-icon'>🔒</span>" : "القسم السهل 🟢")));
        let descText = i === 5 ? "صعب جنوني وسريع جداً! (مقلب الـ 100$ 😂)" : "تحدي جديد وسرعة أعلى";
        
        btn.innerHTML = `
            <span class="diff-title">${titleText}</span>
            <span class="diff-desc">${descText}</span>
        `;
        container.appendChild(btn);
    }

    function selectLevel(diff) {
        if (diff > unlockedLevel) {
            alert("🔒 هذا المستوى مقفل! يجب عليك إنهاء المستويات السابقة أولاً لتفتحه.");
            return;
        }

        if (diff === 5) {
            alert("⚠️ تحذير: هذا المستوى مستحيل بجنون والكرة بسرعة 100! إذا فزت هتاخد الـ 100$ بجد (وده مش هيحصل أبداً 😂). بالتوفيق يا أسطورة!");
        }

        startGame(diff);
    }

    function backToMenu() {
        gameRunning = false;
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        
        if (gameScreen) gameScreen.classList.add("hidden");
        if (celebrationScreen) celebrationScreen.classList.add("hidden");
        if (levelMenuScreen) levelMenuScreen.classList.remove("hidden");
        updateLevelButtons();
        
        if (overlay) overlay.classList.add("hidden");
    }

    document.addEventListener("keydown", (e) => {
        if (e.key === "Right" || e.key === "ArrowRight") rightPressed = true;
        else if (e.key === "Left" || e.key === "ArrowLeft") leftPressed = true;
    });

    document.addEventListener("keyup", (e) => {
        if (e.key === "Right" || e.key === "ArrowRight") rightPressed = false;
        else if (e.key === "Left" || e.key === "ArrowLeft") leftPressed = false;
    });

    function getCanvasTouchPos(e) {
        if (!canvas) return NaN;
        let rect = canvas.getBoundingClientRect();
        let clientX = e.clientX;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
        }
        if (clientX === undefined) return NaN;
        let scaleX = canvas.width / rect.width;
        return (clientX - rect.left) * scaleX;
    }

    document.addEventListener("mousemove", (e) => {
        if (!canvas || !gameRunning) return;
        let relativeX = getCanvasTouchPos(e);
        if (!isNaN(relativeX)) {
            let targetPaddleX = relativeX - paddleWidth / 2;
            if (currentDifficulty === 5) {
                paddleX += (targetPaddleX - paddleX) * 0.15; 
            } else {
                paddleX = targetPaddleX;
            }
            if (paddleX < 0) paddleX = 0;
            if (paddleX > canvas.width - paddleWidth) paddleX = canvas.width - paddleWidth;
        }
    });

    if (canvas) {
        canvas.addEventListener("touchmove", (e) => {
            if (!gameRunning) return;
            let touchX = getCanvasTouchPos(e);
            if (!isNaN(touchX)) {
                let targetPaddleX = touchX - paddleWidth / 2;
                if (currentDifficulty === 5) {
                    paddleX += (targetPaddleX - paddleX) * 0.15; 
                } else {
                    paddleX = targetPaddleX;
                }
                if (paddleX < 0) paddleX = 0;
                if (paddleX > canvas.width - paddleWidth) paddleX = canvas.width - paddleWidth;
            }
            e.preventDefault();
        }, { passive: false });
    }

    const brickRowCount = 5;
    const brickColumnCount = 7;
    const brickWidth = 72;
    const brickHeight = 22;
    const brickPadding = 10;
    const brickOffsetTop = 35;
    const brickOffsetLeft = 27;

    let bricks = [];
    function initBricks() {
        bricks = [];
        for (let c = 0; c < brickColumnCount; c++) {
            bricks[c] = [];
            for (let r = 0; r < brickRowCount; r++) {
                bricks[c][r] = { x: 0, y: 0, status: 1 };
            }
        }
    }

    function startGame(diff) {
        currentDifficulty = diff;
        if (levelMenuScreen) levelMenuScreen.classList.add("hidden");
        if (gameScreen) gameScreen.classList.remove("hidden");
        if (currentModeTitle) currentModeTitle.innerText = modeNames[diff];
        
        score = 0;
        lives = 3;
        if (scoreEl) scoreEl.innerText = score;
        if (livesEl) livesEl.innerText = lives;
        updateCoinsDisplay();

        initBricks();
        resetBallAndPaddle();
        showOverlay(modeNames[diff], "ابدأ اللعب الآن");
    }

    function resetBallAndPaddle() {
        if (!canvas) return;
        x = canvas.width / 2;
        y = canvas.height - 40;
        const baseSpeed = speeds[currentDifficulty];
        
        let direction = Math.random() > 0.5 ? 1 : -1;
        dx = baseSpeed.dx * direction;
        dy = baseSpeed.dy;
        
        paddleX = (canvas.width - paddleWidth) / 2;
        ballTrail = [];
    }

    function collisionDetection() {
        for (let c = 0; c < brickColumnCount; c++) {
            for (let r = 0; r < brickRowCount; r++) {
                let b = bricks[c][r];
                if (b.status === 1) {
                    if (x > b.x && x < b.x + brickWidth && y > b.y && y < b.y + brickHeight) {
                        dy = -dy;
                        b.status = 0;
                        
                        let addedScore = 10 * currentDifficulty;
                        score += addedScore;
                        coins += currentDifficulty;
                        
                        if (scoreEl) scoreEl.innerText = score;
                        updateCoinsDisplay();
                        
                        if (checkWin()) {
                            gameRunning = false;
                            
                            if (currentDifficulty >= unlockedLevel && unlockedLevel < 5) {
                                unlockedLevel = currentDifficulty + 1;
                                localStorage.setItem('samball_unlocked', unlockedLevel);
                            }

                            if (currentDifficulty === 5) {
                                showCelebrationScreen();
                            } else {
                                showOverlay("أنت بطل أسطوري! فزت بكل الطوب!", "المستوى التالي / إعادة");
                            }
                        }
                    }
                }
            }
        }
    }

    function checkWin() {
        for (let c = 0; c < brickColumnCount; c++) {
            for (let r = 0; r < brickRowCount; r++) {
                if (bricks[c][r].status === 1) return false;
            }
        }
        return true;
    }

    function drawBall() {
        if (!ctx) return;

        if (equippedBall === 'devil') {
            ballTrail.push({ x: x, y: y });
            if (ballTrail.length > 8) ballTrail.shift();

            for (let i = 0; i < ballTrail.length; i++) {
                let p = ballTrail[i];
                ctx.beginPath();
                ctx.arc(p.x, p.y, ballRadius * (i / ballTrail.length), 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 0, 85, ${i / ballTrail.length})`;
                ctx.fill();
                ctx.closePath();
            }
        }

        ctx.beginPath();
        ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
        
        if (equippedBall === 'devil') {
            let gradient = ctx.createRadialGradient(x, y, 2, x, y, ballRadius);
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(0.5, '#ff0055');
            gradient.addColorStop(1, '#7a00ff');
            ctx.fillStyle = gradient;
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#ff0055';
        } else if (equippedBall === 'fire') {
            ctx.fillStyle = "#ff7f50";
            ctx.shadowBlur = 15;
            ctx.shadowColor = "#ffa502";
        } else if (equippedBall === 'neon') {
            ctx.fillStyle = "#00f2fe";
            ctx.shadowBlur = 15;
            ctx.shadowColor = "#00f2fe";
        } else {
            ctx.fillStyle = currentDifficulty === 5 ? "#ffd700" : "#ff4757";
            ctx.shadowBlur = 10;
            ctx.shadowColor = currentDifficulty === 5 ? "#ffd700" : "#ff4757";
        }

        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.closePath();
    }

    function drawPaddle() {
        if (!ctx || !canvas) return;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(paddleX, canvas.height - paddleHeight - 8, paddleWidth, paddleHeight, 6);
        } else {
            ctx.rect(paddleX, canvas.height - paddleHeight - 8, paddleWidth, paddleHeight);
        }
        ctx.fillStyle = "#2ed573";
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#2ed573";
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.closePath();
    }

    const brickColors = ["#ff4757", "#ffa502", "#2ed573", "#1e90ff", "#9b59b6"];

    function drawBricks() {
        if (!ctx) return;
        for (let c = 0; c < brickColumnCount; c++) {
            for (let r = 0; r < brickRowCount; r++) {
                if (bricks[c][r].status === 1) {
                    let brickX = (c * (brickWidth + brickPadding)) + brickOffsetLeft;
                    let brickY = (r * (brickHeight + brickPadding)) + brickOffsetTop;
                    bricks[c][r].x = brickX;
                    bricks[c][r].y = brickY;
                    ctx.beginPath();
                    if (ctx.roundRect) {
                        ctx.roundRect(brickX, brickY, brickWidth, brickHeight, 4);
                    } else {
                        ctx.rect(brickX, brickY, brickWidth, brickHeight);
                    }
                    ctx.fillStyle = brickColors[r % brickColors.length];
                    ctx.fill();
                    ctx.strokeStyle = "rgba(255,255,255,0.2)";
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    ctx.closePath();
                }
            }
        }
    }

    function draw() {
        if (!gameRunning || !ctx || !canvas) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBricks();
        drawBall();
        drawPaddle();
        collisionDetection();

        if (x + dx > canvas.width - ballRadius || x + dx < ballRadius) {
            dx = -dx;
        }
        
        if (y + dy < ballRadius) {
            dy = -dy;
        } 
        else if (y + dy > canvas.height - ballRadius - 5) {
            if (x > paddleX && x < paddleX + paddleWidth) {
                let hitPoint = x - (paddleX + paddleWidth / 2);
                let currentSpeed = speeds[currentDifficulty];
                
                let newDx = hitPoint * 0.2 * (Math.abs(currentSpeed.dy) / 5);
                let minDx = 2.5;
                if (Math.abs(newDx) < minDx) {
                    newDx = newDx >= 0 ? minDx : -minDx;
                }

                dx = newDx;
                dy = -Math.abs(currentSpeed.dy);
            } else {
                lives--;
                if (livesEl) livesEl.innerText = lives;
                if (lives <= 0) {
                    gameRunning = false;
                    showOverlay("انتهت اللعبة! مع السلامة الـ 100$ 😂", "حاول مجدداً");
                    return;
                } else {
                    resetBallAndPaddle();
                }
            }
        }

        let keyboardPaddleSpeed = currentDifficulty === 5 ? 5 : 10;

        if (rightPressed && paddleX < canvas.width - paddleWidth) {
            paddleX += keyboardPaddleSpeed;
        } else if (leftPressed && paddleX > 0) {
            paddleX -= keyboardPaddleSpeed;
        }

        x += dx;
        y += dy;
        animationFrameId = requestAnimationFrame(draw);
    }

    function showOverlay(title, btnText) {
        if (overlayTitle) overlayTitle.innerText = title;
        if (overlayText) overlayText.innerText = `النقاط الحالية: ${score} | الأرواح: ${lives}`;
        if (startBtn) startBtn.innerText = btnText;
        if (overlay) overlay.classList.remove("hidden");
    }

    function showCelebrationScreen() {
        if (gameScreen) gameScreen.classList.add("hidden");
        if (celebrationScreen) celebrationScreen.classList.remove("hidden");
    }

    if (startBtn) {
        startBtn.addEventListener("click", () => {
            if (overlay) overlay.classList.add("hidden");
            score = 0;
            lives = 3;
            if (scoreEl) scoreEl.innerText = score;
            if (livesEl) livesEl.innerText = lives;
            initBricks();
            resetBallAndPaddle();
            gameRunning = true;
            draw();
        });
    }

    window.openGameMenu = openGameMenu;
    window.backToHome = backToHome;
    window.openShopMenu = openShopMenu;
    window.backToMenu = backToMenu;
    window.selectLevel = selectLevel;
    window.buyItem = buyItem;
    window.equipItem = equipItem;

    document.addEventListener("DOMContentLoaded", () => {
        updateLevelButtons();
        updateCoinsDisplay();
    });

})();
