// --- 1. SETUP ---
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// --- 1.5 LOAD ASSETS ---
const carSprite = new Image();
carSprite.src = 'car.png'; 

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

// Array to hold our dodgeable friction blobs
let bogBlobs = []; 

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

// --- 3.5 GENERATE ENVIRONMENT (DYNAMIC BASED ON PHASE) ---
function generateEnvironment(phase) {
    bogBlobs = []; // Clear old blobs
    
    // 40 blobs going up, 90 blobs going down!
    let numBlobs = phase === "CLIMBING" ? 40 : 90; 
    
    for (let i = 0; i < numBlobs; i++) {
        bogBlobs.push({
            x: Math.random() * canvas.width,
            y: Math.random() * (WORLD_HEIGHT - 400) + 200, 
            radius: Math.random() * 50 + 30 
        });
    }
}
// Generate the initial climbing map!
generateEnvironment("CLIMBING");

// --- 4. KEYBOARD CONTROLS ---
const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };

window.addEventListener("keydown", function(e) {
    if (keys.hasOwnProperty(e.code)) { keys[e.code] = true; e.preventDefault(); }
});
window.addEventListener("keyup", function(e) {
    if (keys.hasOwnProperty(e.code)) { keys[e.code] = false; }
});

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

    // --- 1. DODGEABLE BOG BLOB COLLISION ---
    for (let blob of bogBlobs) {
        let dx = car.x - blob.x;
        let dy = car.y - blob.y;
        if (Math.sqrt(dx*dx + dy*dy) < blob.radius * 0.8) {
            car.inBog = true;
            let absoluteSpeed = Math.abs(car.speed);
            
            // Momentum check!
            if (absoluteSpeed >= 5.5) {
                car.uiMessage = "PLOWING THROUGH!";
                currentFriction = car.friction * 3; 
            } 
            else if (absoluteSpeed >= 4.0) {
                car.uiMessage = "LOSING MOMENTUM...";
                currentFriction = car.friction * 6;
            } 
            else {
                car.uiMessage = "BOGGED DOWN!";
                currentMaxSpeed = 2.0; 
                currentFriction = car.friction * 12; 
            }
        }
    }

    // --- 2. THE HILL PHYSICS (GRAVITY) ---
    // If you point straight up (-Y), gravity pulls your speed down by 0.08 per frame.
    // If you steer sideways, the sine math lowers the gravity penalty so you can accelerate!
    // Going downhill (+Y), gravity pushes you forward!
    let gravityForce = currentPhase === "CLIMBING" ? 0.08 : 0.05;
    car.speed += Math.sin(car.angle) * gravityForce;

    // --- 3. ENGINE & BRAKING ---
    if (keys.ArrowUp) car.speed += car.acceleration;
    else if (keys.ArrowDown) car.speed -= car.acceleration;
    else {
        if (car.speed > 0) car.speed -= currentFriction;
        if (car.speed < 0) car.speed += currentFriction;
        if (Math.abs(car.speed) < currentFriction) car.speed = 0;
    }

    // Apply caps
    if (car.speed > currentMaxSpeed && !car.inBog) car.speed = currentMaxSpeed;
    if (car.inBog && car.speed > currentMaxSpeed) {
        if (currentMaxSpeed === 2.0) car.speed = 2.0; 
    }
    if (car.speed < -currentMaxSpeed / 2) car.speed = -currentMaxSpeed / 2;

    // --- 4. STEERING ---
    if (Math.abs(car.speed) > 0.5) {
        let steerDirection = car.speed > 0 ? 1 : -1; 
        if (keys.ArrowLeft) car.angle -= car.turnSpeed * steerDirection;
        if (keys.ArrowRight) car.angle += car.turnSpeed * steerDirection;
    }

    // Move the car
    car.x += Math.cos(car.angle) * car.speed;
    car.y += Math.sin(car.angle) * car.speed;

    if (car.x < 20) car.x = 20;
    if (car.x > canvas.width - 20) car.x = canvas.width - 20;

    // --- 5. PHASE LOGIC ---
    if (currentPhase === "CLIMBING") {
        if (car.y <= 0) {
            currentPhase = "DESCENDING";
            car.y = 0;
            car.angle = Math.PI / 2; 
            car.speed = 0; 
            
            // REGENERATE THE MAP WITH 90 BLOBS FOR THE DESCENT!
            generateEnvironment("DESCENDING"); 
        }
    } 
    else if (currentPhase === "DESCENDING") {
        if (car.y >= WORLD_HEIGHT) {
            currentPhase = "FINISHED";
            car.speed = 0;
        }
    }

    // Camera
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

    // 1. Draw Base Sand
    let pattern = ctx.createPattern(sandTile, 'repeat');
    let matrix = new DOMMatrix();
    matrix.scaleSelf(6, 6); 
    pattern.setTransform(matrix);
    ctx.fillStyle = pattern;
    ctx.fillRect(0, -100, canvas.width, WORLD_HEIGHT + 200);

    // 2. Draw Chunky Pixel Bog Blobs
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

    // 3. Global Lighting Gradient
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

    // 4. Peak/Base Lines
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, -4, canvas.width, 8); 
    ctx.fillRect(0, WORLD_HEIGHT - 4, canvas.width, 8); 

    // 5. Draw Car
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
    
    ctx.fillText("PHASE: " + currentPhase, 20, 40);
    ctx.fillText("SPEED: " + Math.round(car.speed * 10), 20, 70);
    
    if (car.inBog) {
        if (car.uiMessage === "BOGGED DOWN!") ctx.fillStyle = "#ff6b6b"; 
        else if (car.uiMessage === "LOSING MOMENTUM...") ctx.fillStyle = "#ffc86b"; 
        else ctx.fillStyle = "#8cff6b"; 

        ctx.fillText(car.uiMessage, 20, 100);
    }

    ctx.shadowBlur = 0; 

    if (currentPhase === "FINISHED") {
        ctx.fillStyle = "white";
        ctx.font = "bold 50px Arial";
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.fillText("YOU SURVIVED!", canvas.width / 2, canvas.height / 2);
    }
}

// --- 7. GAME LOOP ---
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();
