// --- 1. SETUP ---
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// --- 2. GAME STATE ---
let currentPhase = "CLIMBING"; 

// --- 3. THE PLAYER'S CAR ---
let car = {
    x: canvas.width / 2,     
    y: canvas.height - 50,   
    speed: 0,
    maxSpeed: 4,             // Top speed of the 4x4
    acceleration: 0.1,       // How fast it gains speed
    friction: 0.05,          // How fast it slows down when you let off the gas
    angle: -Math.PI / 2,     // Start facing UP the screen
    turnSpeed: 0.05          // How fast the steering wheel turns
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

// --- 5. THE MATH & PHYSICS (UPDATE) ---
function update() {
    if (currentPhase === "FINISHED") return; // Stop math when the game is over

    // 1. Gas and Brakes
    if (keys.ArrowUp) {
        car.speed += car.acceleration;
    } else if (keys.ArrowDown) {
        car.speed -= car.acceleration;
    } else {
        // Friction: slow down gradually
        if (car.speed > 0) car.speed -= car.friction;
        if (car.speed < 0) car.speed += car.friction;
        if (Math.abs(car.speed) < car.friction) car.speed = 0;
    }

    // Cap the maximum speed
    if (car.speed > car.maxSpeed) car.speed = car.maxSpeed;
    if (car.speed < -car.maxSpeed / 2) car.speed = -car.maxSpeed / 2;

    // 2. Steering (Only if moving)
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
        // Fake Gravity pulling DOWN
        car.y += 1.5; 

        // Did we reach the top?
        if (car.y <= 100) {
            currentPhase = "DESCENDING";
            car.y = 100;
            car.angle = Math.PI / 2; // Spin car around to face down
            car.speed = 0;
        }
    } 
    else if (currentPhase === "DESCENDING") {
        // Fake Gravity pushing DOWN
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

    // Draw Background
    if (currentPhase === "CLIMBING") {
        ctx.fillStyle = "#e3c16f"; // Sand color
    } else {
        ctx.fillStyle = "#c2a35b"; // Darker sand for the other side
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw the Peak/Finish Line
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    if (currentPhase === "CLIMBING") {
        ctx.fillRect(0, 98, canvas.width, 4); // Peak line at top
    } else {
        ctx.fillRect(0, canvas.height - 50, canvas.width, 10); // Finish line at bottom
    }

    // Draw the Car
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    ctx.fillStyle = "#d93829"; // Red 4x4
    ctx.fillRect(-15, -10, 30, 20); 
    
    // Draw tiny headlights to show which way is forward
    ctx.fillStyle = "yellow";
    ctx.fillRect(10, -8, 5, 4);
    ctx.fillRect(10, 4, 5, 4);
    ctx.restore();
    
    // Draw UI Text
    ctx.fillStyle = "black";
    ctx.font = "bold 20px Arial";
    ctx.fillText("PHASE: " + currentPhase, 20, 40);
    ctx.fillText("SPEED: " + Math.round(car.speed * 10), 20, 70);

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
