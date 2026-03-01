// --- 1. SETUP ---
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// --- 1.5 LOAD ASSETS ---
const carSprite = new Image();
carSprite.src = 'car.png'; // Your Figma sprite sheet

const frameWidth = 128; 
const frameHeight = 128;
const drawScale = 1.0; 

// --- 1.6 GENERATE PIXEL ART SAND TILE ---
// Instead of an external image, we generate a 32x32 retro pixel pattern in code!
const sandTile = document.createElement('canvas');
sandTile.width = 32;
sandTile.height = 32;
const sCtx = sandTile.getContext('2d');

// Fill base sand color
sCtx.fillStyle = "#e3c16f";
sCtx.fillRect(0, 0, 32, 32);

// Draw chunky pixel-art dune ridges and noise
for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
        let noise = Math.random();
        // Create a wavy pattern math equation
        let wave = Math.sin(x * 0.3) * 3 + y; 
        
        if (wave % 16 < 4) {
            // Dune Highlight (Sunlit edge)
            if (noise > 0.4) { sCtx.fillStyle = "#f0d494"; sCtx.fillRect(x, y, 1, 1); }
        } else if (wave % 16 > 12) {
            // Dune Shadow (Dark edge)
            if (noise > 0.4) { sCtx.fillStyle = "#c9a657"; sCtx.fillRect(x, y, 1, 1); }
        } else {
            // General sand texture noise
            if (noise > 0.85) { sCtx.fillStyle = "#d6b463"; sCtx.fillRect(x, y, 1, 1); }
        }
    }
}

// --- 2. GAME WORLD & STATE ---
const WORLD_HEIGHT = 4000; 
let currentPhase = "CLIMBING"; 
let cameraY = 0; 

let deepSandPits = []; // Invisible friction zones

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
    inDeepSand: false        
};

// --- 3.5 GENERATE ENVIRONMENT ---
function generateEnvironment() {
    for (let i = 0; i < 35; i++) {
        deepSandPits.push({
            x: Math.random() * canvas.width,
            y: Math.random() * (WORLD_HEIGHT - 400) + 200, 
            radius: Math.random() * 50 + 40 
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

// --- 4.5 SPRITE HELPER ---
function getSpriteIndex(angle) {
    let normalizedAngle = angle + (Math.PI * 4); 
    let slice = Math.PI / 4; 
    return Math.round(normalizedAngle / slice) % 8; 
}

// --- 5. THE MATH & PHYSICS (UPDATE) ---
function update() {
    if (currentPhase === "FINISHED") return; 

    car.inDeepSand = false; 
    let currentMaxSpeed = car.maxSpeed;
    let currentFriction = car.friction;

    // Deep Sand Math (No visuals)
    for (let pit of deepSandPits) {
        let dx = car.x - pit.x;
        let dy = car.y - pit.y;
        if (Math.sqrt(dx*dx + dy*dy) < pit.radius * 0.8) {
            car.inDeepSand = true;
            currentMaxSpeed = car.maxSpeed * 0.35; 
            currentFriction = car.friction * 5;    
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
    // CRUCIAL FOR PIXEL ART: Stops the browser from blurring!
    ctx.imageSmoothingEnabled = false; 

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(0, -cameraY); 

    // 1. Draw the generated Pixel Art Sand Pattern
    let pattern = ctx.createPattern(sandTile, 'repeat');
    let matrix = new DOMMatrix();
    matrix.scaleSelf(6, 6); 
    pattern.setTransform(matrix);
    
    ctx.fillStyle = pattern;
    ctx.fillRect(0, -100, canvas.width, WORLD_HEIGHT + 200);

    // 2. Add Global Lighting (The Hill Illusion overlay)
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

    // --- NEW: 3. Draw Deep Sand Pits (Chunky Pixel Style) ---
    ctx.fillStyle = "rgba(100, 70, 30, 0.6)"; // Dark, muddy brown color
    const chunkSize = 12; // Matches the chunky feel of the scaled background
    
    for (let pit of deepSandPits) {
        ctx.save();
        ctx.translate(pit.x, pit.y);
        ctx.globalCompositeOperation = "multiply"; // Blends the dark mud into the sand texture
        
        // Calculate how many chunky blocks fit into this pit's radius
        let wChunks = Math.floor(pit.radius / chunkSize);
        let hChunks = Math.floor((pit.radius * 0.8) / chunkSize); // Squashed Y-axis for isometric feel
        
        // Draw the pixelated oval
        for (let x = -wChunks; x <= wChunks; x++) {
            for (let y = -hChunks; y <= hChunks; y++) {
                // If the block is inside the mathematical ellipse, draw it!
                if ((x * x) / (wChunks * wChunks) + (y * y) / (hChunks * hChunks) <= 1) {
                    ctx.fillRect(x * chunkSize, y * chunkSize, chunkSize, chunkSize);
                }
            }
        }
        ctx.restore();
    }
    // --------------------------------------------------------

    // 4. Draw Peak and Base Finish Lines
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, -4, canvas.width, 8); 
    ctx.fillRect(0, WORLD_HEIGHT - 4, canvas.width, 8); 

    // 5. Draw the Car Sprite
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
    
    if (car.inDeepSand) {
        ctx.fillStyle = "#ff6b6b";
        ctx.fillText("BOGGED DOWN!", 20, 100);
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

// --- 7. THE GAME LOOP ---
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();
