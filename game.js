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
const WORLD_HEIGHT = 4000; // The dune is now massive! 4000 pixels tall.
let currentPhase = "CLIMBING"; 
let cameraY = 0; // Where the camera is currently looking

// Arrays to hold our generated hazards
let rocks = [];
let deepSandPits = [];

// --- 3. THE PLAYER'S CAR ---
let car = {
    x: canvas.width / 2,     
    y: WORLD_HEIGHT - 100,   // Start at the very bottom of the massive world
    speed: 0,
    maxSpeed: 4.5,           
    acceleration: 0.12,      
    friction: 0.05,          
    angle: -Math.PI / 2,     
    turnSpeed: 0.05,         
    width: frameWidth * drawScale,
    height: frameHeight * drawScale,
    inDeepSand: false        // Tracks if we are currently stuck
};

// --- 3.5 GENERATE HAZARDS ---
function generateHazards() {
    // Generate 30 Deep Sand Pits
    for (let i = 0; i < 30; i++) {
        deepSandPits.push({
            x: Math.random() * canvas.width,
            y: Math.random() * (WORLD_HEIGHT - 400) + 200, // Keep away from start/finish
            radius: Math.random() * 40 + 40 // Radius between 40 and 80
        });
    }
    // Generate 40 Rocks
    for (let i = 0; i < 40; i++) {
        rocks.push({
            x: Math.random() * canvas.width,
            y: Math.random() * (WORLD_HEIGHT - 400) + 200,
            radius: Math.random() * 10 + 10 // Radius between 10 and 20
        });
    }
}
// Run this once when the game loads!
generateHazards();

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

    car.inDeepSand = false; // Reset every frame
    let currentMaxSpeed = car.maxSpeed;
    let currentFriction = car.friction;

    // --- HAZARD COLLISION CHECKS ---
    // 1. Deep Sand Check
    for (let pit of deepSandPits) {
        let dx = car.x - pit.x;
        let dy = car.y - pit.y;
        let distance = Math.sqrt(dx*dx + dy*dy);
        if (distance < pit.radius) {
            car.inDeepSand = true;
            currentMaxSpeed = car.maxSpeed * 0.4; // Drastically reduce top speed
            currentFriction = car.friction * 4;   // Make it feel like thick mud
        }
    }

    // 2. Rock Collision Check
    for (let rock of rocks) {
        let dx = car.x - rock.x;
        let dy = car.y - rock.y;
        let distance = Math.sqrt(dx*dx + dy*dy);
        if (distance < rock.radius + (car.width/4)) { // Rough collision box
            car.speed = 0; // Hard stop!
            // Push car back slightly so it doesn't get permanently stuck inside the rock
            car.x -= Math.cos(car.angle) * 2;
            car.y -= Math.sin(car.angle) * 2;
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

    // Keep car within the left/right screen boundaries
    if (car.x < 20) car.x = 20;
    if (car.x > canvas.width - 20) car.x = canvas.width - 20;

    // --- PHASE LOGIC & GRAVITY ---
    if (currentPhase === "CLIMBING") {
        car.y += 1.5; // Gravity pulls DOWN towards the bottom of the world
        
        // Did we reach the peak (Y = 0)?
        if (car.y <= 0) {
            currentPhase = "DESCENDING";
            car.y = 0;
            car.angle = Math.PI / 2; // Spin south
            car.speed = 0; 
        }
    } 
    else if (currentPhase === "DESCENDING") {
        car.y += 2.5; // Gravity pushes DOWN towards the bottom of the world
        
        // Did we reach the base (Y = 4000)?
        if (car.y >= WORLD_HEIGHT) {
            currentPhase = "FINISHED";
            car.speed = 0;
        }
    }

    // --- UPDATE CAMERA POSITION ---
    // Keep the camera centered on the car's Y position
    cameraY = car.y - (canvas.height / 2);
    // Clamp the camera so it doesn't scroll past the top or bottom of the world
    if (cameraY < -50) cameraY = -50;
    if (cameraY > WORLD_HEIGHT - canvas.height + 50) cameraY = WORLD_HEIGHT - canvas.height + 50;
}

// --- 6. THE ART (DRAW) ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // --- CAMERA MAGIC BEGINS ---
    ctx.save();
    // Shift everything we draw opposite to the camera's position!
    ctx.translate(0, -cameraY); 

    // 1. Draw 3D-style Sand Gradient for the whole world
    // A gradient that goes from Y=0 (Peak) to Y=4000 (Base)
    let duneGradient = ctx.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
    if (currentPhase === "CLIMBING") {
        duneGradient.addColorStop(0, "#fcecae"); // Bright sunlit peak
        duneGradient.addColorStop(1, "#c49a45"); // Dark, shadowy base
    } else {
        duneGradient.addColorStop(0, "#e3bc66"); // Slightly darker peak for the other side
        duneGradient.addColorStop(1, "#9e772d"); // Very dark base
    }
    ctx.fillStyle = duneGradient;
    ctx.fillRect(0, -100, canvas.width, WORLD_HEIGHT + 200);

    // 2. Draw Deep Sand Pits
    ctx.fillStyle = currentPhase === "CLIMBING" ? "#c4a355" : "#a8873a"; // Darker sand patches
    for (let pit of deepSandPits) {
        ctx.beginPath();
        // Squish the circle vertically to make it look isometric!
        ctx.ellipse(pit.x, pit.y, pit.radius, pit.radius * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // 3. Draw Rocks
    for (let rock of rocks) {
        // Draw rock shadow
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath();
        ctx.ellipse(rock.x + 5, rock.y + 5, rock.radius, rock.radius * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw rock body
        ctx.fillStyle = "#666"; // Gray rock
        ctx.beginPath();
        ctx.ellipse(rock.x, rock.y, rock.radius, rock.radius * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // 4. Draw Peak and Base Lines
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(0, -4, canvas.width, 8); // Peak line at Y = 0
    ctx.fillRect(0, WORLD_HEIGHT - 4, canvas.width, 8); // Base line at Y = 4000

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
    
    // --- CAMERA MAGIC ENDS ---
    ctx.restore(); 
    // Anything drawn after ctx.restore() is glued to the screen (UI)

    // Draw UI Text (Glued to the screen)
    ctx.fillStyle = "black";
    ctx.font = "bold 20px Arial";
    ctx.fillText("PHASE: " + currentPhase, 20, 40);
    ctx.fillText("SPEED: " + Math.round(car.speed * 10), 20, 70);
    
    if (car.inDeepSand) {
        ctx.fillStyle = "red";
        ctx.fillText("DEEP SAND!", 20, 100);
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

// Start the game!
gameLoop();
