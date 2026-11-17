
/* =========================================================
   PHYSICS LABORATORY
   MÓDULO 02: BALONCESTO ELÉCTRICO

   Física:
   - Ley de Coulomb.
   - Principio de superposición.
   - Segunda ley de Newton.
   - Integración temporal.
   - Colisiones y restitución.

   Mecánica:
   - Pelota con carga positiva fija.
   - Cargas positivas y negativas colocadas por el jugador.
   - Cinco niveles progresivos.
   - Obstáculos y colisiones.
   - Canasta y detección de enceste.
   - Pausa, reinicio y limpieza.

   Unidades internas: Sistema Internacional (SI).
========================================================= */

import {
    PHYSICS_CONSTANTS,
    calculateNetElectricForce,
    calculateAcceleration,
    updateKinematics
} from "./electricity.js";


/* =========================================================
   1. CONFIGURACIÓN FÍSICA Y GRÁFICA
========================================================= */

const CONFIG = Object.freeze({

    WIDTH: 1100,
    HEIGHT: 650,

    WORLD_SCALE: 100,

    BALL_CHARGE: 1e-6,
    BALL_MASS: 0.006,

    BALL_RADIUS: 17,

    CHARGE_RADIUS: 17,

    MIN_CHARGE_DISTANCE: 45,

    HOOP_X: 990,
    HOOP_Y: 325,

    HOOP_RADIUS: 63,
    HOOP_SCORE_RADIUS: 44,

    BOUNDARY_RESTITUTION: 0.48,
    WALL_RESTITUTION: 0.38,

    DRAG: 0.34,

    MAX_ACCELERATION: 22,
    MAX_SPEED: 5,

    FIXED_STEP: 1 / 120,

    COURT: {
        x: 40,
        y: 55,
        width: 1020,
        height: 540
    }

});


/* =========================================================
   2. DEFINICIÓN DE LOS CINCO NIVELES
========================================================= */

const LEVELS = {

    1: {
        title: "Introducción",

        description: "Sin obstáculos. Aprende a controlar la pelota con cargas eléctricas.",

        walls: []

    },


    2: {
        title: "Primer obstáculo",

        description: "Supera un muro y encuentra el camino hacia la canasta.",

        walls: [

            {
                x: 540,
                y: 55,
                width: 30,
                height: 360
            }

        ]

    },


    3: {
        title: "Zigzag",

        description: "Rodea dos muros alternados y cambia la dirección de la pelota.",

        walls: [

            {
                x: 360,
                y: 55,
                width: 30,
                height: 340
            },

            {
                x: 680,
                y: 255,
                width: 30,
                height: 340
            }

        ]

    },


    4: {
        title: "Trayectoria compleja",

        description: "Combina atracción y repulsión para superar tres obstáculos.",

        walls: [

            {
                x: 300,
                y: 245,
                width: 30,
                height: 350
            },

            {
                x: 550,
                y: 55,
                width: 30,
                height: 345
            },

            {
                x: 800,
                y: 245,
                width: 30,
                height: 350
            }

        ]

    },


    5: {
        title: "Desafío final",

        description: "Supera cuatro muros alternados y consigue la última canasta.",

        walls: [

            {
                x: 245,
                y: 55,
                width: 30,
                height: 330
            },

            {
                x: 455,
                y: 250,
                width: 30,
                height: 345
            },

            {
                x: 660,
                y: 55,
                width: 30,
                height: 340
            },

            {
                x: 855,
                y: 250,
                width: 30,
                height: 345
            }

        ]

    }

};


/* =========================================================
   3. ESTADO DEL JUEGO
========================================================= */

const state = {

    initialized: false,

    level: 1,

    charges: [],

    nextChargeId: 1,

    selectedCharge: null,

    ball: {
        x: 1.3,
        y: 3.25,
        vx: 0,
        vy: 0
    },

    running: false,

    hasStarted: false,

    won: false,

    completedLevels: new Set(),

    animationId: null,

    lastTimestamp: null,

    accumulator: 0,

    force: {
        x: 0,
        y: 0,
        magnitude: 0
    },

    trail: [],

    trailTimer: 0,

    draggingChargeId: null,

    suppressNextClick: false

};


/* =========================================================
   4. REFERENCIAS HTML
========================================================= */

let canvas;
let ctx;

let levelSelect;

let startButton;
let pauseButton;
let resetButton;
let clearChargesButton;

let positiveButton;
let negativeButton;

let selectedChargeInfo;

let currentLevelTitle;
let currentLevelDescription;

let gameStatusText;
let chargeCount;

let resultantForce;
let forceX;
let forceY;

let progressPoints;

let gameOverlay;
let overlayTitle;
let overlayMessage;
let nextLevelButton;


/* =========================================================
   5. UTILIDADES MATEMÁTICAS
========================================================= */

function clamp(value, minimum, maximum) {

    return Math.max(
        minimum,
        Math.min(maximum, value)
    );

}


function distance(x1, y1, x2, y2) {

    return Math.hypot(
        x2 - x1,
        y2 - y1
    );

}


function toPixels(meters) {

    return meters * CONFIG.WORLD_SCALE;

}


function toMeters(pixels) {

    return pixels / CONFIG.WORLD_SCALE;

}


function getBallPixels() {

    return {

        x: toPixels(state.ball.x),

        y: toPixels(state.ball.y)

    };

}


function getCanvasCoordinates(event) {

    const rect = canvas.getBoundingClientRect();

    return {

        x: (event.clientX - rect.left) *
            (canvas.width / rect.width),

        y: (event.clientY - rect.top) *
            (canvas.height / rect.height)

    };

}


/**
 * Distancia mínima desde un punto hasta un segmento.
 * Se utiliza para detectar el paso de la pelota por la canasta.
 */

function distancePointToSegment(point, start, end) {

    const dx = end.x - start.x;

    const dy = end.y - start.y;


    const lengthSquared = dx * dx + dy * dy;


    if (lengthSquared === 0) {

        return distance(
            point.x,
            point.y,
            start.x,
            start.y
        );

    }


    const t = clamp(

        (
            (point.x - start.x) * dx +
            (point.y - start.y) * dy
        ) / lengthSquared,

        0,

        1

    );


    const closestX = start.x + t * dx;

    const closestY = start.y + t * dy;


    return distance(
        point.x,
        point.y,
        closestX,
        closestY
    );

}


