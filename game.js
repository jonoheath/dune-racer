// --- 1. SETUP ---
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// --- 1.5 LOAD ASSETS ---
const carSprite = new Image();
carSprite.src = 'car.png'; 

const boggedCarSprite = new Image();
boggedCarSprite.src = 'bogged_car.png'; 

const surferSprite = new Image();
surferSprite.src = 'surfer.png'; 

const rockSprite = new Image();
rockSprite.src = 'rock.png'; 

const personSprite = new Image();
personSprite.src = 'person.png'; 

const frameWidth = 128; 
const frameHeight = 128;
const drawScale = 1.0; 

// --- 1.6 GENERATE PIXEL ART SAND TILE ---
const sandTile = document.createElement('canvas');
sandTile.width = 32;
sandTile.height = 32;
const sCtx = sandTile.getContext('2d');

sCtx.fillStyle = "#e3c16f";
sCtx.fillRect(0, 0, 32, 32);
for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
        let noise = Math.random();
        let wave = Math.sin(x * 0.3) * 3 + y; 
        if (wave % 16 < 4 && noise > 0.4) { sCtx.fillStyle = "#f0d494"; sCtx.fillRect(x, y, 1, 1); }
        else if (wave % 16 > 12 && noise > 0.4) { sCtx.fillStyle = "#c9a657"; sCtx.fillRect(x, y, 1, 1); }
        else if (noise > 0.85) { sCtx.fillStyle = "#d6b463"; sCtx.fillRect(x, y, 1, 1); }
    }
}

// --- 2. GAME WORLD & STATE ---
const WORLD_HEIGHT = 4000; 
let currentPhase = "CLIMBING"; 
let cameraY = 0; 

let bogBlobs = []; 
let rocks = [];
let spectators = [];
let surfers = [];

// --- 2.5 TIMER, LEADERBOARD, & NAME ENTRY SETUP ---
let startTime = Date.now();
let finalTime = 0;
let leaderboard = [];

let isEnteringName = false;
let playerName = [65, 65, 65]; 
let nameIndex = 0; 

try {
    let saved = localStorage.getItem("duneLeaderboardV2");
    if (saved) leaderboard = JSON.parse(saved);
} catch(e) { console.log("Could not load leaderboard"); }

function formatTime(ms) {
    let totalSeconds = Math.floor(ms / 1000);
    let minutes = Math.floor(totalSeconds / 60);
    let seconds = totalSeconds % 60;
    let milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
}

function saveScore(name, time) {
    leaderboard.push({ name: name, time: time });
    leaderboard.sort((a, b) => a.time - b.time); 
    leaderboard = leaderboard.slice(0, 5); 
    try {
        localStorage.setItem("duneLeaderboardV2", JSON.stringify(leaderboard));
    } catch(e) {}
}

// --- 3. THE PLAYER'S CAR ---
let car = {
    x: canvas.width / 2,     
    y: WORLD_HEIGHT - 100,   
    speed: 0,
    maxSpeed: 6.5,           
    acceleration: 0.16,      
    friction: 0.04,          
    angle: -Math.PI / 2,     
    turnSpeed: 0.05,         
    width: frameWidth * drawScale,
    height: frameHeight * drawScale,
    inBog: false,
    uiMessage: ""         
};

// --- 3.5 GENERATE ENVIRONMENT ---
function generateEnvironment(phase) {
    bogBlobs = []; rocks = []; spectators = []; surfers = [];
    let numBlobs = phase === "CLIMBING" ? 40 : 90; 
    
    for (let i = 0; i < numBlobs; i++) {
        bogBlobs.push({
            x: Math.random() * canvas.width,
            y: Math.random() * (WORLD_HEIGHT - 400) + 200, 
            radius: Math.random() * 50 + 30 
        });
    }

    for (let i = 0; i < 30; i++) {
        rocks.push({
            x: Math.random() * canvas.width,
            y: Math.random() * (WORLD_HEIGHT - 400) + 200, 
            size: Math.random() * 15 + 15 
        });
    }

    for (let i = 0; i < 15; i++) {
        let xPos = Math.random() > 0.5 ? Math.random() * 100 : canvas.width - 70 - Math.random() * 100;
        spectators.push({
            x: xPos,
            y: Math.random() * (WORLD_HEIGHT - 400) + 200, 
            offset: Math.random() * 1000 
        });
    }

    if (phase === "CLIMBING") {
        for (let i = 0; i < 10; i++) {
            surfers.push({
                x: Math.random() * canvas.width,
                y: Math.random() * WORLD_HEIGHT, 
                speed: Math.random() * 2 + 3,    
                carvePhase: Math.random() * Math.PI * 2 
            });
        }
    }
}
generateEnvironment("CLIMBING");

