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

// Game Entities
let bogBlobs = []; 
let rocks = [];
let spectators = [];
let surfers = [];

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
    
    // 1. Generate Bog Blobs
    for (let i = 0; i < numBlobs; i++) {
        bogBlobs.push({
            x: Math.random() * canvas.width,
            y: Math.random() * (WORLD_HEIGHT - 400) + 200, 
            radius: Math.random() * 50 + 30 
        });
    }

    // 2. Generate Rocks
    for (let i = 0; i < 30; i++) {
        rocks.push({
            x: Math.random() * canvas.width,
            y: Math.random() * (WORLD_HEIGHT - 400) + 200, 
            size: Math.random() * 15 + 15 // Chunky size
        });
    }

    // 3. Generate Spectator Cars
    let carColors = ["#d95763", "#597dce", "#99e550", "#ffffff"];
    for (let i = 0; i < 15; i++) {
        // Keep them clustered near the left or right edges
        let xPos = Math.random() > 0.5 ? Math.random() * 100 : canvas.width - 40 - Math.random() * 100;
        spectators.push({
            x: xPos,
            y: Math.random() * (WORLD_HEIGHT - 400) + 200, 
            color: carColors[Math.floor(Math.random() * carColors.length)],
            offset: Math.random() * 1000 // Used to randomize their jumping!
        });
    }

    // 4. Spawn Surfers (Sandboarders)
    // Only spawn them coming AT you while climbing!
    if (phase === "CLIMBING") {
        for (let i = 0; i < 10; i++) {
            surfers.push({
                x: Math.random() * canvas.width,
                y: Math.random() * WORLD_HEIGHT, // Will wrap around the camera
                speed: Math.random() * 2 + 3,    // Downward speed
                carvePhase: Math.random() * Math.PI * 2 // Where they are in their left/right carve
            });
        }
    }
}
// Generate map!
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

    // --- COLLISION: BOG BLOBS ---
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

    // --- COLLISION: ROCKS & PARKED CARS (HARD STOP) ---
    // Check Rocks
    for (let rock of rocks) {
        let dx = car.x - rock.x;
        let dy = car.y - rock.y;
        if (Math.sqrt(dx*dx + dy*dy) < rock.size + 15) {
            car.speed = -1; // Bounce backwards!
            car.uiMessage = "CRASHED INTO ROCK!";
        }
    }
    // Check Spectator Cars
    for (let spec of spectators) {
        let dx = car.x - (spec.x + 15); // center of parked car
        let dy = car.y - (spec.y + 20);
        if (Math.sqrt(dx*dx + dy*dy) < 30) {
            car.speed = -1; 
            car.uiMessage = "WATCH THE CROWD!";
        }
    }

    // --- UPDATE & COLLISION: SURFERS ---
    for (let surfer of surfers) {
        surfer.y += surfer.speed; // Move down the hill
        surfer.carvePhase += 0.05; // Advance the sine wave
        surfer.x += Math.sin(surfer.carvePhase) * 2; // Carve left and right!

        // If the surfer goes past the bottom of your screen, teleport them to the top!
        if (surfer.y > cameraY + canvas.height + 100) {
            surfer.y = cameraY - 100;
            surfer.x = Math.random() * canvas.width;
        }

        // Did you run over a sandboarder?!
        let dx = car.x - surfer.x;
        let dy = car.y - surfer.y;
        if (Math.sqrt(dx*dx + dy*dy) < 25) {
            car.speed *= 0.8; // Lose a chunk of speed
            car.uiMessage = "DODGE THE SURFERS!";
        }
    }

    // --- THE HILL PHYSICS (GRAVITY) ---
    let gravityForce = currentPhase === "CLIMBING" ? 0.08 : 0.05;
    car.speed += Math.sin(car.angle) * gravityForce;

    // --- ENGINE & BRAKING ---
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

    // --- STEERING ---
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

    // --- PHASE LOGIC ---
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

    // 3. Draw Rocks
    ctx.fillStyle = "#555"; // Dark gray
    for (let rock of rocks) {
        ctx.fillRect(rock.x - rock.size, rock.y - rock.size, rock.size * 2, rock.size * 2);
        // Little highlight to make it look chunky
        ctx.fillStyle = "#888"; 
        ctx.fillRect(rock.x - rock.size, rock.y - rock.size, rock.size, rock.size);
        ctx.fillStyle = "#555"; // Reset for next rock
    }

    // 4. Draw Spectators & Parked Cars
    for (let spec of spectators) {
        // The Car
        ctx.fillStyle = spec.color;
        ctx.fillRect(spec.x, spec.y, 24, 40); 
        ctx.fillStyle = "#222"; // Windows
        ctx.fillRect(spec.x + 4, spec.y + 8, 16, 12);
        
        // The Cheering Person! (Uses time to jump up and down)
        let jumpHeight = Math.abs(Math.sin((Date.now() + spec.offset) / 150)) * 10;
        
        // Draw person next to the car (closer to the center of the screen)
        let personX = spec.x < canvas.width / 2 ? spec.x + 30 : spec.x - 15;
        
        ctx.fillStyle = "#ffffff"; // Shirt
        ctx.fillRect(personX, spec.y + 15 - jumpHeight, 10, 10);
        ctx.fillStyle = "#ffccaa"; // Head
        ctx.fillRect(personX + 2, spec.y + 7 - jumpHeight, 6, 6);
    }

    // 5. Draw Surfers
    for (let surfer of surfers) {
        ctx.save();
        ctx.translate(surfer.x, surfer.y);
        // Rotate the board based on their carve direction!
        ctx.rotate(Math.sin(surfer.carvePhase) * 0.5); 
        
        ctx.fillStyle = "#ffcc00"; // Yellow Surfboard
        ctx.fillRect(-8, -20, 16, 40);
        
        ctx.fillStyle = "#222"; // Surfer body
        ctx.fillRect(-6, -6, 12, 12);
        ctx.fillStyle = "#ffccaa"; // Surfer head
        ctx.fillRect(-4, -12, 8, 8);
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

    // 7. Draw Car
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
    
    if (car.uiMessage !== "") {
        if (car.uiMessage === "BOGGED DOWN!" || car.uiMessage === "CRASHED INTO ROCK!" || car.uiMessage === "WATCH THE CROWD!") {
            ctx.fillStyle = "#ff6b6b"; 
        } else if (car.uiMessage === "DODGE THE SURFERS!" || car.uiMessage === "LOSING MOMENTUM...") {
            ctx.fillStyle = "#ffc86b"; 
        } else {
            ctx.fillStyle = "#8cff6b"; 
        }
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