/* =========================================================
   6. ACCESO A LOS OBSTÁCULOS
========================================================= */

function getCurrentWalls() {

    return LEVELS[state.level].walls;

}


function isInsideWall(x, y, margin = 0) {

    return getCurrentWalls().some(wall => {

        return (

            x >= wall.x - margin &&

            x <= wall.x + wall.width + margin &&

            y >= wall.y - margin &&

            y <= wall.y + wall.height + margin

        );

    });

}


/* =========================================================
   7. RESETEAR POSICIÓN DE LA PELOTA
========================================================= */

function resetBall() {

    state.ball = {

        x: 1.3,

        y: 3.25,

        vx: 0,

        vy: 0

    };


    state.trail = [];

    state.trailTimer = 0;

    updateForceDisplay();

}


/* =========================================================
   8. HERRAMIENTAS DE CARGA
========================================================= */

function selectCharge(type) {

    if (state.running || state.won) {
        return;
    }


    state.selectedCharge = type;


    positiveButton.classList.toggle(
        "selected",
        type === "positive"
    );


    negativeButton.classList.toggle(
        "selected",
        type === "negative"
    );


    selectedChargeInfo.textContent =
        type === "positive"
            ? "Carga seleccionada: +1 μC. Repelerá la pelota."
            : "Carga seleccionada: −1 μC. Atraerá la pelota.";


    gameStatusText.textContent =
        "Haz clic sobre el tablero para colocar la carga.";

    drawGame();

}


/* =========================================================
   9. COLOCACIÓN DE CARGAS
========================================================= */

function isValidChargePosition(position) {

    const { x, y } = position;


    const court = CONFIG.COURT;


    // Mantener las cargas dentro de la cancha.

    if (
        x < court.x + 25 ||
        x > court.x + court.width - 25 ||
        y < court.y + 25 ||
        y > court.y + court.height - 25
    ) {

        return false;

    }


    // Evitar introducir cargas dentro de los muros.

    if (isInsideWall(x, y, 12)) {

        return false;

    }


    // Evitar colocar una carga directamente sobre la pelota.

    const ball = getBallPixels();


    if (
        distance(x, y, ball.x, ball.y) <
        CONFIG.MIN_CHARGE_DISTANCE
    ) {

        return false;

    }


    // Evitar ocupar la zona de enceste.

    if (
        distance(
            x,
            y,
            CONFIG.HOOP_X,
            CONFIG.HOOP_Y
        ) < 90
    ) {

        return false;

    }


    return true;

}


function addCharge(position) {

    if (!state.selectedCharge) {

        gameStatusText.textContent =
            "Primero selecciona una carga positiva o negativa.";

        return;

    }


    if (!isValidChargePosition(position)) {

        gameStatusText.textContent =
            "Posición no válida. Evita los muros, la pelota y la canasta.";

        return;

    }


    const magnitude = PHYSICS_CONSTANTS.MICROCOULOMB;


    const charge = {

        id: state.nextChargeId++,

        type: state.selectedCharge,

        charge: state.selectedCharge === "positive"
            ? magnitude
            : -magnitude,

        x: position.x,

        y: position.y

    };


    state.charges.push(charge);


    updateGameUI();

    updateForceDisplay();

    drawGame();


    gameStatusText.textContent =
        `Carga ${charge.type === "positive" ? "positiva" : "negativa"} colocada correctamente.`;

}


/* =========================================================
   10. ELIMINAR CARGAS
========================================================= */

function findChargeAt(position, maximumDistance = 23) {

    let closest = null;

    let minimum = maximumDistance;


    state.charges.forEach(charge => {

        const d = distance(
            position.x,
            position.y,
            charge.x,
            charge.y
        );


        if (d < minimum) {

            minimum = d;

            closest = charge;

        }

    });


    return closest;

}


function removeCharge(chargeId) {

    state.charges = state.charges.filter(
        charge => charge.id !== chargeId
    );


    updateGameUI();

    updateForceDisplay();

    drawGame();


    gameStatusText.textContent =
        "Carga eliminada.";

}


/**
 * El botón derecho permite retirar individualmente una carga.
 */

function handleContextMenu(event) {

    event.preventDefault();

    if (state.running) {
        return;
    }


    const position = getCanvasCoordinates(event);

    const charge = findChargeAt(position);


    if (charge) {

        removeCharge(charge.id);

    } else {

        gameStatusText.textContent =
            "Haz clic derecho cerca de una carga para eliminarla.";

    }

}


/* =========================================================
   11. MOVIMIENTO DE CARGAS
========================================================= */

function handleChargePointerDown(event) {

    if (
        state.running ||
        event.button !== 0
    ) {
        return;
    }


    const position = getCanvasCoordinates(event);

    const charge = findChargeAt(position);


    if (!charge) {
        return;
    }


    state.draggingChargeId = charge.id;

    state.suppressNextClick = true;


    if (canvas.setPointerCapture) {

        canvas.setPointerCapture(event.pointerId);

    }

}


function handleChargePointerMove(event) {

    if (!state.draggingChargeId) {
        return;
    }


    const charge = state.charges.find(
        item => item.id === state.draggingChargeId
    );


    if (!charge) {
        return;
    }


    const position = getCanvasCoordinates(event);


    if (isValidChargePosition(position)) {

        charge.x = position.x;

        charge.y = position.y;

        updateForceDisplay();

        drawGame();

    }

}


function handleChargePointerUp() {

    if (!state.draggingChargeId) {
        return;
    }


    state.draggingChargeId = null;

    updateForceDisplay();

    drawGame();

}


/* =========================================================
   12. FUERZA ELÉCTRICA RESULTANTE
========================================================= */

/**
 * La pelota tiene carga fija +1 μC.
 *
 * Las cargas del jugador permanecen inmóviles
 * durante la simulación.
 *
 * Las posiciones se convierten a metros antes
 * de aplicar la ley de Coulomb.
 */