// --- 4. KEYBOARD CONTROLS ---
const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };

window.addEventListener("keydown", function(e) {
    if (isEnteringName) {
        if (e.code === "ArrowUp") {
            playerName[nameIndex] = playerName[nameIndex] >= 90 ? 65 : playerName[nameIndex] + 1;
        } else if (e.code === "ArrowDown") {
            playerName[nameIndex] = playerName[nameIndex] <= 65 ? 90 : playerName[nameIndex] - 1;
        } else if (e.code === "ArrowRight") {
            if (nameIndex < 2) nameIndex++;
        } else if (e.code === "ArrowLeft") {
            if (nameIndex > 0) nameIndex--;
        } else if (e.code === "Enter") {
            let finalName = String.fromCharCode(playerName[0], playerName[1], playerName[2]);
            saveScore(finalName, finalTime);
            isEnteringName = false; 
        }
        return; 
    }

    if (keys.hasOwnProperty(e.code)) { keys[e.code] = true; e.preventDefault(); }
    
    if (e.code === "KeyR" && currentPhase === "FINISHED" && !isEnteringName) {
        resetGame();
    }
});

window.addEventListener("keyup", function(e) {
    if (keys.hasOwnProperty(e.code)) { keys[e.code] = false; }
});

function resetGame() {
    currentPhase = "CLIMBING";
    car.x = canvas.width / 2;
    car.y = WORLD_HEIGHT - 100;
    car.speed = 0;
    car.angle = -Math.PI / 2;
    startTime = Date.now(); 
    generateEnvironment("CLIMBING");
}

function getSpriteIndex(angle) {
    let normalizedAngle = angle + (Math.PI * 4); 
    let slice = Math.PI / 4; 
    return Math.round(normalizedAngle / slice) % 8; 
}

// --- 5. THE MATH & PHYSICS (UPDATE) ---
function update() {
    if (currentPhase === "FINISHED") return; 

    car.inBog = false; 
    car.uiMessage = "";
    let currentMaxSpeed = car.maxSpeed;
    let currentFriction = car.friction;

    for (let blob of bogBlobs) {
        let dx = car.x - blob.x;
        let dy = car.y - blob.y;
        if (Math.sqrt(dx*dx + dy*dy) < blob.radius * 0.8) {
            car.inBog = true;
            let absoluteSpeed = Math.abs(car.speed);
            if (absoluteSpeed >= 5.5) {
                car.uiMessage = "PLOWING THROUGH!";
                currentFriction = car.friction * 3; 
            } else if (absoluteSpeed >= 4.0) {
                car.uiMessage = "LOSING MOMENTUM...";
                currentFriction = car.friction * 6;
            } else {
                car.uiMessage = "BOGGED DOWN!";
                currentMaxSpeed = 2.0; 
                currentFriction = car.friction * 12; 
            }
        }
    }

    for (let rock of rocks) {
        let dx = car.x - rock.x;
        let dy = car.y - rock.y;
        if (Math.sqrt(dx*dx + dy*dy) < rock.size + 15) {
            car.speed = -1; 
            car.uiMessage = "CRASHED INTO ROCK!";
        }
    }

    for (let spec of spectators) {
        let dx = car.x - (spec.x + 32); 
        let dy = car.y - (spec.y + 24);
        if (Math.sqrt(dx*dx + dy*dy) < 35) {
            car.speed = -1; 
            car.uiMessage = "WATCH THE BOGGED CARS!";
        }
    }

    for (let surfer of surfers) {
        surfer.y += surfer.speed; 
        surfer.carvePhase += 0.05; 
        surfer.x += Math.sin(surfer.carvePhase) * 2; 

        if (surfer.y > cameraY + canvas.height + 100) {
            surfer.y = cameraY - 100;
            surfer.x = Math.random() * canvas.width;
        }

        let dx = car.x - surfer.x;
        let dy = car.y - surfer.y;
        if (Math.sqrt(dx*dx + dy*dy) < 25) {
            car.speed *= 0.8; 
            car.uiMessage = "DODGE THE SURFERS!";
        }
    }

    let gravityForce = currentPhase === "CLIMBING" ? 0.08 : 0.05;
    car.speed += Math.sin(car.angle) * gravityForce;

    if (keys.ArrowUp) car.speed += car.acceleration;
    else if (keys.ArrowDown) car.speed -= car.acceleration;
    else {
        if (car.speed > 0) car.speed -= currentFriction;
        if (car.speed < 0) car.speed += currentFriction;
        if (Math.abs(car.speed) < currentFriction) car.speed = 0;
    }

    if (car.speed > currentMaxSpeed && !car.inBog) car.speed = currentMaxSpeed;
    if (car.inBog && car.speed > currentMaxSpeed) {
        if (currentMaxSpeed === 2.0) car.speed = 2.0; 
    }
    if (car.speed < -currentMaxSpeed / 2) car.speed = -currentMaxSpeed / 2;

    if (Math.abs(car.speed) > 0.5) {
        let steerDirection = car.speed > 0 ? 1 : -1; 
        if (keys.ArrowLeft) car.angle -= car.turnSpeed * steerDirection;
        if (keys.ArrowRight) car.angle += car.turnSpeed * steerDirection;
    }

    car.x += Math.cos(car.angle) * car.speed;
    car.y += Math.sin(car.angle) * car.speed;

    if (car.x < 20) car.x = 20;
    if (car.x > canvas.width - 20) car.x = canvas.width - 20;

    if (currentPhase === "CLIMBING") {
        if (car.y <= 0) {
            currentPhase = "DESCENDING";
            car.y = 0;
            car.angle = Math.PI / 2; 
            car.speed = 0; 
            generateEnvironment("DESCENDING"); 
        }
    } 
    else if (currentPhase === "DESCENDING") {
        if (car.y >= WORLD_HEIGHT) {
            currentPhase = "FINISHED";
            car.speed = 0;
            finalTime = Date.now() - startTime;
            isEnteringName = true;
            playerName = [65, 65, 65]; 
            nameIndex = 0;
        }
    }

    cameraY = car.y - (canvas.height / 2);
    if (cameraY < -50) cameraY = -50;
    if (cameraY > WORLD_HEIGHT - canvas.height + 50) cameraY = WORLD_HEIGHT - canvas.height + 50;
}

