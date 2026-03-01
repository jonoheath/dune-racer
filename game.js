// --- 1. SETUP ---
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// --- 1.5 LOAD ASSETS ---
const carSprite = new Image();
carSprite.src = 'car.png'; // Your Figma sprite sheet

const sandTexture = new Image();
sandTexture.src = 'sand.jpg'; // Your new photographic sand texture

const frameWidth = 128; 
const frameHeight = 128;
const drawScale = 0.5; 

// --- 2. GAME WORLD & STATE ---
const WORLD_HEIGHT = 4000; 
let currentPhase = "CLIMBING"; 
let cameraY = 0; 

// Array to hold our sticky sand traps
let deepSandPits = [];

// --- 3. THE PLAYER'S CAR ---
let car = {
    x: canvas.width / 2,     
    y: WORLD_HEIGHT - 100,   // Start at the bottom of the world
    speed: 0,
    maxSpeed: 4.5,           
    acceleration: 0.12,      
    friction: 0.05,          
    angle: -Math.PI / 2,     // Start facing North
    turnSpeed: 0.05,         
    width: frameWidth * drawScale,
    height: frameHeight * drawScale,
    inDeepSand: false        
};

// --- 3.5 GENERATE ENVIRONMENT ---
function generateEnvironment() {
    // Generate 35 Deep Sand Craters randomly across the massive dune
    for (let i = 0; i < 35; i++) {
        deepSandPits.push({
            x: Math.random() * canvas.width,
            y: Math.random() * (WORLD_HEIGHT - 400) + 200, 
            radius: Math.random() * 50 + 40 
        });
    }
}
// Run this once when the game loads!
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
        // We use an elliptical hit box (radius * 0.8) to match the squashed 3D visual
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

    // Keep car from driving off the left/right edges of the screen
    if (car.x < 20) car.x = 20;
    if (car.x > canvas.width - 20) car.x = canvas.width - 20;

    // --- PHASE LOGIC & GRAVITY ---
    if (currentPhase === "CLIMBING") {
        car.y += 1.5; // Gravity pulls DOWN the screen
        
        // Did we reach the peak (Y = 0)?
        if (car.y <= 0) {
            currentPhase = "DESCENDING";
            car.y = 0;
            car.angle = Math.PI / 2; // Spin South
            car.speed = 0; 
        }
    } 
    else if (currentPhase === "DESCENDING") {
        car.y += 2.5; // Gravity pushes DOWN the screen
        
        // Did we reach the base finish line (Y = 4000)?
        if (car.y >= WORLD_HEIGHT) {
            currentPhase = "FINISHED";
            car.speed = 0;
        }
    }

    // --- CAMERA ---
    cameraY = car.y - (canvas.height / 2);
    // Stop the camera from showing empty black space past the world edges
    if (cameraY < -50) cameraY = -50;
    if (cameraY > WORLD_HEIGHT - canvas.height + 50) cameraY = WORLD_HEIGHT - canvas.height + 50;
}

// --- 6. THE ART (DRAW) ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Everything inside this save/restore block scrolls with the camera
    ctx.save();
    ctx.translate(0, -cameraY); 

    // 1. Draw the repeating Photographic Sand Texture
    if (sandTexture.complete && sandTexture.naturalWidth !== 0) {
        let pattern = ctx.createPattern(sandTexture, 'repeat');
        ctx.fillStyle = pattern;
        ctx.fillRect(0, -100, canvas.width, WORLD_HEIGHT + 200);
    } else {
        // Fallback color while image loads
        ctx.fillStyle = "#e3c16f";
        ctx.fillRect(0, -100, canvas.width, WORLD_HEIGHT + 200);
    }

    // 2. Add Global Lighting (The Hill Illusion overlay)
    let lightingGradient = ctx.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
    if (currentPhase === "CLIMBING") {
        lightingGradient.addColorStop(0, "rgba(255, 255, 255, 0.15)"); // Bright peak
        lightingGradient.addColorStop(1, "rgba(0, 0, 0, 0.65)");       // Dark base
    } else {
        lightingGradient.addColorStop(0, "rgba(0, 0, 0, 0.2)");  // Shadowed peak
        lightingGradient.addColorStop(1, "rgba(0, 0, 0, 0.85)"); // Very dark base
    }
    ctx.fillStyle = lightingGradient;
    ctx.fillRect(0, -100, canvas.width, WORLD_HEIGHT + 200);

    // 3. Draw Deep Sand (Blended Isometric Craters)
    for (let pit of deepSandPits) {
        ctx.save();
        ctx.translate(pit.x, pit.y);
        ctx.scale(1, 0.6); // Squash the Y-axis to make it isometric!
        
        // Blend mode: burns the shadow into the photo beneath it
        ctx.globalCompositeOperation = "multiply"; 
        
        let craterGradient = ctx.createRadialGradient(0, 0, pit.radius * 0.2, 0, 0, pit.radius);
        craterGradient.addColorStop(0, "rgba(60, 40, 10, 0.7)");   // Dark center
        craterGradient.addColorStop(0.8, "rgba(60, 40, 10, 0.2)"); // Sloped edges
        craterGradient.addColorStop(1, "rgba(60, 40, 10, 0)");     // Fades cleanly
        
        ctx.fillStyle = craterGradient;
        ctx.beginPath();
        ctx.arc(0, 0, pit.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore(); // This safely resets the blend mode back to normal!
    }

    // 4. Draw Peak and Base Finish Lines
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, -4, canvas.width, 8); 
    ctx.fillRect(0, WORLD_HEIGHT - 4, canvas.width, 8); 

    // 5. Draw the Car and its Drop Shadow
    ctx.save();
    ctx.translate(car.x, car.y); 

    // The Drop Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.beginPath();
    let shadowOffsetY = currentPhase === "CLIMBING" ? 15 : -5;
    ctx.ellipse(0, shadowOffsetY, car.width / 2.5, car.height / 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // The Figma Sprite
    let frameIndex = getSpriteIndex(car.angle);
    let sourceCol = frameIndex % 4; 
    let sourceRow = Math.floor(frameIndex / 4); 

    ctx.drawImage(
        carSprite, 
        sourceCol * frameWidth, sourceRow * frameHeight, frameWidth, frameHeight, 
        -car.width / 2, -car.height / 2, car.width, car.height 
    );
    ctx.restore();
    
    // --- CAMERA MAGIC ENDS ---
    ctx.restore(); 

    // --- UI DRAWING (Glued to screen) ---
    ctx.fillStyle = "white"; // Changed to white so it pops against the photo
    ctx.font = "bold 20px Arial";
    // Add a tiny text shadow for readability
    ctx.shadowColor = "black";
    ctx.shadowBlur = 4;
    
    ctx.fillText("PHASE: " + currentPhase, 20, 40);
    ctx.fillText("SPEED: " + Math.round(car.speed * 10), 20, 70);
    
    if (car.inDeepSand) {
        ctx.fillStyle = "#ff6b6b";
        ctx.fillText("BOGGED DOWN!", 20, 100);
    }

    // Reset shadow so it doesn't mess with the Win Screen
    ctx.shadowBlur = 0; 

    if (currentPhase === "FINISHED") {
        ctx.fillStyle = "white";
        ctx.font = "bold 50px Arial";
        ctx.textAlign = "center";
        
        // Semi-transparent background for the win screen
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