function calculateBallForce() {

    const ballPosition = {

        x: state.ball.x,

        y: state.ball.y

    };


    const charges = state.charges.map(charge => ({

        charge: charge.charge,

        position: {

            x: toMeters(charge.x),

            y: toMeters(charge.y)

        }

    }));


    const force = calculateNetElectricForce(

        CONFIG.BALL_CHARGE,

        ballPosition,

        charges

    );


    state.force = {

        x: force.x,

        y: force.y,

        magnitude: force.magnitude

    };


    return state.force;

}


/* =========================================================
   13. PRESENTACIÓN DE MAGNITUDES
========================================================= */

function formatForce(value) {

    if (!Number.isFinite(value)) {

        return "—";

    }


    if (
        value !== 0 &&
        Math.abs(value) < 0.01
    ) {

        return value.toExponential(2);

    }


    return value.toFixed(2);

}


function updateForceDisplay() {

    const force = calculateBallForce();


    resultantForce.textContent =
        formatForce(force.magnitude);


    forceX.textContent =
        `${formatForce(force.x)} N`;


    forceY.textContent =
        `${formatForce(force.y)} N`;

}


/* =========================================================
   14. COLISIONES CON RECTÁNGULOS
========================================================= */

/**
 * Colisión entre una pelota circular y un muro rectangular.
 *
 * La velocidad se expresa en píxeles por segundo.
 */

function resolveWallCollision(
    ballX,
    ballY,
    velocityX,
    velocityY,
    wall
) {

    const radius = CONFIG.BALL_RADIUS;


    const closestX = clamp(
        ballX,
        wall.x,
        wall.x + wall.width
    );


    const closestY = clamp(
        ballY,
        wall.y,
        wall.y + wall.height
    );


    let dx = ballX - closestX;

    let dy = ballY - closestY;


    let d = Math.hypot(dx, dy);


    if (d >= radius) {

        return {

            x: ballX,

            y: ballY,

            vx: velocityX,

            vy: velocityY,

            collided: false

        };

    }


    let normalX;

    let normalY;

    let penetration;


    if (d > 0) {

        normalX = dx / d;

        normalY = dy / d;

        penetration = radius - d;

    } else {

        // El centro de la pelota está dentro del rectángulo.
        // Se busca la cara más cercana.

        const candidates = [

            {
                distance: ballX - wall.x,
                nx: -1,
                ny: 0,
                x: wall.x - radius,
                y: ballY
            },

            {
                distance: wall.x + wall.width - ballX,
                nx: 1,
                ny: 0,
                x: wall.x + wall.width + radius,
                y: ballY
            },

            {
                distance: ballY - wall.y,
                nx: 0,
                ny: -1,
                x: ballX,
                y: wall.y - radius
            },

            {
                distance: wall.y + wall.height - ballY,
                nx: 0,
                ny: 1,
                x: ballX,
                y: wall.y + wall.height + radius
            }

        ];


        candidates.sort(
            (a, b) => a.distance - b.distance
        );


        const nearest = candidates[0];


        return {

            x: nearest.x,

            y: nearest.y,

            vx: nearest.nx * Math.abs(velocityX) *
                CONFIG.WALL_RESTITUTION,

            vy: nearest.ny * Math.abs(velocityY) *
                CONFIG.WALL_RESTITUTION,

            collided: true

        };

    }


    // Corregir penetración.

    ballX += normalX * penetration;

    ballY += normalY * penetration;


    // Reflejar velocidad cuando se aproxima al muro.

    const normalVelocity =
        velocityX * normalX +
        velocityY * normalY;


    if (normalVelocity < 0) {

        const restitution = CONFIG.WALL_RESTITUTION;

        velocityX -=
            (1 + restitution) * normalVelocity * normalX;

        velocityY -=
            (1 + restitution) * normalVelocity * normalY;

    }


    return {

        x: ballX,

        y: ballY,

        vx: velocityX,

        vy: velocityY,

        collided: true

    };

}


/* =========================================================
   15. COLISIONES CON LOS LÍMITES
========================================================= */

function resolveCourtBoundaries(x, y, vx, vy) {

    const radius = CONFIG.BALL_RADIUS;

    const court = CONFIG.COURT;


    const minimumX = court.x + radius;

    const maximumX = court.x + court.width - radius;

    const minimumY = court.y + radius;

    const maximumY = court.y + court.height - radius;


    if (x < minimumX) {

        x = minimumX;

        if (vx < 0) {

            vx = -vx * CONFIG.BOUNDARY_RESTITUTION;

        }

    }


    if (x > maximumX) {

        x = maximumX;

        if (vx > 0) {

            vx = -vx * CONFIG.BOUNDARY_RESTITUTION;

        }

    }


    if (y < minimumY) {

        y = minimumY;

        if (vy < 0) {

            vy = -vy * CONFIG.BOUNDARY_RESTITUTION;

        }

    }


    if (y > maximumY) {

        y = maximumY;

        if (vy > 0) {

            vy = -vy * CONFIG.BOUNDARY_RESTITUTION;

        }

    }


    return { x, y, vx, vy };

}


/* =========================================================
   16. DETECCIÓN DE ENCESTE
========================================================= */

function checkBasket(previousPosition, currentPosition) {

    const hoop = {

        x: CONFIG.HOOP_X,

        y: CONFIG.HOOP_Y

    };


    const minimumDistance = distancePointToSegment(

        hoop,

        previousPosition,

        currentPosition

    );


    const ball = getBallPixels();


    // La pelota debe entrar en la canasta
    // desde la dirección de juego.

    if (
        minimumDistance <= CONFIG.HOOP_SCORE_RADIUS &&
        state.ball.vx > 0.1
    ) {

        completeLevel();

        return true;

    }


    // Si la pelota está exactamente dentro de la zona.

    if (
        distance(
            ball.x,
            ball.y,
            hoop.x,
            hoop.y
        ) <= CONFIG.HOOP_SCORE_RADIUS &&
        state.ball.vx > 0.1
    ) {

        completeLevel();

        return true;

    }


    return false;

}


