// --- 1. SETUP ---
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// --- 1.5 LOAD ASSETS (YOUR FIGMA EXPORT) ---
const carSprite = new Image();
carSprite.src = 'car.png'; 

const frameWidth = 128; 
const frameHeight = 128;
const drawScale = 0.5; 

// --- 2. GAME WORLD & STATE ---
const WORLD_HEIGHT = 4000; 
let currentPhase = "CLIMBING"; 
let cameraY = 0; 

// Arrays for our environment
let deepSandPits = [];
let sandRipples = []; // New: sweeping curves for terrain texture

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
    // 1. Generate Deep Sand Craters
    for (let i = 0; i < 35; i++) {
        deepSandPits.push({
            x: Math.random() * canvas.width,
            y: Math.random() * (WORLD_HEIGHT - 400) + 200, 
            radius: Math.random() * 50 + 40 
        });
    }
    
    // 2. Generate Wind Ripples (Fake 3D contours)
    for (let i = 0; i < 150; i++) {
        sandRipples.push({
            x: Math.random() * canvas.width,
            y: Math.random() * WORLD_HEIGHT,
            width: Math.random() * 200 + 100,
            curveOffset: (Math.random() - 0.5) * 60 // How wavy the line is
        });
    }
}
// Run once on load
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

    // --- DEEP SAND COLLISION ---
    for (let pit of deepSandPits) {
        let dx = car.x - pit.x;
        let dy = car.y - pit.y;
        let distance = Math.sqrt(dx*dx + dy*dy);
        // We use an elliptical hit box to match the visuals
        if (distance < pit.radius * 0.8) {
            car.inDeepSand = true;
            currentMaxSpeed = car.maxSpeed * 0.35; // Bog down heavily
            currentFriction = car.friction * 5;    // Thick mud feel
        }
    }

    // --- DRIVING MATH ---
    if (keys.ArrowUp) { car.speed += car.acceleration; } 
    else if (keys.ArrowDown) { car.speed -= car.acceleration; } 
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

    // --- PHASE LOGIC & GRAVITY ---
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

    // --- CAMERA ---
    cameraY = car.y - (canvas.height / 2);
    if (cameraY < -50) cameraY = -50;
    if (cameraY > WORLD_HEIGHT - canvas.height + 50) cameraY = WORLD_HEIGHT - canvas.height + 50;
}

// --- 6. THE ART (DRAW) ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(0, -cameraY); 

    // 1. Draw Base Gradient
    let duneGradient = ctx.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
    if (currentPhase === "CLIMBING") {
        duneGradient.addColorStop(0, "#fcecae"); 
        duneGradient.addColorStop(1, "#c49a45"); 
    } else {
        duneGradient.addColorStop(0, "#e3bc66"); 
        duneGradient.addColorStop(1, "#9e772d"); 
    }
    ctx.fillStyle = duneGradient;
    ctx.fillRect(0, -100, canvas.width, WORLD_HEIGHT + 200);

    // 2. Draw Wind Ripples (Fake 3D Contours)
    ctx.lineWidth = 2;
    for (let ripple of sandRipples) {
        ctx.beginPath();
        ctx.moveTo(ripple.x, ripple.y);
        // Create a sweeping Bezier curve
        ctx.quadraticCurveTo(ripple.x + ripple.width/2, ripple.y + ripple.curveOffset, ripple.x + ripple.width, ripple.y);
        
        // Highlight side of the ripple
        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.stroke();
        
        // Shadow side of the ripple (offset slightly down)
        ctx.beginPath();
        ctx.moveTo(ripple.x, ripple.y + 2);
        ctx.quadraticCurveTo(ripple.x + ripple.width/2, ripple.y + ripple.curveOffset + 2, ripple.x + ripple.width, ripple.y + 2);
        ctx.strokeStyle = "rgba(0, 0, 0, 0.05)";
        ctx.stroke();
    }

    // 3. Draw Deep Sand (Isometric Craters)
    for (let pit of deepSandPits) {
        ctx.save();
        ctx.translate(pit.x, pit.y);
        ctx.scale(1, 0.6); // Squash the Y-axis to make it isometric!
        
        // Create a radial gradient that acts like a bowl
        let craterGradient = ctx.createRadialGradient(0, 0, pit.radius * 0.2, 0, 0, pit.radius);
        craterGradient.addColorStop(0, "rgba(100, 70, 20, 0.4)"); // Dark deep center
        craterGradient.addColorStop(0.8, "rgba(100, 70, 20, 0.1)"); // Sloped edges
        craterGradient.addColorStop(1, "rgba(100, 70, 20, 0)"); // Fades cleanly into surrounding sand
        
        ctx.fillStyle = craterGradient;
        ctx.beginPath();
        ctx.arc(0, 0, pit.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // 4. Peak/Base Lines
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(0, -4, canvas.width, 8); 
    ctx.fillRect(0, WORLD_HEIGHT - 4, canvas.width, 8); 

    // 5. Draw the Car Sprite (WITH DROP SHADOW)
    ctx.save();
    ctx.translate(car.x, car.y); 

    // --- NEW: THE CAR DROP SHADOW ---
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.beginPath();
    // Draw an isometric squashed circle directly under the car
    // Offset Y slightly based on phase so shadow matches the light source
    let shadowOffsetY = currentPhase === "CLIMBING" ? 15 : -5;
    ctx.ellipse(0, shadowOffsetY, car.width / 2.5, car.height / 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // --------------------------------

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
    ctx.fillStyle = "black";
    ctx.font = "bold 20px Arial";
    ctx.fillText("PHASE: " + currentPhase, 20, 40);
    ctx.fillText("SPEED: " + Math.round(car.speed * 10), 20, 70);
    
    if (car.inDeepSand) {
        ctx.fillStyle = "#8a241a";
        ctx.fillText("BOGGED DOWN!", 20, 100);
    }

    if (currentPhase === "FINISHED") {
        ctx.fillStyle = "white";
        ctx.font = "bold 50px Arial";
        ctx.textAlign = "center";
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
