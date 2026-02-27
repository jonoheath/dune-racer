// --- 1. SETUP ---
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// --- 1.5 LOAD ASSETS (YOUR FIGMA EXPORT) ---
const carSprite = new Image();
carSprite.src = 'car.png'; // Must match your Figma file name exactly

// Figma Frame Dimensions
const frameWidth = 128; 
const frameHeight = 128;
const drawScale = 0.5; // Scales the 128px image down to 64px on the screen

// --- 2. GAME STATE ---
let currentPhase = "CLIMBING"; 

// --- 3. THE PLAYER'S CAR ---
let car = {
    x: canvas.width / 2,     
    y: canvas.height - 80,   // Start near the bottom
    speed: 0,
    maxSpeed: 4.5,           // Top speed
    acceleration: 0.12,      // Acceleration rate
    friction: 0.05,          // Coasting friction
    angle: -Math.PI / 2,     // Start facing UP the screen (North)
    turnSpeed: 0.05,         // Steering speed
    // Dynamic collision/drawing box based on scale
    width: frameWidth * drawScale,
    height: frameHeight * drawScale
};

// --- 4. KEYBOARD CONTROLS ---
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

window.addEventListener("keydown", function(e) {
    if (keys.hasOwnProperty(e.code)) {
        keys[e.code] = true;
        e.preventDefault(); // Prevents the browser window from scrolling
    }
});

window.addEventListener("keyup", function(e) {
    if (keys.hasOwnProperty(e.code)) {
        keys[e.code] = false;
    }
});

// --- 4.5 SPRITE HELPER FUNCTION ---
// Converts the car's angle in radians to a sprite frame index (0 to 7)
function getSpriteIndex(angle) {
    // Keep the angle positive for the math
    let normalizedAngle = angle + (Math.PI * 4); 
    let slice = Math.PI / 4; // 45 degrees
    
    // Round to nearest 45-degree slice
    let index = Math.round(normalizedAngle / slice);
    
    // Wrap around 0-7 to match your Figma grid
    return index % 8; 
}

// --- 5. THE MATH & PHYSICS (UPDATE) ---
function update() {
    if (currentPhase === "FINISHED") return; // Stop math when you win

    // 1. Gas and Brakes
    if (keys.ArrowUp) {
        car.speed += car.acceleration;
    } else if (keys.ArrowDown) {
        car.speed -= car.acceleration;
    } else {
        // Friction: slow down gradually
        if (car.speed > 0) car.speed -= car.friction;
        if (car.speed < 0) car.speed += car.friction;
        
        // Snap to zero if moving extremely slowly
        if (Math.abs(car.speed) < car.friction) car.speed = 0;
    }

    // Cap the maximum speed (reverse is half as fast)
    if (car.speed > car.maxSpeed) car.speed = car.maxSpeed;
    if (car.speed < -car.maxSpeed / 2) car.speed = -car.maxSpeed / 2;

    // 2. Steering (Only if the car is actually moving)
    if (Math.abs(car.speed) > 0.5) {
        let steerDirection = car.speed > 0 ? 1 : -1; 
        
        if (keys.ArrowLeft) {
            car.angle -= car.turnSpeed * steerDirection;
        }
        if (keys.ArrowRight) {
            car.angle += car.turnSpeed * steerDirection;
        }
    }

    // 3. Move the car
    car.x += Math.cos(car.angle) * car.speed;
    car.y += Math.sin(car.angle) * car.speed;

    // --- PHASE LOGIC (THE DUNE) ---
    if (currentPhase === "CLIMBING") {
        // Fake Gravity pulling DOWN the screen
        car.y += 1.5; 

        // Did we reach the top?
        if (car.y <= 100) {
            currentPhase = "DESCENDING";
            car.y = 100;
            car.angle = Math.PI / 2; // Spin car around to face down the hill (South)
            car.speed = 0; // Pause momentarily at the peak
        }
    } 
    else if (currentPhase === "DESCENDING") {
        // Fake Gravity pushing DOWN the hill (increasing speed)
        car.y += 2.5; 

        // Did we reach the bottom finish line?
        if (car.y >= canvas.height - 50) {
            currentPhase = "FINISHED";
            car.speed = 0;
        }
    }
}

// --- 6. THE ART (DRAW) ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Background based on phase
    if (currentPhase === "CLIMBING") {
        ctx.fillStyle = "#e3c16f"; // Sand color
    } else {
        ctx.fillStyle = "#c2a35b"; // Darker sand for the descent
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw the Peak / Finish Line
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    if (currentPhase === "CLIMBING") {
        ctx.fillRect(0, 98, canvas.width, 4); // Peak line at top
    } else {
        ctx.fillRect(0, canvas.height - 50, canvas.width, 10); // Finish line at bottom
    }

    // Draw the Car Sprite
    ctx.save();
    ctx.translate(car.x, car.y); // Move origin to the car's current position
    
    // Figure out which frame of the sprite sheet to draw based on angle
    let frameIndex = getSpriteIndex(car.angle);

    // Map the 0-7 index to X/Y coordinates on your 2x4 Figma grid
    let sourceCol = frameIndex % 4; // Columns 0, 1, 2, 3
    let sourceRow = Math.floor(frameIndex / 4); // Rows 0, 1

    // Draw the snipped image from your PNG
    ctx.drawImage(
        carSprite, 
        sourceCol * frameWidth, sourceRow * frameHeight, frameWidth, frameHeight, 
        -car.width / 2, -car.height / 2, car.width, car.height 
    );
    
    ctx.restore();
    
    // Draw UI Text
    ctx.fillStyle = "black";
    ctx.font = "bold 20px Arial";
    ctx.fillText("PHASE: " + currentPhase, 20, 40);
    ctx.fillText("SPEED: " + Math.round(car.speed * 10), 20, 70);

    // Win Screen Text
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

// Start the game!
gameLoop();