/* =========================================================
   17. INTEGRACIÓN DEL MOVIMIENTO
========================================================= */

/**
 * Se utiliza integración de Euler semiimplícita
 * mediante el motor matemático compartido.
 *
 * La pelota se mueve exclusivamente por la fuerza
 * eléctrica resultante, con un término de
 * amortiguamiento para hacer el experimento controlable.
 */

function simulatePhysicsStep(deltaTime) {

    const previous = getBallPixels();


    // Fuerza de Coulomb.

    const force = calculateBallForce();


    // Segunda ley de Newton.

    const acceleration = calculateAcceleration(

        {

            x: force.x,

            y: force.y

        },

        CONFIG.BALL_MASS

    );


    let ax = acceleration.x;

    let ay = acceleration.y;


    // Amortiguamiento físico lineal.

    ax -= state.ball.vx * CONFIG.DRAG;

    ay -= state.ball.vy * CONFIG.DRAG;


    // Protección numérica.

    const accelerationMagnitude = Math.hypot(ax, ay);


    if (accelerationMagnitude > CONFIG.MAX_ACCELERATION) {

        const factor =
            CONFIG.MAX_ACCELERATION / accelerationMagnitude;

        ax *= factor;

        ay *= factor;

    }


    // Integración en unidades SI.

    const result = updateKinematics(

        {

            x: state.ball.x,

            y: state.ball.y

        },

        {

            x: state.ball.vx,

            y: state.ball.vy

        },

        {

            x: ax,

            y: ay

        },

        deltaTime

    );


    state.ball.x = result.position.x;

    state.ball.y = result.position.y;

    state.ball.vx = clamp(
        result.velocity.x,
        -CONFIG.MAX_SPEED,
        CONFIG.MAX_SPEED
    );

    state.ball.vy = clamp(
        result.velocity.y,
        -CONFIG.MAX_SPEED,
        CONFIG.MAX_SPEED
    );


    // Convertir para detectar colisiones en el tablero.

    let x = toPixels(state.ball.x);

    let y = toPixels(state.ball.y);

    let vx = toPixels(state.ball.vx);

    let vy = toPixels(state.ball.vy);


    // Muros.

    getCurrentWalls().forEach(wall => {

        const collision = resolveWallCollision(
            x,
            y,
            vx,
            vy,
            wall
        );


        x = collision.x;

        y = collision.y;

        vx = collision.vx;

        vy = collision.vy;

    });


    // Límites de la cancha.

    const boundary = resolveCourtBoundaries(
        x,
        y,
        vx,
        vy
    );


    x = boundary.x;

    y = boundary.y;

    vx = boundary.vx;

    vy = boundary.vy;


    // Regresar al SI.

    state.ball.x = toMeters(x);

    state.ball.y = toMeters(y);

    state.ball.vx = toMeters(vx);

    state.ball.vy = toMeters(vy);


    // Detectar enceste.

    const current = {

        x,

        y

    };


    if (checkBasket(previous, current)) {

        return;

    }


    // Estela de movimiento.

    state.trailTimer += deltaTime;


    if (state.trailTimer >= 0.035) {

        state.trailTimer = 0;

        state.trail.push({

            x,

            y

        });


        if (state.trail.length > 18) {

            state.trail.shift();

        }

    }


    // Actualizar fuerza en el nuevo punto.

    calculateBallForce();

}


/* =========================================================
   18. REINICIAR ANIMACIÓN
========================================================= */

function stopAnimation() {

    if (state.animationId !== null) {

        cancelAnimationFrame(state.animationId);

    }


    state.animationId = null;

    state.lastTimestamp = null;

    state.accumulator = 0;

    state.running = false;

}


function resetSimulation() {

    stopAnimation();

    state.hasStarted = false;

    state.won = false;


    resetBall();


    gameOverlay.hidden = true;


    startButton.disabled = false;

    startButton.textContent = "▶ Iniciar";

    pauseButton.disabled = true;


    gameStatusText.textContent =
        "Pelota reiniciada. Las cargas permanecen en el tablero.";


    updateGameUI();

    drawGame();

}


/* =========================================================
   19. INICIAR Y PAUSAR
========================================================= */

function startSimulation() {

    if (state.running || state.won) {
        return;
    }


    if (state.charges.length === 0) {

        gameStatusText.textContent =
            "Coloca al menos una carga antes de iniciar.";

        return;

    }


    state.running = true;

    state.hasStarted = true;


    startButton.textContent = "▶ En movimiento";

    startButton.disabled = true;

    pauseButton.disabled = false;


    gameStatusText.textContent =
        "La pelota se mueve por acción de las fuerzas eléctricas.";


    state.lastTimestamp = null;

    state.accumulator = 0;


    state.animationId = requestAnimationFrame(gameLoop);

}


function pauseSimulation() {

    if (!state.running) {
        return;
    }


    stopAnimation();


    startButton.disabled = false;

    startButton.textContent = "▶ Reanudar";

    pauseButton.disabled = true;


    gameStatusText.textContent =
        "Simulación pausada. Puedes continuar o reiniciar.";

    drawGame();

}


/* =========================================================
   20. BUCLE PRINCIPAL
========================================================= */

function gameLoop(timestamp) {

    if (!state.running) {
        return;
    }


    if (state.lastTimestamp === null) {

        state.lastTimestamp = timestamp;

    }


    const elapsed = Math.min(

        (timestamp - state.lastTimestamp) / 1000,

        0.05

    );


    state.lastTimestamp = timestamp;

    state.accumulator += elapsed;


    let steps = 0;


    while (

        state.accumulator >= CONFIG.FIXED_STEP &&

        steps < 10 &&

        state.running

    ) {

        simulatePhysicsStep(CONFIG.FIXED_STEP);

        state.accumulator -= CONFIG.FIXED_STEP;

        steps++;

    }


    drawGame();

    updateForceDisplay();


    if (state.running) {

        state.animationId = requestAnimationFrame(gameLoop);

    }

}


/* =========================================================
   21. COMPLETAR UN NIVEL
========================================================= */