// --- 6. THE ART (DRAW) ---
function draw() {
    ctx.imageSmoothingEnabled = false; 
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(0, -cameraY); 

    // 1. Base Sand
    let pattern = ctx.createPattern(sandTile, 'repeat');
    let matrix = new DOMMatrix();
    matrix.scaleSelf(6, 6); 
    pattern.setTransform(matrix);
    ctx.fillStyle = pattern;
    ctx.fillRect(0, -100, canvas.width, WORLD_HEIGHT + 200);

    // 2. Bog Blobs
    ctx.fillStyle = "rgba(100, 70, 30, 0.6)"; 
    const chunkSize = 12; 
    for (let blob of bogBlobs) {
        ctx.save();
        ctx.translate(blob.x, blob.y);
        ctx.globalCompositeOperation = "multiply"; 
        let wChunks = Math.floor(blob.radius / chunkSize);
        let hChunks = Math.floor((blob.radius * 0.8) / chunkSize); 
        for (let x = -wChunks; x <= wChunks; x++) {
            for (let y = -hChunks; y <= hChunks; y++) {
                if ((x * x) / (wChunks * wChunks) + (y * y) / (hChunks * hChunks) <= 1) {
                    ctx.fillRect(x * chunkSize, y * chunkSize, chunkSize, chunkSize);
                }
            }
        }
        ctx.restore();
    }

    // 3. Custom Rock Sprites
    for (let rock of rocks) {
        if (rockSprite.complete) {
            ctx.drawImage(rockSprite, rock.x - rock.size, rock.y - rock.size, rock.size * 2, rock.size * 2);
        }
    }

    // 4. Custom Bogged Cars & Jumping People
    for (let spec of spectators) {
        if (boggedCarSprite.complete) {
            ctx.drawImage(boggedCarSprite, spec.x, spec.y, 64, 48);
        }
        
        let jumpHeight = Math.abs(Math.sin((Date.now() + spec.offset) / 150)) * 10;
        let personX = spec.x < canvas.width / 2 ? spec.x + 65 : spec.x - 15;
        
        if (personSprite.complete) {
            ctx.drawImage(personSprite, personX, spec.y + 16 - jumpHeight, 32, 32);
        }
    }

    // 5. Custom Surfer Sprites (Rotating!)
    for (let surfer of surfers) {
        ctx.save();
        ctx.translate(surfer.x, surfer.y);
        ctx.rotate(Math.sin(surfer.carvePhase) * 0.5); 
        if (surferSprite.complete) {
            ctx.drawImage(surferSprite, -32, -32, 64, 64);
        }
        ctx.restore();
    }

    // 6. Global Lighting Gradient
    let lightingGradient = ctx.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
    if (currentPhase === "CLIMBING") {
        lightingGradient.addColorStop(0, "rgba(255, 255, 255, 0.1)"); 
        lightingGradient.addColorStop(1, "rgba(0, 0, 0, 0.4)");       
    } else {
        lightingGradient.addColorStop(0, "rgba(0, 0, 0, 0.1)");  
        lightingGradient.addColorStop(1, "rgba(0, 0, 0, 0.6)"); 
    }
    ctx.fillStyle = lightingGradient;
    ctx.fillRect(0, -100, canvas.width, WORLD_HEIGHT + 200);

    // 7. Player Car Sprite
    ctx.save();
    ctx.translate(car.x, car.y); 
    let frameIndex = getSpriteIndex(car.angle);
    let sourceCol = frameIndex % 4; 
    let sourceRow = Math.floor(frameIndex / 4); 
    ctx.drawImage(
        carSprite, 
        sourceCol * frameWidth, sourceRow * frameHeight, frameWidth, frameHeight, 
        -car.width / 2, -car.height / 2, car.width, car.height 
    );
    ctx.restore();
    
    ctx.restore(); 

    // --- UI DRAWING ---
    ctx.fillStyle = "white"; 
    ctx.font = "bold 20px Arial";
    ctx.shadowColor = "black";
    ctx.shadowBlur = 4;
    
    let displayTime = currentPhase === "FINISHED" ? finalTime : Date.now() - startTime;
    ctx.fillText("PHASE: " + currentPhase, 20, 40);
    ctx.fillText("TIME: " + formatTime(displayTime), 20, 70);
    ctx.fillText("SPEED: " + Math.round(car.speed * 10), 20, 100);
    
    if (car.uiMessage !== "") {
        if (car.uiMessage === "BOGGED DOWN!" || car.uiMessage === "CRASHED INTO ROCK!" || car.uiMessage === "WATCH THE BOGGED CARS!") {
            ctx.fillStyle = "#ff6b6b"; 
        } else if (car.uiMessage === "DODGE THE SURFERS!" || car.uiMessage === "LOSING MOMENTUM...") {
            ctx.fillStyle = "#ffc86b"; 
        } else {
            ctx.fillStyle = "#8cff6b"; 
        }
        ctx.fillText(car.uiMessage, 20, 130);
    }

    ctx.shadowBlur = 0; 

    // --- GAME OVER OVERLAY ---
    if (currentPhase === "FINISHED") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.textAlign = "center";
        
        if (isEnteringName) {
            ctx.fillStyle = "white";
            ctx.font = "bold 40px Arial";
            ctx.fillText("NEW HIGH SCORE!", canvas.width / 2, canvas.height / 2 - 100);
            
            ctx.fillStyle = "#ffcc00"; 
            ctx.font = "bold 25px Arial";
            ctx.fillText("YOUR TIME: " + formatTime(finalTime), canvas.width / 2, canvas.height / 2 - 40);

            ctx.font = "bold 60px monospace";
            for (let i = 0; i < 3; i++) {
                ctx.fillStyle = (i === nameIndex) ? "#ffcc00" : "white";
                let letter = String.fromCharCode(playerName[i]);
                let letterX = (canvas.width / 2) - 60 + (i * 60);
                ctx.fillText(letter, letterX, canvas.height / 2 + 50);
                
                if (i === nameIndex) {
                    let pulse = Math.abs(Math.sin(Date.now() / 200)) * 10;
                    ctx.fillText("ˆ", letterX, canvas.height / 2 + 80 + pulse);
                }
            }
            
            ctx.fillStyle = "white";
            ctx.font = "bold 18px Arial";
            ctx.fillText("USE ARROWS TO EDIT. PRESS ENTER TO SAVE.", canvas.width / 2, canvas.height / 2 + 150);

        } else {
            ctx.fillStyle = "white";
            ctx.font = "bold 50px Arial";
            ctx.fillText("LEADERBOARD", canvas.width / 2, canvas.height / 2 - 120);
            
            ctx.font = "bold 25px monospace";
            for (let i = 0; i < leaderboard.length; i++) {
                ctx.fillStyle = (leaderboard[i].time === finalTime) ? "#ffcc00" : "white";
                let rank = (i + 1).toString().padEnd(3, ' ');
                let name = leaderboard[i].name;
                let time = formatTime(leaderboard[i].time);
                ctx.fillText(`${rank} ${name} ..... ${time}`, canvas.width / 2, canvas.height / 2 - 40 + (i * 40));
            }

            ctx.fillStyle = "#8cff6b"; 
            ctx.font = "bold 24px Arial";
            let alpha = Math.abs(Math.sin(Date.now() / 300));
            ctx.fillStyle = `rgba(140, 255, 107, ${alpha + 0.2})`;
            ctx.fillText("PRESS 'R' TO RESTART", canvas.width / 2, canvas.height / 2 + 200);
        }
    }
}

// --- 7. GAME LOOP ---
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();
