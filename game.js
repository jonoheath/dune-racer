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

// NEW: Array to hold our sweeping, winding dunes
let duneRidges = []; 

// --- 3. THE PLAYER'S CAR ---
let car = {
    x: canvas.width / 2,     
    y: WORLD_HEIGHT - 100,   
    speed: 0,
    maxSpeed: 4.5,           
    acceleration: 0.12,      
    friction: 0.05,          
    angle: -Math.PI / 2,     
    turnSpeed: 0.05,         
    width: frameWidth * drawScale,
    height: frameHeight * drawScale,
    onRidge: false // Updated flag        
};

// --- 3.5 GENERATE ENVIRONMENT (THE SINE WAVES) ---
function generateEnvironment() {
    // We create a new massive ridge every 350 pixels down the map
    for (let y = 200; y < WORLD_HEIGHT - 200; y += 350) {
        duneRidges.push({
            baseY: y, // Starting Y position
            amplitude: Math.random() * 80 + 50,    // How dramatic the curves are
            frequency: (Math.random() * 0.006) + 0.002, // How wide the curves are
            slope: (Math.random() * 0.4) - 0.2,    // Makes them tilt diagonally
            thickness: Math.random() * 30 + 40     // How wide the high-friction "hill" is
        });
    }
}
generateEnvironment();

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

    car.onRidge = false; 
    let currentMaxSpeed = car.maxSpeed;
    let currentFriction = car.friction;

    // --- NEW: SINE WAVE COLLISION MATH ---
    for (let ridge of duneRidges) {
        // Find exactly where the center of the ridge is at the car's current X position
        let ridgeY_at_carX = ridge.baseY + Math.sin(car.x * ridge.frequency) * ridge.amplitude + (car.x * ridge.slope);

        // Check if the car is within the "thickness" zone of that ridge line
        if (Math.abs(car.y - ridgeY_at_carX) < ridge.thickness) {
            car.onRidge = true;
            // HUGE penalty for trying to climb over the steep ridge!
            currentMaxSpeed = car.maxSpeed * 0.25; 
            currentFriction = car.friction * 6;    
        }
    }

    // Driving Math
    if (keys.ArrowUp) car.speed += car.acceleration;
    else if (keys.ArrowDown) car.speed -= car.acceleration;
    else {
        if (car.speed > 0) car.speed -= currentFriction;
        if (car.speed < 0) car.speed += currentFriction;
        if (Math.abs(car.speed) < currentFriction) car.speed = 0;
    }

    if (car.speed > currentMaxSpeed) car.speed = currentMaxSpeed;
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

    // Phase Logic
    if (currentPhase === "CLIMBING") {
        car.y += 1.5; 
        if (car.y <= 0) {
            currentPhase = "DESCENDING";
            car.y = 0;
            car.angle = Math.PI / 2; 
            car.speed = 0; 
        }
    } 
    else if (currentPhase === "DESCENDING") {
        car.y += 2.5; 
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

    // --- NEW: 2. DRAW THE PROCEDURAL SINE WAVE RIDGES ---
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let ridge of duneRidges) {
        // Step A: Draw the shadow side of the ridge (Offset slightly down)
        ctx.beginPath();
        for (let x = -50; x < canvas.width + 50; x += 20) {
            let y = ridge.baseY + Math.sin(x * ridge.frequency) * ridge.amplitude + (x * ridge.slope);
            if (x === -50) ctx.moveTo(x, y + 10); // Offset down
            else ctx.lineTo(x, y + 10);
        }
        ctx.strokeStyle = "rgba(100, 60, 20, 0.4)"; // Dark shadow
        ctx.lineWidth = ridge.thickness * 1.8;      // Thicker to blend out
        ctx.stroke();

        // Step B: Draw the sunlit peak of the ridge
        ctx.beginPath();
        for (let x = -50; x < canvas.width + 50; x += 20) {
            let y = ridge.baseY + Math.sin(x * ridge.frequency) * ridge.amplitude + (x * ridge.slope);
            if (x === -50) ctx.moveTo(x, y - 5); // Offset up
            else ctx.lineTo(x, y - 5);
        }
        ctx.strokeStyle = "rgba(255, 230, 160, 0.6)"; // Bright highlight
        ctx.lineWidth = ridge.thickness;
        ctx.stroke();
    }
    // ----------------------------------------------------

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
    
    if (car.onRidge) {
        ctx.fillStyle = "#ff6b6b";
        ctx.fillText("STEEP RIDGE!", 20, 100);
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