function completeLevel() {

    stopAnimation();

    state.won = true;


    state.completedLevels.add(state.level);


    pauseButton.disabled = true;

    startButton.disabled = true;


    if (state.level === 5) {

        overlayTitle.textContent = "¡Campeón!";

        overlayMessage.textContent =
            "Has superado los cinco niveles del baloncesto eléctrico.";

        nextLevelButton.textContent = "Volver al nivel 1";

    } else {

        overlayTitle.textContent = "¡Canasta!";

        overlayMessage.textContent =
            `¡Excelente! Has superado el nivel ${state.level}.`;

        nextLevelButton.textContent = "Siguiente nivel →";

    }


    gameOverlay.hidden = false;


    gameStatusText.textContent =
        "¡Canasta conseguida! Nivel completado.";


    updateGameUI();

    drawGame();


    announce("¡Canasta! Nivel completado.");

}


/* =========================================================
   22. CAMBIAR DE NIVEL
========================================================= */

function loadLevel(level) {

    const parsedLevel = Number(level);


    if (!LEVELS[parsedLevel]) {
        return;
    }


    stopAnimation();


    state.level = parsedLevel;

    state.charges = [];

    state.selectedCharge = null;

    state.won = false;

    state.hasStarted = false;


    state.draggingChargeId = null;

    state.suppressNextClick = false;


    resetBall();


    positiveButton.classList.remove("selected");

    negativeButton.classList.remove("selected");


    selectedChargeInfo.textContent =
        "Selecciona una herramienta para comenzar.";


    levelSelect.value = String(parsedLevel);


    currentLevelTitle.textContent =
        LEVELS[parsedLevel].title;


    currentLevelDescription.textContent =
        LEVELS[parsedLevel].description;


    gameOverlay.hidden = true;


    startButton.disabled = false;

    startButton.textContent = "▶ Iniciar";

    pauseButton.disabled = true;


    gameStatusText.textContent =
        `Nivel ${parsedLevel} preparado. Coloca las cargas para comenzar.`;


    updateGameUI();

    updateForceDisplay();

    drawGame();

}


/* =========================================================
   23. LIMPIAR TODAS LAS CARGAS
========================================================= */

function clearAllCharges() {

    stopAnimation();


    state.charges = [];

    state.selectedCharge = null;

    state.won = false;

    state.hasStarted = false;


    positiveButton.classList.remove("selected");

    negativeButton.classList.remove("selected");


    selectedChargeInfo.textContent =
        "Selecciona una herramienta para comenzar.";


    resetBall();


    gameOverlay.hidden = true;


    startButton.disabled = false;

    startButton.textContent = "▶ Iniciar";

    pauseButton.disabled = true;


    gameStatusText.textContent =
        "Todas las cargas han sido eliminadas.";


    updateGameUI();

    drawGame();

}


/* =========================================================
   24. DIBUJAR LA CANCHA
========================================================= */

function drawCourt() {

    const width = CONFIG.WIDTH;

    const height = CONFIG.HEIGHT;

    const court = CONFIG.COURT;


    // Fondo exterior.

    const background = ctx.createLinearGradient(
        0, 0, width, height
    );

    background.addColorStop(0, "#18372c");

    background.addColorStop(0.5, "#284c3c");

    background.addColorStop(1, "#142e24");


    ctx.fillStyle = background;

    ctx.fillRect(0, 0, width, height);


    // Madera de la cancha.

    const floor = ctx.createLinearGradient(
        0, court.y, 0, court.y + court.height
    );

    floor.addColorStop(0, "#dba66f");

    floor.addColorStop(0.5, "#c58a52");

    floor.addColorStop(1, "#a96e3f");


    ctx.fillStyle = floor;

    ctx.fillRect(
        court.x,
        court.y,
        court.width,
        court.height
    );


    // Franjas de madera.

    for (let i = 0; i < 16; i++) {

        const stripeY =
            court.y + i * court.height / 16;


        ctx.fillStyle = i % 2 === 0
            ? "rgba(255,225,177,0.075)"
            : "rgba(93,48,23,0.045)";


        ctx.fillRect(

            court.x,

            stripeY,

            court.width,

            court.height / 16

        );

    }


    // Juntas de madera.

    ctx.save();

    ctx.strokeStyle = "rgba(92,51,29,0.16)";

    ctx.lineWidth = 1;


    for (let x = court.x + 100; x < court.x + court.width; x += 100) {

        ctx.beginPath();

        ctx.moveTo(x, court.y);

        ctx.lineTo(x, court.y + court.height);

        ctx.stroke();

    }


    ctx.restore();


    // Borde de cancha.

    ctx.strokeStyle = "rgba(255,244,223,0.85)";

    ctx.lineWidth = 4;

    ctx.strokeRect(

        court.x + 12,

        court.y + 12,

        court.width - 24,

        court.height - 24

    );


    // Línea central.

    ctx.lineWidth = 2.5;

    ctx.strokeStyle = "rgba(255,242,219,0.65)";


    ctx.beginPath();

    ctx.moveTo(width / 2, court.y + 13);

    ctx.lineTo(width / 2, court.y + court.height - 13);

    ctx.stroke();


    // Círculo central.

    ctx.beginPath();

    ctx.arc(
        width / 2,
        height / 2,
        85,
        0,
        Math.PI * 2
    );

    ctx.stroke();


    ctx.beginPath();

    ctx.arc(
        width / 2,
        height / 2,
        5,
        0,
        Math.PI * 2
    );

    ctx.fillStyle = "rgba(255,242,219,0.75)";

    ctx.fill();


    // Semicírculos laterales.

    ctx.beginPath();

    ctx.arc(
        court.x + 12,
        height / 2,
        110,
        -Math.PI / 2,
        Math.PI / 2
    );

    ctx.stroke();


    ctx.beginPath();

    ctx.arc(
        court.x + court.width - 12,
        height / 2,
        110,
        Math.PI / 2,
        Math.PI * 1.5
    );

    ctx.stroke();


    // Indicador de inicio.

    ctx.save();

    ctx.fillStyle = "rgba(80,49,26,0.65)";

    ctx.font = "bold 13px Arial";

    ctx.textAlign = "left";

    ctx.fillText(
        "PHYSICS LAB · ELECTRIC BASKETBALL",
        court.x + 25,
        court.y + 35
    );

    ctx.restore();

}


