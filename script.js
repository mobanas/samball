(function () {
    'use strict';

    // حماية التفاعل للحدث
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('keydown', e => {
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key)) || (e.ctrlKey && e.key === 'U')) {
            e.preventDefault();
        }
    });

    const homeScreen = document.getElementById("homeScreen");
    const levelMenuScreen = document.getElementById("levelMenuScreen");
    const gameScreen = document.getElementById("gameScreen");
    const shopScreen = document.getElementById("shopScreen");

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
    let equippedBall = localStorage.getItem('samball_ball') || 'ball_0';
    let ownedBalls = JSON.parse(localStorage.getItem('samball_owned_balls')) || ['ball_0'];
    let customImageBase64 = localStorage.getItem('samball_custom_img') || null;

    // توليد 100 كرة بخصائص وألوان مختلفة
    const ballsDatabase = Array.from({ length: 100 }, (_, i) => {
        const hue = (i * 137.5) % 360; // توليد ألوان متوازنة
        return {
            id: `ball_${i}`,
            name: i === 0 ? "الكرة الكلاسيكية" : `كرة طاقة #${i}`,
            price: i === 0 ? 0 : i * 50,
            color: `hsl(${hue}, 80%, 60%)`
        };
    });

    const speeds = {
        1: { dx: 3.5, dy: -4.5 },
        2: { dx: 4.5, dy: -6.0 },
        3: { dx: 6.0, dy: -8.0 },
        4: { dx: 7.5, dy: -10.5 },
        5: { dx: 9.5, dy: -13.0 }
    };

    const modeNames = {
        1: "المستوى 1: سهل 🟢",
        2: "المستوى 2: متوسط 🟡",
        3: "المستوى 3: صعب 🟠",
        4: "المستوى 4: احترافي 🔴",
        5: "المستوى 5: مستحيل 💀"
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
    let customBallImgObj = null;

    if (customImageBase64) {
        customBallImgObj = new Image();
        customBallImgObj.src = customImageBase64;
    }

    function updateCoinsDisplay() {
        if (gameCoinsEl) gameCoinsEl.innerText = coins;
        if (totalCoinsEl) totalCoinsEl.innerText = coins;
        localStorage.setItem('samball_coins', coins);
    }

    // --- نظام المتجر والـ 100 كرة ---
    function renderShop() {
        updateCoinsDisplay();
        const shopGrid = document.getElementById("shopGrid");
        if (!shopGrid) return;
        shopGrid.innerHTML = "";

        ballsDatabase.forEach(ball => {
            const isOwned = ownedBalls.includes(ball.id);
            const isEquipped = equippedBall === ball.id;

            const itemDiv = document.createElement("div");
            itemDiv.className = "shop-item";
            itemDiv.innerHTML = `
                <div class="item-preview" style="background-color: ${ball.color}; box-shadow: 0 0 8px ${ball.color}"></div>
                <h4>${ball.name}</h4>
                <p>${ball.price === 0 ? "مجاني" : ball.price + " 🪙"}</p>
                <button class="shop-btn ${isEquipped ? 'equipped' : ''}">${isEquipped ? 'مستخدم' : (isOwned ? 'تجهيز' : 'شراء')}</button>
            `;

            const btn = itemDiv.querySelector("button");
            btn.onclick = () => {
                if (isEquipped) return;
                if (isOwned) {
                    equipBall(ball.id);
                } else {
                    buyBall(ball.id, ball.price);
                }
            };

            shopGrid.appendChild(itemDiv);
        });

        // الصورة الشخصية
        if (customImageBase64) {
            const customPreview = document.getElementById("customPreview");
            const equipCustomBtn = document.getElementById("equipCustomBtn");
            if (customPreview && equipCustomBtn) {
                customPreview.style.backgroundImage = `url(${customImageBase64})`;
                customPreview.classList.remove("hidden");
                equipCustomBtn.classList.remove("hidden");
                if (equippedBall === 'custom') {
                    equipCustomBtn.innerText = "مستخدم حالياً";
                    equipCustomBtn.className = "shop-btn equipped";
                } else {
                    equipCustomBtn.innerText = "تجهيز كرتك الخاصة";
                    equipCustomBtn.className = "shop-btn";
                }
            }
        }
    }

    function buyBall(ballId, price) {
        if (coins >= price) {
            coins -= price;
            ownedBalls.push(ballId);
            equippedBall = ballId;
            localStorage.setItem('samball_owned_balls', JSON.stringify(ownedBalls));
            localStorage.setItem('samball_ball', equippedBall);
            renderShop();
            alert("🎉 تم الشراء والتجهيز بنجاح!");
        } else {
            alert("❌ لا تمتلك كوينز كافية! العب واجمع المزيد من النقاط.");
        }
    }

    function equipBall(ballId) {
        equippedBall = ballId;
        localStorage.setItem('samball_ball', equippedBall);
        renderShop();
    }

    window.handleCustomPhoto = function (e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (event) {
                customImageBase64 = event.target.result;
                localStorage.setItem('samball_custom_img', customImageBase64);

                customBallImgObj = new Image();
                customBallImgObj.src = customImageBase64;

                equipBall('custom');
            };
            reader.readAsDataURL(file);
        }
    };

    window.equipCustomBall = function () {
        equipBall('custom');
    };

    // --- الشاشات والمستويات ---
    function openGameMenu() {
        if (homeScreen) homeScreen.classList.add("hidden");
        if (levelMenuScreen) levelMenuScreen.classList.remove("hidden");
        renderLevels();
    }

    function openShopMenu() {
        if (homeScreen) homeScreen.classList.add("hidden");
        if (shopScreen) shopScreen.classList.remove("hidden");
        renderShop();
    }

    function backToHome() {
        gameRunning = false;
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        [levelMenuScreen, shopScreen, gameScreen].forEach(s => s && s.classList.add("hidden"));
        if (homeScreen) homeScreen.classList.remove("hidden");
        if (overlay) overlay.classList.add("hidden");
    }

    function renderLevels() {
        const container = document.querySelector(".difficulty-buttons");
        if (!container) return;
        container.innerHTML = "";

        for (let i = 1; i <= 5; i++) {
            const btn = document.createElement("button");
            const isUnlocked = i <= unlockedLevel;
            btn.className = `diff-btn level-${i} ${isUnlocked ? '' : 'locked'}`;
            btn.innerHTML = `
                <span class="diff-title">${modeNames[i]} ${isUnlocked ? '' : '🔒'}</span>
                <span class="diff-desc">${isUnlocked ? 'متاح للعب' : 'انقذ المستوى السابق للفتح'}</span>
            `;
            btn.onclick = () => {
                if (isUnlocked) startGame(i);
                else alert("🔒 هذا المستوى مقفل! يجب الفوز في المستوى السابق أولاً.");
            };
            container.appendChild(btn);
        }
    }

    function backToMenu() {
        gameRunning = false;
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        if (gameScreen) gameScreen.classList.add("hidden");
        if (levelMenuScreen) levelMenuScreen.classList.remove("hidden");
        renderLevels();
        if (overlay) overlay.classList.add("hidden");
    }

    // --- أحداث التحكم ---
    document.addEventListener("keydown", e => {
        if (e.key === "Right" || e.key === "ArrowRight") rightPressed = true;
        else if (e.key === "Left" || e.key === "ArrowLeft") leftPressed = true;
    });

    document.addEventListener("keyup", e => {
        if (e.key === "Right" || e.key === "ArrowRight") rightPressed = false;
        else if (e.key === "Left" || e.key === "ArrowLeft") leftPressed = false;
    });

    function getCanvasTouchPos(e) {
        if (!canvas) return NaN;
        let rect = canvas.getBoundingClientRect();
        let clientX = e.clientX || (e.touches && e.touches[0].clientX);
        return clientX ? (clientX - rect.left) * (canvas.width / rect.width) : NaN;
    }

    document.addEventListener("mousemove", e => {
        if (!canvas || !gameRunning) return;
        let pos = getCanvasTouchPos(e);
        if (!isNaN(pos)) paddleX = Math.max(0, Math.min(canvas.width - paddleWidth, pos - paddleWidth / 2));
    });

    if (canvas) {
        canvas.addEventListener("touchmove", e => {
            if (!gameRunning) return;
            let pos = getCanvasTouchPos(e);
            if (!isNaN(pos)) paddleX = Math.max(0, Math.min(canvas.width - paddleWidth, pos - paddleWidth / 2));
            e.preventDefault();
        }, { passive: false });
    }

    // --- منطق اللعبة ---
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
        const spd = speeds[currentDifficulty];
        dx = spd.dx * (Math.random() > 0.5 ? 1 : -1);
        dy = spd.dy;
        paddleX = (canvas.width - paddleWidth) / 2;
    }

    function collisionDetection() {
        for (let c = 0; c < brickColumnCount; c++) {
            for (let r = 0; r < brickRowCount; r++) {
                let b = bricks[c][r];
                if (b.status === 1) {
                    if (x > b.x && x < b.x + brickWidth && y > b.y && y < b.y + brickHeight) {
                        dy = -dy;
                        b.status = 0;
                        score += 10 * currentDifficulty;
                        coins += currentDifficulty;
                        if (scoreEl) scoreEl.innerText = score;
                        updateCoinsDisplay();

                        if (checkWin()) {
                            gameRunning = false;
                            if (currentDifficulty >= unlockedLevel && unlockedLevel < 5) {
                                unlockedLevel = currentDifficulty + 1;
                                localStorage.setItem('samball_unlocked', unlockedLevel);
                            }
                            showOverlay("🎉 أحسنت! انتصرت في هذا المستوى!", "المستوى التالي / إعاده");
                        }
                    }
                }
            }
        }
    }

    function checkWin() {
        return bricks.every(col => col.every(b => b.status === 0));
    }

    // العقوبة الواقعية: تصفير الكوينز والكور المشتراة عند الخسارة
    function resetPlayerAccountOnLoss() {
        coins = 0;
        equippedBall = 'ball_0';
        ownedBalls = ['ball_0'];
        localStorage.setItem('samball_coins', 0);
        localStorage.setItem('samball_ball', 'ball_0');
        localStorage.setItem('samball_owned_balls', JSON.stringify(['ball_0']));
        updateCoinsDisplay();
    }

    function drawBall() {
        if (!ctx) return;
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, ballRadius, 0, Math.PI * 2);

        if (equippedBall === 'custom' && customBallImgObj) {
            ctx.clip();
            ctx.drawImage(customBallImgObj, x - ballRadius, y - ballRadius, ballRadius * 2, ballRadius * 2);
        } else {
            const currentBallObj = ballsDatabase.find(b => b.id === equippedBall) || ballsDatabase[0];
            ctx.fillStyle = currentBallObj.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = currentBallObj.color;
            ctx.fill();
        }

        ctx.closePath();
        ctx.restore();
    }

    function drawPaddle() {
        if (!ctx || !canvas) return;
        ctx.beginPath();
        ctx.roundRect(paddleX, canvas.height - paddleHeight - 8, paddleWidth, paddleHeight, 6);
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
                    ctx.roundRect(brickX, brickY, brickWidth, brickHeight, 4);
                    ctx.fillStyle = brickColors[r % brickColors.length];
                    ctx.fill();
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

        if (x + dx > canvas.width - ballRadius || x + dx < ballRadius) dx = -dx;
        if (y + dy < ballRadius) dy = -dy;
        else if (y + dy > canvas.height - ballRadius - 5) {
            if (x > paddleX && x < paddleX + paddleWidth) {
                let hitPoint = x - (paddleX + paddleWidth / 2);
                dx = hitPoint * 0.2;
                dy = -Math.abs(speeds[currentDifficulty].dy);
            } else {
                lives--;
                if (livesEl) livesEl.innerText = lives;
                if (lives <= 0) {
                    gameRunning = false;
                    resetPlayerAccountOnLoss(); // تصفير الكوينز والكور المشتراة
                    showOverlay("💥 خصرت اللعبة! فقدت كل رصيدك وكورك المشتراة!", "حاول مجدداً من جديد");
                    return;
                } else {
                    resetBallAndPaddle();
                }
            }
        }

        if (rightPressed && paddleX < canvas.width - paddleWidth) paddleX += 8;
        else if (leftPressed && paddleX > 0) paddleX -= 8;

        x += dx;
        y += dy;
        animationFrameId = requestAnimationFrame(draw);
    }

    function showOverlay(title, btnText) {
        if (overlayTitle) overlayTitle.innerText = title;
        if (overlayText) overlayText.innerText = `النقاط: ${score} | الأرواح المتبقية: ${lives}`;
        if (startBtn) startBtn.innerText = btnText;
        if (overlay) overlay.classList.remove("hidden");
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

    document.addEventListener("DOMContentLoaded", () => {
        updateCoinsDisplay();
    });
})();