/* =========================================================
   25. DIBUJAR OBSTÁCULOS
========================================================= */

function drawWalls() {

    getCurrentWalls().forEach(wall => {

        ctx.save();


        // Sombra.

        ctx.shadowColor = "rgba(25,31,39,0.4)";

        ctx.shadowBlur = 12;

        ctx.shadowOffsetX = 5;

        ctx.shadowOffsetY = 6;


        // Cuerpo del muro.

        const gradient = ctx.createLinearGradient(
            wall.x,
            wall.y,
            wall.x + wall.width,
            wall.y
        );


        gradient.addColorStop(0, "#435a6c");

        gradient.addColorStop(0.35, "#8ba0ad");

        gradient.addColorStop(0.65, "#607789");

        gradient.addColorStop(1, "#34495a");


        ctx.fillStyle = gradient;


        ctx.beginPath();

        ctx.roundRect(
            wall.x,
            wall.y,
            wall.width,
            wall.height,
            5
        );

        ctx.fill();


        // Sombra interna y borde.

        ctx.shadowColor = "transparent";

        ctx.strokeStyle = "#d4e1e7";

        ctx.lineWidth = 2;

        ctx.stroke();


        // Detalles de textura.

        ctx.strokeStyle = "rgba(255,255,255,0.23)";

        ctx.lineWidth = 1;


        for (
            let y = wall.y + 13;
            y < wall.y + wall.height - 8;
            y += 30
        ) {

            ctx.beginPath();

            ctx.moveTo(wall.x + 5, y);

            ctx.lineTo(wall.x + wall.width - 5, y);

            ctx.stroke();

        }


        ctx.restore();

    });

}


/* =========================================================
   26. DIBUJAR CANASTA
========================================================= */

function drawBasket() {

    const x = CONFIG.HOOP_X;

    const y = CONFIG.HOOP_Y;


    ctx.save();


    // Sombra de tablero.

    ctx.fillStyle = "rgba(38,34,26,0.28)";

    ctx.beginPath();

    ctx.ellipse(
        x + 8,
        y + 7,
        69,
        78,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();


    // Tablero en perspectiva.

    const boardGradient = ctx.createLinearGradient(
        x + 48,
        y - 85,
        x + 82,
        y + 85
    );

    boardGradient.addColorStop(0, "#eef4f3");

    boardGradient.addColorStop(0.5, "#aab9bf");

    boardGradient.addColorStop(1, "#687e89");


    ctx.fillStyle = boardGradient;

    ctx.strokeStyle = "#344a55";

    ctx.lineWidth = 3;


    ctx.beginPath();

    ctx.roundRect(
        x + 57,
        y - 78,
        19,
        156,
        5
    );

    ctx.fill();

    ctx.stroke();


    // Cuadro del tablero.

    ctx.strokeStyle = "#dd6842";

    ctx.lineWidth = 3;

    ctx.strokeRect(
        x + 51,
        y - 24,
        24,
        48
    );


    // Red de la canasta.

    ctx.strokeStyle = "rgba(240,248,248,0.65)";

    ctx.lineWidth = 1.5;


    for (let i = -3; i <= 3; i++) {

        const offset = i * 12;


        ctx.beginPath();

        ctx.moveTo(x + offset, y + 17);

        ctx.lineTo(x + offset * 0.5, y + 64);

        ctx.stroke();

    }


    // Aro exterior.

    ctx.shadowColor = "rgba(0,0,0,0.35)";

    ctx.shadowBlur = 9;

    ctx.strokeStyle = "#963e18";

    ctx.lineWidth = 13;


    ctx.beginPath();

    ctx.arc(
        x,
        y,
        CONFIG.HOOP_RADIUS,
        0,
        Math.PI * 2
    );

    ctx.stroke();


    // Aro luminoso.

    ctx.shadowBlur = 4;

    ctx.shadowColor = "#ffc078";

    ctx.strokeStyle = "#ffad50";

    ctx.lineWidth = 8;


    ctx.beginPath();

    ctx.arc(
        x,
        y,
        CONFIG.HOOP_RADIUS,
        0,
        Math.PI * 2
    );

    ctx.stroke();


    // Área interior de enceste.

    ctx.shadowBlur = 0;

    ctx.fillStyle = "rgba(255,232,185,0.19)";

    ctx.beginPath();

    ctx.arc(
        x,
        y,
        CONFIG.HOOP_SCORE_RADIUS,
        0,
        Math.PI * 2
    );

    ctx.fill();


    ctx.restore();

}


/* =========================================================
   27. DIBUJAR CARGAS POSITIVAS Y NEGATIVAS
========================================================= */

function drawCharge(charge) {

    const positive = charge.charge > 0;


    const color = positive
        ? "#ed4659"
        : "#3989f4";


    const gradient = ctx.createRadialGradient(

        charge.x - 6,
        charge.y - 7,
        2,

        charge.x,
        charge.y,
        CONFIG.CHARGE_RADIUS + 4

    );


    if (positive) {

        gradient.addColorStop(0, "#ffb5b8");

        gradient.addColorStop(0.45, "#ff5c68");

        gradient.addColorStop(1, "#a51f39");

    } else {

        gradient.addColorStop(0, "#b3d9ff");

        gradient.addColorStop(0.45, "#438df1");

        gradient.addColorStop(1, "#17458e");

    }


    ctx.save();


    // Resplandor exterior.

    ctx.shadowColor = color;

    ctx.shadowBlur = 17;


    // Círculo principal.

    ctx.beginPath();

    ctx.arc(
        charge.x,
        charge.y,
        CONFIG.CHARGE_RADIUS,
        0,
        Math.PI * 2
    );

    ctx.fillStyle = gradient;

    ctx.fill();


    ctx.shadowBlur = 0;

    ctx.strokeStyle = "rgba(255,255,255,0.8)";

    ctx.lineWidth = 1.5;

    ctx.stroke();


    // Signo.

    ctx.fillStyle = "#ffffff";

    ctx.font = "bold 22px Arial";

    ctx.textAlign = "center";

    ctx.textBaseline = "middle";

    ctx.fillText(
        positive ? "+" : "−",
        charge.x,
        charge.y - 1
    );


    // Etiqueta del valor.

    ctx.font = "bold 10px Arial";

    ctx.fillStyle = "#ffffff";

    ctx.shadowColor = "rgba(0,0,0,0.6)";

    ctx.shadowBlur = 4;


    ctx.fillText(
        positive ? "+1 μC" : "−1 μC",
        charge.x,
        charge.y + 30
    );


    ctx.restore();

}


/* =========================================================
   28. DIBUJAR PELOTA DE BALONCESTO
========================================================= */

function drawBasketballBall() {

    const ball = getBallPixels();

    const radius = CONFIG.BALL_RADIUS;


    ctx.save();


    // Sombra sobre la cancha.

    ctx.fillStyle = "rgba(39,24,12,0.35)";

    ctx.beginPath();

    ctx.ellipse(
        ball.x + 4,
        ball.y + 6,
        radius * 1.16,
        radius * 0.92,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();


    // Gradiente tridimensional.

    const ballGradient = ctx.createRadialGradient(

        ball.x - radius * 0.38,

        ball.y - radius * 0.45,

        radius * 0.05,

        ball.x + radius * 0.15,

        ball.y + radius * 0.2,

        radius * 1.35

    );


    ballGradient.addColorStop(0, "#ffd18b");

    ballGradient.addColorStop(0.23, "#f6a248");

    ballGradient.addColorStop(0.7, "#dd7025");

    ballGradient.addColorStop(1, "#783914");


    // Cuerpo circular.

    ctx.beginPath();

    ctx.arc(
        ball.x,
        ball.y,
        radius,
        0,
        Math.PI * 2
    );

    ctx.fillStyle = ballGradient;

    ctx.fill();


    // Costuras características del balón.

    ctx.save();


    ctx.beginPath();

    ctx.arc(
        ball.x,
        ball.y,
        radius - 0.5,
        0,
        Math.PI * 2
    );

    ctx.clip();


    ctx.strokeStyle = "#51301d";

    ctx.lineWidth = 2.4;

    ctx.lineCap = "round";


    // Curva vertical izquierda.

    ctx.beginPath();

    ctx.moveTo(ball.x - radius * 0.35, ball.y - radius);

    ctx.bezierCurveTo(

        ball.x + radius * 0.65,

        ball.y - radius * 0.38,

        ball.x - radius * 0.65,

        ball.y + radius * 0.38,

        ball.x + radius * 0.35,

        ball.y + radius

    );

    ctx.stroke();


    // Curva vertical derecha.

    ctx.beginPath();

    ctx.moveTo(ball.x + radius * 0.35, ball.y - radius);

    ctx.bezierCurveTo(

        ball.x - radius * 0.65,

        ball.y - radius * 0.38,

        ball.x + radius * 0.65,

        ball.y + radius * 0.38,

        ball.x - radius * 0.35,

        ball.y + radius

    );

    ctx.stroke();


    // Costura horizontal.

    ctx.beginPath();

    ctx.moveTo(ball.x - radius, ball.y);

    ctx.bezierCurveTo(

        ball.x - radius * 0.3,

        ball.y - radius * 0.35,

        ball.x + radius * 0.3,

        ball.y + radius * 0.35,

        ball.x + radius,

        ball.y

    );

    ctx.stroke();


    ctx.restore();


    // Contorno y brillo.

    ctx.strokeStyle = "rgba(73,35,13,0.75)";

    ctx.lineWidth = 1.8;


    ctx.beginPath();

    ctx.arc(
        ball.x,
        ball.y,
        radius,
        0,
        Math.PI * 2
    );

    ctx.stroke();


    ctx.strokeStyle = "rgba(255,222,174,0.65)";

    ctx.lineWidth = 1;


    ctx.beginPath();

    ctx.arc(
        ball.x - 2,
        ball.y - 2,
        radius - 2,
        Math.PI * 1.15,
        Math.PI * 1.75
    );

    ctx.stroke();


    ctx.restore();

}


/* =========================================================
   29. DIBUJAR ESTELA DE MOVIMIENTO
========================================================= */

function drawTrail() {

    state.trail.forEach((point, index) => {

        const alpha = (index + 1) /
            (state.trail.length + 1) * 0.2;


        const radius =
            2 + index / state.trail.length * 4;


        ctx.beginPath();

        ctx.arc(
            point.x,
            point.y,
            radius,
            0,
            Math.PI * 2
        );


        ctx.fillStyle =
            `rgba(255,226,165,${alpha})`;

        ctx.fill();

    });

}


/* =========================================================
   30. DIBUJAR VECTOR DE FUERZA
========================================================= */

function drawForceVector() {

    if (state.charges.length === 0) {
        return;
    }


    const force = state.force;

    const magnitude = force.magnitude;


    if (magnitude < 1e-12) {
        return;
    }


    const ball = getBallPixels();


    // El factor es exclusivamente visual.
    // No interviene en el cálculo físico.

    const visualLength = clamp(
        magnitude * 2200,
        18,
        100
    );


    const directionX = force.x / magnitude;

    const directionY = force.y / magnitude;


    const endX =
        ball.x + directionX * visualLength;

    const endY =
        ball.y + directionY * visualLength;


    ctx.save();


    ctx.strokeStyle = "#fff0b1";

    ctx.fillStyle = "#fff0b1";

    ctx.lineWidth = 3;


    ctx.beginPath();

    ctx.moveTo(ball.x, ball.y);

    ctx.lineTo(endX, endY);

    ctx.stroke();


    // Punta de flecha.

    const angle = Math.atan2(
        directionY,
        directionX
    );


    ctx.beginPath();

    ctx.moveTo(endX, endY);

    ctx.lineTo(
        endX - 10 * Math.cos(angle - Math.PI / 6),
        endY - 10 * Math.sin(angle - Math.PI / 6)
    );

    ctx.lineTo(
        endX - 10 * Math.cos(angle + Math.PI / 6),
        endY - 10 * Math.sin(angle + Math.PI / 6)
    );

    ctx.closePath();

    ctx.fill();


    ctx.restore();

}


/* =========================================================
   31. RENDERIZADO GENERAL
========================================================= */

function drawGame() {

    ctx.clearRect(
        0,
        0,
        CONFIG.WIDTH,
        CONFIG.HEIGHT
    );


    drawCourt();

    drawWalls();

    drawBasket();

    drawTrail();


    state.charges.forEach(drawCharge);


    drawBasketballBall();

    drawForceVector();

}


/* =========================================================
   32. INTERFAZ Y PROGRESO
========================================================= */

function updateGameUI() {

    chargeCount.textContent =
        `Cargas colocadas: ${state.charges.length}`;


    progressPoints.forEach(point => {

        const level = Number(
            point.dataset.progress
        );


        point.classList.toggle(
            "current",
            level === state.level
        );


        point.classList.toggle(
            "completed",
            state.completedLevels.has(level)
        );

    });

}


/* =========================================================
   33. EVENTO DE CLIC SOBRE EL TABLERO
========================================================= */

function handleCourtClick(event) {

    if (state.suppressNextClick) {

        state.suppressNextClick = false;

        return;

    }


    if (state.running || state.won) {
        return;
    }


    const position = getCanvasCoordinates(event);

    const existingCharge = findChargeAt(position);


    // Clic sobre una carga: quitarla.

    if (existingCharge) {

        removeCharge(existingCharge.id);

        return;

    }


    addCharge(position);

}


/* =========================================================
   34. EVENTOS DE LA INTERFAZ
========================================================= */

function configureEvents() {


    // Herramientas de cargas.

    positiveButton.addEventListener("click", () => {

        selectCharge("positive");

    });


    negativeButton.addEventListener("click", () => {

        selectCharge("negative");

    });


    // Controles del juego.

    startButton.addEventListener(
        "click",
        startSimulation
    );


    pauseButton.addEventListener(
        "click",
        pauseSimulation
    );


    resetButton.addEventListener(
        "click",
        resetSimulation
    );


    clearChargesButton.addEventListener(
        "click",
        clearAllCharges
    );


    // Selector de nivel.

    levelSelect.addEventListener("change", () => {

        loadLevel(levelSelect.value);

    });


    // Botón de siguiente nivel.

    nextLevelButton.addEventListener("click", () => {

        if (state.level < 5) {

            loadLevel(state.level + 1);

        } else {

            loadLevel(1);

        }

    });


    // Tablero.

    canvas.addEventListener(
        "click",
        handleCourtClick
    );


    canvas.addEventListener(
        "contextmenu",
        handleContextMenu
    );


    // Arrastre de las cargas.

    canvas.addEventListener(
        "pointerdown",
        handleChargePointerDown
    );


    window.addEventListener(
        "pointermove",
        handleChargePointerMove
    );


    window.addEventListener(
        "pointerup",
        handleChargePointerUp
    );

}


/* =========================================================
   35. INICIALIZACIÓN DEL JUEGO
========================================================= */

export function initBasketball() {

    if (state.initialized) {
        return;
    }


    // Canvas.

    canvas = document.getElementById(
        "basketballCanvas"
    );


    if (!canvas) {

        console.error(
            "Physics Lab: no se encontró basketballCanvas."
        );

        return;

    }


    ctx = canvas.getContext("2d");


    if (!ctx) {

        console.error(
            "Physics Lab: no se pudo inicializar Canvas 2D."
        );

        return;

    }


    // Selector y controles.

    levelSelect = document.getElementById("levelSelect");

    startButton = document.getElementById("startGameButton");

    pauseButton = document.getElementById("pauseGameButton");

    resetButton = document.getElementById("resetGameButton");

    clearChargesButton = document.getElementById("clearChargesButton");


    positiveButton = document.getElementById("positiveChargeButton");

    negativeButton = document.getElementById("negativeChargeButton");


    // Información del nivel.

    currentLevelTitle = document.getElementById(
        "currentLevelTitle"
    );

    currentLevelDescription = document.getElementById(
        "currentLevelDescription"
    );


    // Información del juego.

    gameStatusText = document.getElementById("gameStatusText");

    chargeCount = document.getElementById("chargeCount");

    selectedChargeInfo = document.getElementById(
        "selectedChargeInfo"
    );


    // Fuerzas.

    resultantForce = document.getElementById("resultantForce");

    forceX = document.getElementById("forceX");

    forceY = document.getElementById("forceY");


    // Progreso.

    progressPoints = document.querySelectorAll(
        ".level-point"
    );


    // Pantalla de victoria.

    gameOverlay = document.getElementById("gameOverlay");

    overlayTitle = document.getElementById("overlayTitle");

    overlayMessage = document.getElementById("overlayMessage");

    nextLevelButton = document.getElementById("nextLevelButton");


    const requiredElements = [

        levelSelect,

        startButton,

        pauseButton,

        resetButton,

        clearChargesButton,

        positiveButton,

        negativeButton,

        currentLevelTitle,

        currentLevelDescription,

        gameStatusText,

        chargeCount,

        selectedChargeInfo,

        resultantForce,

        forceX,

        forceY,

        gameOverlay,

        overlayTitle,

        overlayMessage,

        nextLevelButton

    ];


    if (requiredElements.some(element => !element)) {

        console.error(
            "Physics Lab: faltan elementos HTML del juego."
        );

        return;

    }


    // Configuración del tablero.

    canvas.width = CONFIG.WIDTH;

    canvas.height = CONFIG.HEIGHT;


    // Eventos.

    configureEvents();


    // Estado inicial.

    state.initialized = true;

    loadLevel(1);


    updateGameUI();

    updateForceDisplay();

    drawGame();


    console.info("--------------------------------------");

    console.info("PHYSICS LAB - BALONCESTO ELÉCTRICO");

    console.info("Motor físico inicializado.");

    console.info("Carga de la pelota: +1 μC.");

    console.info("Carga de los elementos: ±1 μC.");

    console.info("Niveles disponibles: 5.");

    console.info("--------------------------------------");

}


/* =========================================================
   FIN DE BASKETBALL.JS
========================================================= */
