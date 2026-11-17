
/* =========================================================
   PHYSICS LABORATORY
   MÓDULO 01: CONSTRUCCIÓN DE CIRCUITOS
========================================================= */

import { calculatePower } from "./electricity.js";


/* =========================================================
   1. CONFIGURACIÓN
========================================================= */

const SVG_NS = "http://www.w3.org/2000/svg";

const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 540;

const TERMINAL_OFFSET = 38;

const AMMETER_RESISTANCE = 0.001;
const VOLTMETER_RESISTANCE = 1e9;

const COMPONENTS = {

    battery: { name: "Batería", defaultValue: 9 },
    resistor: { name: "Resistencia", defaultValue: 100 },
    bulb: { name: "Bombilla", defaultValue: 20 },
    switch: { name: "Interruptor" },
    ammeter: { name: "Amperímetro" },
    voltmeter: { name: "Voltímetro" }

};


/* =========================================================
   2. ESTADO DEL SIMULADOR
========================================================= */

const state = {

    components: [],
    wires: [],

    selectedId: null,

    wireMode: false,
    pendingTerminal: null,

    activeDrag: null,

    nextId: 1,

    solution: null,

    initialized: false

};


/* =========================================================
   3. REFERENCIAS HTML
========================================================= */

let circuitSvg;
let wireLayer;
let componentLayer;
let terminalLayer;

let circuitStage;
let emptyMessage;

let componentProperties;
let circuitStatus;

let wireModeButton;
let clearCircuitButton;

let measuredVoltage;
let measuredCurrent;
let measuredResistance;
let measuredPower;


/* =========================================================
   4. UTILIDADES SVG
========================================================= */

function createSVGElement(tag, attributes = {}) {

    const element = document.createElementNS(SVG_NS, tag);

    Object.entries(attributes).forEach(([key, value]) => {

        element.setAttribute(key, String(value));

    });

    return element;

}


function addSVGText(parent, x, y, text, options = {}) {

    const element = createSVGElement("text", {

        x,
        y,

        fill: options.fill || "#dce8f5",

        "font-size": options.size || 12,

        "font-weight": options.weight || 600,

        "text-anchor": options.anchor || "middle",

        "dominant-baseline": "middle"

    });

    element.textContent = text;

    parent.appendChild(element);

    return element;

}


/**
 * Convierte coordenadas de pantalla a coordenadas SVG.
 */

function getSVGCoordinates(clientX, clientY) {

    const rect = circuitSvg.getBoundingClientRect();

    return {

        x: ((clientX - rect.left) / rect.width) * VIEW_WIDTH,

        y: ((clientY - rect.top) / rect.height) * VIEW_HEIGHT

    };

}


/* =========================================================
   5. ADMINISTRACIÓN DE COMPONENTES
========================================================= */

function getComponent(componentId) {

    return state.components.find(
        component => component.id === componentId
    );

}


function addComponent(type, position = null) {

    if (!COMPONENTS[type]) {

        console.warn("Componente desconocido:", type);

        return;

    }


    const index = state.components.length;

    const defaultX = 165 + (index % 4) * 210;

    const defaultY = 115 + Math.floor(index / 4) * 125;


    const x = position
        ? Math.max(50, Math.min(VIEW_WIDTH - 50, position.x))
        : defaultX;

    const y = position
        ? Math.max(65, Math.min(VIEW_HEIGHT - 55, position.y))
        : defaultY;


    const component = {

        id: `component-${state.nextId++}`,

        type,

        name: COMPONENTS[type].name,

        x,
        y,

        value: COMPONENTS[type].defaultValue ?? null,

        isClosed: false

    };


    state.components.push(component);

    state.selectedId = component.id;


    renderCircuit();

    renderProperties();

    refreshSimulation();


    announce(`${component.name} añadido.`);

    return component;

}


/* =========================================================
   6. COORDENADAS DE TERMINALES
========================================================= */

function getTerminalPosition(reference) {

    const component = getComponent(reference.componentId);

    if (!component) {
        return null;
    }


    return {

        x: component.x + (
            reference.side === "a"
                ? -TERMINAL_OFFSET
                : TERMINAL_OFFSET
        ),

        y: component.y

    };

}


function terminalKey(reference) {

    return `${reference.componentId}:${reference.side}`;

}


/* =========================================================
   7. DIBUJO DE CABLES
========================================================= */

function drawWires() {

    wireLayer.replaceChildren();


    state.wires.forEach(wire => {

        const start = getTerminalPosition(wire.from);

        const end = getTerminalPosition(wire.to);

        if (!start || !end) {
            return;
        }


        const path = createSVGElement("path", {

            d: `M ${start.x} ${start.y} L ${end.x} ${end.y}`,

            fill: "none",

            stroke: "#70bfe9",

            "stroke-width": 4,

            "stroke-linecap": "round",

            "stroke-linejoin": "round"

        });


        path.style.filter =
            "drop-shadow(0 0 3px rgba(73,166,233,0.25))";


        wireLayer.appendChild(path);

    });

}


/* =========================================================
   8. DIBUJO DE COMPONENTES
========================================================= */

function drawComponent(component) {

    const group = createSVGElement("g", {

        transform: `translate(${component.x}, ${component.y})`,

        "data-component-id": component.id,

        class: "circuit-component"

    });


    group.style.cursor = "grab";


    // Fondo.

    group.appendChild(createSVGElement("rect", {

        x: -27,
        y: -25,

        width: 54,
        height: 50,

        rx: 9,

        fill: state.selectedId === component.id
            ? "#28486b"
            : "#1c314a",

        stroke: state.selectedId === component.id
            ? "#68bcf5"
            : "#58718c",

        "stroke-width": state.selectedId === component.id
            ? 2
            : 1.2

    }));


    switch (component.type) {


        case "battery": {

            group.appendChild(createSVGElement("line", {

                x1: -9, y1: -14,

                x2: -9, y2: 14,

                stroke: "#f7cb74",

                "stroke-width": 4,

                "stroke-linecap": "round"

            }));

            group.appendChild(createSVGElement("line", {

                x1: 9, y1: -8,

                x2: 9, y2: 8,

                stroke: "#dce8f5",

                "stroke-width": 3,

                "stroke-linecap": "round"

            }));

            addSVGText(group, -17, 0, "+", {
                fill: "#f7cb74",
                size: 11
            });

            addSVGText(group, 17, 0, "−", {
                fill: "#dce8f5",
                size: 11
            });

            break;

        }


        case "resistor": {

            group.appendChild(createSVGElement("path", {

                d: "M -21 0 L -13 0 L -8 -9 L 0 9 L 8 -9 L 13 0 L 21 0",

                fill: "none",

                stroke: "#f6c779",

                "stroke-width": 3,

                "stroke-linejoin": "round",

                "stroke-linecap": "round"

            }));

            break;

        }


        case "bulb": {

            group.appendChild(createSVGElement("circle", {

                cx: 0,
                cy: 0,
                r: 13,

                fill: component.isLit ? "#ffdd83" : "#263d58",

                stroke: "#f4c96f",

                "stroke-width": 2

            }));

            group.appendChild(createSVGElement("path", {

                d: "M -6 -7 L 6 7 M -6 7 L 6 -7",

                stroke: "#f5d99b",

                "stroke-width": 2,

                "stroke-linecap": "round"

            }));

            break;

        }


        case "switch": {

            group.appendChild(createSVGElement("circle", {

                cx: -17, cy: 0, r: 3.5,
                fill: "#e2eaf4"

            }));

            group.appendChild(createSVGElement("circle", {

                cx: 17, cy: 0, r: 3.5,
                fill: "#e2eaf4"

            }));

            group.appendChild(createSVGElement("line", {

                x1: -17,
                y1: 0,

                x2: component.isClosed ? 17 : 9,

                y2: component.isClosed ? 0 : -12,

                stroke: component.isClosed ? "#43d5a0" : "#e2eaf4",

                "stroke-width": 3,

                "stroke-linecap": "round"

            }));

            break;

        }


        case "ammeter":

        case "voltmeter": {

            group.appendChild(createSVGElement("circle", {

                cx: 0,
                cy: 0,

                r: 14,

                fill: "#203b55",

                stroke: component.type === "ammeter"
                    ? "#65c5e8"
                    : "#b5a0fa",

                "stroke-width": 2

            }));

            addSVGText(

                group,

                0,
                1,

                component.type === "ammeter" ? "A" : "V",

                {
                    fill: component.type === "ammeter"
                        ? "#8de0ff"
                        : "#cbb8ff",

                    size: 17,
                    weight: 800
                }

            );

            break;

        }

    }


    // Etiqueta.

    let label = component.name;


    if (
        component.type === "battery" ||
        component.type === "resistor" ||
        component.type === "bulb"
    ) {

        label += ` · ${component.value}`;

        label += component.type === "battery" ? " V" : " Ω";

    }


    if (component.type === "switch") {

        label += component.isClosed
            ? " · Cerrado"
            : " · Abierto";

    }


    addSVGText(group, 0, 38, label, {

        fill: "#d6e2f0",

        size: 10

    });


    // Arrastre.

    group.addEventListener("pointerdown", event => {

        event.preventDefault();

        event.stopPropagation();

        selectComponent(component.id);

        if (state.wireMode) {
            return;
        }


        const point = getSVGCoordinates(
            event.clientX,
            event.clientY
        );


        state.activeDrag = {

            componentId: component.id,

            offsetX: point.x - component.x,

            offsetY: point.y - component.y

        };

    });


    componentLayer.appendChild(group);

}


/* =========================================================
   9. DIBUJO DE TERMINALES
========================================================= */

function drawTerminals() {

    terminalLayer.replaceChildren();


    state.components.forEach(component => {

        ["a", "b"].forEach(side => {

            const position = getTerminalPosition({

                componentId: component.id,

                side

            });


            const isPending =
                state.pendingTerminal &&
                state.pendingTerminal.componentId === component.id &&
                state.pendingTerminal.side === side;


            const terminal = createSVGElement("circle", {

                cx: position.x,

                cy: position.y,

                r: isPending ? 8 : 6,

                fill: isPending ? "#f7c66d" : "#8fd0f3",

                stroke: "#102035",

                "stroke-width": 2

            });


            terminal.style.cursor = "crosshair";


            terminal.addEventListener("click", event => {

                event.preventDefault();

                event.stopPropagation();

                handleTerminalClick({

                    componentId: component.id,

                    side

                });

            });


            terminalLayer.appendChild(terminal);

        });

    });

}


/* =========================================================
   10. DIBUJO GENERAL
========================================================= */

function renderCircuit() {

    drawWires();

    componentLayer.replaceChildren();

    state.components.forEach(drawComponent);

    drawTerminals();


    emptyMessage.style.display =
        state.components.length === 0 ? "flex" : "none";

}


/* =========================================================
   11. CONEXIONES ENTRE TERMINALES
========================================================= */

function handleTerminalClick(reference) {

    if (!state.wireMode) {

        selectComponent(reference.componentId);

        return;

    }


    if (!state.pendingTerminal) {

        state.pendingTerminal = reference;

        renderCircuit();

        circuitStatus.textContent =
            "Primer terminal seleccionado. Elige el segundo.";

        return;

    }


    if (
        terminalKey(state.pendingTerminal) ===
        terminalKey(reference)
    ) {

        state.pendingTerminal = null;

        renderCircuit();

        updateStatus();

        return;

    }


    const wire = {

        from: state.pendingTerminal,

        to: reference

    };


    const duplicate = state.wires.some(existing => {

        const same =
            terminalKey(existing.from) === terminalKey(wire.from) &&
            terminalKey(existing.to) === terminalKey(wire.to);

        const reversed =
            terminalKey(existing.from) === terminalKey(wire.to) &&
            terminalKey(existing.to) === terminalKey(wire.from);

        return same || reversed;

    });


    if (!duplicate) {

        state.wires.push(wire);

    }


    state.pendingTerminal = null;

    renderCircuit();

    refreshSimulation();


    announce(
        duplicate
            ? "Esta conexión ya existe."
            : "Cable conectado."
    );

}


/* =========================================================
   12. MODO DE CONEXIÓN
========================================================= */

function toggleWireMode() {

    state.wireMode = !state.wireMode;

    state.pendingTerminal = null;


    wireModeButton.classList.toggle(
        "active",
        state.wireMode
    );


    wireModeButton.textContent = state.wireMode
        ? "Cancelar cable"
        : "+ Cable";


    renderCircuit();

    updateStatus();


    announce(
        state.wireMode
            ? "Modo de conexión activado. Selecciona dos terminales."
            : "Modo de conexión desactivado."
    );

}


/* =========================================================
   13. SELECCIÓN DE COMPONENTES
========================================================= */

function selectComponent(componentId) {

    const component = getComponent(componentId);

    if (!component) {
        return;
    }


    state.selectedId = componentId;

    renderCircuit();

    renderProperties();

    refreshMeasurementsOnly();

}


/* =========================================================
   14. PANEL DE PROPIEDADES
========================================================= */

function renderProperties() {

    const component = getComponent(state.selectedId);


    if (!component) {

        componentProperties.innerHTML = `
            <p class="empty-property">
                Selecciona un componente para modificar sus propiedades.
            </p>
        `;

        return;

    }


    let content = `

        <div style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            margin-bottom:15px;
        ">

            <strong style="font-size:13px;color:#edf3fb;">
                ${component.name}
            </strong>

            <span style="font-size:10px;color:#8fbde0;">
                ${component.id}
            </span>

        </div>

    `;


    if (component.type === "battery") {

        content += `

            <label style="
                display:block;
                color:#a5b4c8;
                font-size:11px;
                margin-bottom:6px;
            ">
                Voltaje de la batería (V)
            </label>

            <input
                id="componentValueInput"
                type="number"
                min="-50"
                max="50"
                step="0.1"
                value="${component.value}"
                style="
                    width:100%;
                    padding:10px;
                    margin-bottom:13px;
                    border:1px solid #3c5978;
                    border-radius:7px;
                    background:#101c2d;
                    color:#edf3fb;
                "
            />

        `;

    }


    if (
        component.type === "resistor" ||
        component.type === "bulb"
    ) {

        content += `

            <label style="
                display:block;
                color:#a5b4c8;
                font-size:11px;
                margin-bottom:6px;
            ">
                Resistencia eléctrica (Ω)
            </label>

            <input
                id="componentValueInput"
                type="number"
                min="0.1"
                max="1000000"
                step="any"
                value="${component.value}"
                style="
                    width:100%;
                    padding:10px;
                    margin-bottom:13px;
                    border:1px solid #3c5978;
                    border-radius:7px;
                    background:#101c2d;
                    color:#edf3fb;
                "
            />

        `;

    }


    if (component.type === "switch") {

        content += `

            <p style="
                color:#a5b4c8;
                font-size:11px;
                margin-bottom:12px;
            ">
                Estado actual:

                <strong style="color:#edf3fb;">
                    ${component.isClosed ? "Cerrado" : "Abierto"}
                </strong>
            </p>

            <button
                id="toggleSwitchButton"
                type="button"
                style="
                    width:100%;
                    padding:10px;
                    border:1px solid #476789;
                    border-radius:8px;
                    background:#203b55;
                    color:white;
                    font-size:11px;
                    font-weight:bold;
                    cursor:pointer;
                    margin-bottom:13px;
                "
            >
                ${component.isClosed ? "Abrir interruptor" : "Cerrar interruptor"}
            </button>

        `;

    }


    if (
        component.type === "ammeter" ||
        component.type === "voltmeter"
    ) {

        content += `

            <p style="
                color:#a5b4c8;
                font-size:11px;
                line-height:1.7;
                margin-bottom:13px;
            ">

                ${
                    component.type === "ammeter"
                        ? "Instrumento para medir corriente. Debe conectarse en serie."
                        : "Instrumento para medir voltaje. Debe conectarse en paralelo."
                }

            </p>

        `;

    }


    content += `

        <button
            id="deleteSelectedComponent"
            type="button"
            style="
                width:100%;
                padding:10px;
                border:1px solid rgba(255,101,117,0.35);
                border-radius:8px;
                background:rgba(255,101,117,0.1);
                color:#ff8792;
                font-size:11px;
                font-weight:bold;
                cursor:pointer;
            "
        >
            Eliminar componente
        </button>

    `;


    componentProperties.innerHTML = content;


    // Modificar valores numéricos.

    const valueInput = document.getElementById(
        "componentValueInput"
    );


    if (valueInput) {

        valueInput.addEventListener("change", () => {

            const value = Number(valueInput.value);


            if (!Number.isFinite(value)) {
                valueInput.value = component.value;
                return;
            }


            if (
                component.type === "battery" &&
                (value < -50 || value > 50)
            ) {

                announce("El voltaje debe estar entre -50 y 50 voltios.");

                valueInput.value = component.value;

                return;

            }


            if (
                (component.type === "resistor" ||
                 component.type === "bulb") &&
                (value <= 0 || value > 1000000)
            ) {

                announce("Introduce una resistencia positiva válida.");

                valueInput.value = component.value;

                return;

            }


            component.value = value;

            renderCircuit();

            renderProperties();

            refreshSimulation();

        });

    }


    // Interruptores.

    const toggleButton = document.getElementById(
        "toggleSwitchButton"
    );


    if (toggleButton) {

        toggleButton.addEventListener("click", () => {

            component.isClosed = !component.isClosed;

            renderCircuit();

            renderProperties();

            refreshSimulation();

        });

    }


    // Eliminación.

    const deleteButton = document.getElementById(
        "deleteSelectedComponent"
    );


    if (deleteButton) {

        deleteButton.addEventListener("click", () => {

            deleteComponent(component.id);

        });

    }

}


/* =========================================================
   15. ELIMINAR COMPONENTES
========================================================= */

function deleteComponent(componentId) {

    state.components = state.components.filter(
        component => component.id !== componentId
    );


    state.wires = state.wires.filter(wire => {

        return (
            wire.from.componentId !== componentId &&
            wire.to.componentId !== componentId
        );

    });


    if (state.selectedId === componentId) {

        state.selectedId = null;

    }


    if (
        state.pendingTerminal &&
        state.pendingTerminal.componentId === componentId
    ) {

        state.pendingTerminal = null;

    }


    renderCircuit();

    renderProperties();

    refreshSimulation();


    announce("Componente eliminado.");

}


/* =========================================================
   16. ESTRUCTURA DE RED: UNION-FIND
========================================================= */

function createDisjointSet(keys) {

    const parent = new Map();

    const rank = new Map();


    keys.forEach(key => {

        parent.set(key, key);

        rank.set(key, 0);

    });


    function find(key) {

        if (!parent.has(key)) {

            throw new Error(
                `Terminal desconocido: ${key}`
            );

        }


        if (parent.get(key) !== key) {

            parent.set(
                key,
                find(parent.get(key))
            );

        }

        return parent.get(key);

    }


    function union(a, b) {

        let rootA = find(a);

        let rootB = find(b);


        if (rootA === rootB) {
            return;
        }


        if (rank.get(rootA) < rank.get(rootB)) {

            [rootA, rootB] = [rootB, rootA];

        }


        parent.set(rootB, rootA);


        if (rank.get(rootA) === rank.get(rootB)) {

            rank.set(
                rootA,
                rank.get(rootA) + 1
            );

        }

    }


    return { find, union };

}


/* =========================================================
   17. DESCOMPOSICIÓN DE COMPONENTES ELÉCTRICOS
========================================================= */

function getElectricalBranches(disjointSet) {

    const branches = [];


    state.components.forEach(component => {

        const a = disjointSet.find(`${component.id}:a`);

        const b = disjointSet.find(`${component.id}:b`);


        const branch = {

            id: component.id,

            type: component.type,

            a,

            b,

            resistance: null,

            voltageSource: null,

            active: true,

            voltage: 0,

            current: 0,

            power: 0

        };


        switch (component.type) {

            case "battery":

                branch.voltageSource = component.value;

                break;


            case "resistor":

            case "bulb":

                branch.resistance = component.value;

                break;


            case "switch":

                if (component.isClosed) {

                    branch.resistance = AMMETER_RESISTANCE;

                } else {

                    branch.active = false;

                    branch.resistance = Infinity;

                }

                break;


            case "ammeter":

                branch.resistance = AMMETER_RESISTANCE;

                break;


            case "voltmeter":

                branch.resistance = VOLTMETER_RESISTANCE;

                break;

        }


        branches.push(branch);

    });


    return branches;

}


/* =========================================================
   18. COMPONENTES CONEXOS DE LA RED
========================================================= */

function findConnectedNodes(nodes, branches) {

    const adjacency = new Map();


    nodes.forEach(node => {

        adjacency.set(node, new Set());

    });


    branches
        .filter(branch => branch.active)
        .forEach(branch => {

            if (branch.a === branch.b) {
                return;
            }


            adjacency.get(branch.a).add(branch.b);

            adjacency.get(branch.b).add(branch.a);

        });


    const visited = new Set();

    const groups = [];


    nodes.forEach(start => {

        if (visited.has(start)) {
            return;
        }


        const group = [];

        const queue = [start];

        visited.add(start);


        while (queue.length > 0) {

            const current = queue.shift();

            group.push(current);


            adjacency.get(current).forEach(neighbor => {

                if (!visited.has(neighbor)) {

                    visited.add(neighbor);

                    queue.push(neighbor);

                }

            });

        }


        groups.push(group);

    });


    return groups;

}


/* =========================================================
   19. SOLUCIONADOR DE SISTEMAS LINEALES
========================================================= */

/**
 * Eliminación de Gauss con pivoteo parcial.
 * Resuelve A*x = b.
 */

function solveLinearSystem(matrix, vector) {

    const n = vector.length;


    if (n === 0) {
        return [];
    }


    const augmented = matrix.map((row, index) => [

        ...row,

        vector[index]

    ]);


    for (let column = 0; column < n; column++) {

        let pivotRow = column;

        let maximum = Math.abs(
            augmented[column][column]
        );


        for (let row = column + 1; row < n; row++) {

            const value = Math.abs(
                augmented[row][column]
            );


            if (value > maximum) {

                maximum = value;

                pivotRow = row;

            }

        }


        if (maximum < 1e-18 || !Number.isFinite(maximum)) {

            throw new Error(
                "Sistema singular: revisa las conexiones y las fuentes de voltaje."
            );

        }


        if (pivotRow !== column) {

            [augmented[column], augmented[pivotRow]] = [

                augmented[pivotRow],

                augmented[column]

            ];

        }


        const pivot = augmented[column][column];


        for (let row = column + 1; row < n; row++) {

            const factor =
                augmented[row][column] / pivot;


            if (factor === 0) {
                continue;
            }


            augmented[row][column] = 0;


            for (let j = column + 1; j <= n; j++) {

                augmented[row][j] -=
                    factor * augmented[column][j];

            }

        }

    }


    const solution = new Array(n).fill(0);


    for (let i = n - 1; i >= 0; i--) {

        let sum = augmented[i][n];


        for (let j = i + 1; j < n; j++) {

            sum -= augmented[i][j] * solution[j];

        }


        solution[i] = sum / augmented[i][i];


        if (!Number.isFinite(solution[i])) {

            throw new Error(
                "La solución contiene valores no finitos."
            );

        }

    }


    return solution;

}


/* =========================================================
   20. SOLUCIONADOR DE CIRCUITOS DC
========================================================= */

function solveCircuit() {

    const terminalKeys = [];


    state.components.forEach(component => {

        terminalKeys.push(`${component.id}:a`);

        terminalKeys.push(`${component.id}:b`);

    });


    const disjointSet = createDisjointSet(terminalKeys);


    // Los cables ideales unen terminales.

    state.wires.forEach(wire => {

        disjointSet.union(
            terminalKey(wire.from),
            terminalKey(wire.to)
        );

    });


    const nodes = [

        ...new Set(
            terminalKeys.map(key => disjointSet.find(key))
        )

    ];


    const branches = getElectricalBranches(disjointSet);


    const activeBranches = branches.filter(
        branch => branch.active
    );


    const voltageSources = activeBranches.filter(
        branch => branch.voltageSource !== null
    );


    const resistiveBranches = activeBranches.filter(
        branch => branch.resistance !== null
    );


    // Identificar nodos conectados.

    const connectedGroups = findConnectedNodes(
        nodes,
        activeBranches
    );


    const groundNodes = new Set(
        connectedGroups.map(group => group[0])
    );


    const unknownNodes = nodes.filter(
        node => !groundNodes.has(node)
    );


    const nodeIndex = new Map();


    unknownNodes.forEach((node, index) => {

        nodeIndex.set(node, index);

    });


    const nodeCount = unknownNodes.length;

    const sourceCount = voltageSources.length;

    const matrixSize = nodeCount + sourceCount;


    const matrix = Array.from(
        { length: matrixSize },
        () => new Array(matrixSize).fill(0)
    );


    const rightHandSide = new Array(
        matrixSize
    ).fill(0);


    const getIndex = node => {

        return nodeIndex.has(node)
            ? nodeIndex.get(node)
            : null;

    };


    // Estampado de conductancias.

    resistiveBranches.forEach(branch => {

        const conductance = 1 / branch.resistance;

        const ia = getIndex(branch.a);

        const ib = getIndex(branch.b);


        if (ia !== null) {

            matrix[ia][ia] += conductance;

        }


        if (ib !== null) {

            matrix[ib][ib] += conductance;

        }


        if (ia !== null && ib !== null) {

            matrix[ia][ib] -= conductance;

            matrix[ib][ia] -= conductance;

        }

    });


    // Estampado de fuentes de voltaje.

    voltageSources.forEach((source, index) => {

        const ia = getIndex(source.a);

        const ib = getIndex(source.b);


        if (source.a === source.b) {

            throw new Error(
                "Una batería está conectada en cortocircuito."
            );

        }


        const sourceIndex = nodeCount + index;


        if (ia !== null) {

            matrix[ia][sourceIndex] += 1;

            matrix[sourceIndex][ia] += 1;

        }


        if (ib !== null) {

            matrix[ib][sourceIndex] -= 1;

            matrix[sourceIndex][ib] -= 1;

        }


        rightHandSide[sourceIndex] =
            source.voltageSource;

    });


    // Resolver ecuaciones.

    const solution = solveLinearSystem(
        matrix,
        rightHandSide
    );


    // Recuperar voltajes nodales.

    const nodeVoltages = new Map();


    nodes.forEach(node => {

        nodeVoltages.set(

            node,

            groundNodes.has(node)
                ? 0
                : solution[nodeIndex.get(node)]

        );

    });


    // Recuperar corrientes y potencias de las ramas.

    const branchesById = new Map();

    const sourceIndices = new Map();


    voltageSources.forEach((source, index) => {

        sourceIndices.set(
            source.id,
            solution[nodeCount + index]
        );

    });


    branches.forEach(branch => {

        const voltage =
            (nodeVoltages.get(branch.a) ?? 0) -
            (nodeVoltages.get(branch.b) ?? 0);


        let current = 0;

        let power = 0;


        if (branch.type === "battery") {

            // Corriente entregada por la batería.

            current = -sourceIndices.get(branch.id);

            power = Math.abs(
                branch.voltageSource * current
            );

        } else if (branch.active) {

            current = voltage / branch.resistance;

            power = current * current * branch.resistance;

        }


        branchesById.set(branch.id, {

            ...branch,

            voltage,

            current,

            power

        });

    });


    return {

        nodeVoltages,

        branchesById,

        nodeCount,

        branchCount: activeBranches.length

    };

}


/* =========================================================
   21. FORMATO DE MEDICIONES
========================================================= */

function formatMeasurement(value) {

    if (!Number.isFinite(value)) {

        return "∞";

    }


    const abs = Math.abs(value);


    if (abs !== 0 && (abs >= 100000 || abs < 0.01)) {

        return value.toExponential(2);

    }


    return value.toFixed(2);

}


/* =========================================================
   22. ACTUALIZACIÓN DE MEDICIONES
========================================================= */

function updateMeasurements(solution) {

    if (!solution) {

        measuredVoltage.textContent = "0.00";

        measuredCurrent.textContent = "0.00";

        measuredResistance.textContent = "0.00";

        measuredPower.textContent = "0.00";

        return;

    }


    const selected = getComponent(state.selectedId);


    const component =
        selected ||
        state.components.find(c => c.type === "battery") ||
        state.components.find(c =>
            c.type === "resistor" || c.type === "bulb"
        ) ||
        state.components[0];


    if (!component) {

        updateMeasurements(null);

        return;

    }


    const branch = solution.branchesById.get(component.id);


    if (!branch) {

        updateMeasurements(null);

        return;

    }


    let voltage = Math.abs(branch.voltage);

    let current = Math.abs(branch.current);

    let resistance = branch.resistance;

    let power = Math.abs(branch.power);


    if (component.type === "battery") {

        voltage = Math.abs(component.value);

        resistance = current > 1e-12
            ? voltage / current
            : Infinity;

        power = calculatePower({
            voltage,
            current
        });

    }


    if (component.type === "switch" && !component.isClosed) {

        resistance = Infinity;

    }


    measuredVoltage.textContent =
        formatMeasurement(voltage);

    measuredCurrent.textContent =
        formatMeasurement(current);

    measuredResistance.textContent =
        formatMeasurement(resistance);

    measuredPower.textContent =
        formatMeasurement(power);

}


/* =========================================================
   23. ACTUALIZACIÓN DEL ESTADO
========================================================= */

function updateStatus() {

    if (state.components.length === 0) {

        circuitStatus.textContent =
            "Esperando componentes";

        return;

    }


    const batteries = state.components.filter(
        component => component.type === "battery"
    ).length;


    if (batteries === 0) {

        circuitStatus.textContent =
            "Añade una batería para alimentar el circuito.";

        return;

    }


    if (state.wires.length === 0) {

        circuitStatus.textContent =
            "Conecta los terminales para construir el circuito.";

        return;

    }


    circuitStatus.textContent =
        `${state.components.length} componentes · ${state.wires.length} conexiones`;

}


/* =========================================================
   24. ACTUALIZACIÓN DE BOMBILLAS
========================================================= */

function updateBulbs(solution) {

    state.components.forEach(component => {

        if (component.type !== "bulb") {
            return;
        }


        const branch = solution?.branchesById.get(component.id);

        const current = branch
            ? Math.abs(branch.current)
            : 0;


        component.isLit = current > 0.01;

    });


    componentLayer.replaceChildren();

    state.components.forEach(drawComponent);

}


/* =========================================================
   25. REFRESCO DEL SIMULADOR
========================================================= */

function refreshMeasurementsOnly() {

    updateMeasurements(state.solution);

}


function refreshSimulation() {

    try {

        state.solution = solveCircuit();

        updateMeasurements(state.solution);

        updateBulbs(state.solution);

        updateStatus();

    } catch (error) {

        state.solution = null;

        updateMeasurements(null);

        circuitStatus.textContent =
            `Error de circuito: ${error.message}`;


        console.error(
            "Physics Lab - Error al resolver circuito:",
            error
        );

    }

}


/* =========================================================
   26. LIMPIAR CIRCUITO
========================================================= */

function clearCircuit() {

    state.components = [];

    state.wires = [];

    state.selectedId = null;

    state.pendingTerminal = null;

    state.activeDrag = null;

    state.solution = null;


    renderCircuit();

    renderProperties();

    refreshSimulation();


    announce("Circuito limpiado.");

}


/* =========================================================
   27. ARRASTRAR COMPONENTES
========================================================= */

function handlePointerMove(event) {

    if (!state.activeDrag) {
        return;
    }


    const component = getComponent(
        state.activeDrag.componentId
    );


    if (!component) {
        return;
    }


    const point = getSVGCoordinates(
        event.clientX,
        event.clientY
    );


    component.x = Math.max(
        45,
        Math.min(
            VIEW_WIDTH - 45,
            point.x - state.activeDrag.offsetX
        )
    );


    component.y = Math.max(
        55,
        Math.min(
            VIEW_HEIGHT - 40,
            point.y - state.activeDrag.offsetY
        )
    );


    renderCircuit();

}


function handlePointerUp() {

    if (!state.activeDrag) {
        return;
    }


    state.activeDrag = null;

    renderCircuit();

}


/* =========================================================
   28. ARRASTRAR DESDE LA PALETA
========================================================= */

function enablePaletteDrag() {

    const buttons = document.querySelectorAll(
        ".component-button"
    );


    buttons.forEach(button => {

        button.setAttribute("draggable", "true");


        button.addEventListener("dragstart", event => {

            const type = button.dataset.component;

            event.dataTransfer.setData("text/plain", type);

            event.dataTransfer.effectAllowed = "copy";

        });

    });


    circuitStage.addEventListener("dragover", event => {

        event.preventDefault();

        event.dataTransfer.dropEffect = "copy";

    });


    circuitStage.addEventListener("drop", event => {

        event.preventDefault();


        const type = event.dataTransfer.getData("text/plain");

        if (!COMPONENTS[type]) {
            return;
        }


        const point = getSVGCoordinates(
            event.clientX,
            event.clientY
        );


        addComponent(type, point);

    });

}


/* =========================================================
   29. ACCESIBILIDAD
========================================================= */

function announce(message) {

    const status = document.getElementById(
        "accessibilityStatus"
    );


    if (status) {

        status.textContent = message;

    }

}


/* =========================================================
   30. EVENTOS DE TECLADO
========================================================= */

function handleKeyboard(event) {

    if (
        event.key === "Escape" &&
        state.wireMode
    ) {

        state.wireMode = false;

        state.pendingTerminal = null;

        wireModeButton.classList.remove("active");

        wireModeButton.textContent = "+ Cable";

        renderCircuit();

        updateStatus();

    }


    if (
        (event.key === "Delete" || event.key === "Backspace") &&
        state.selectedId
    ) {

        const tag = event.target?.tagName?.toLowerCase();

        if (
            tag === "input" ||
            tag === "textarea" ||
            tag === "select"
        ) {
            return;
        }


        event.preventDefault();

        deleteComponent(state.selectedId);

    }

}


/* =========================================================
   31. INICIALIZACIÓN
========================================================= */

export function initCircuitLab() {

    if (state.initialized) {
        return;
    }


    circuitSvg = document.getElementById("circuitSvg");

    wireLayer = document.getElementById("wireLayer");

    componentLayer = document.getElementById("componentLayer");

    terminalLayer = document.getElementById("terminalLayer");


    circuitStage = document.getElementById("circuitStage");

    emptyMessage = document.getElementById("circuitEmptyMessage");


    componentProperties = document.getElementById(
        "componentProperties"
    );

    circuitStatus = document.getElementById("circuitStatus");


    wireModeButton = document.getElementById("wireModeButton");

    clearCircuitButton = document.getElementById("clearCircuitButton");


    measuredVoltage = document.getElementById("measuredVoltage");

    measuredCurrent = document.getElementById("measuredCurrent");

    measuredResistance = document.getElementById("measuredResistance");

    measuredPower = document.getElementById("measuredPower");


    const requiredElements = [

        circuitSvg,
        wireLayer,
        componentLayer,
        terminalLayer,

        circuitStage,
        emptyMessage,

        componentProperties,
        circuitStatus,

        wireModeButton,
        clearCircuitButton,

        measuredVoltage,
        measuredCurrent,
        measuredResistance,
        measuredPower

    ];


    if (requiredElements.some(element => !element)) {

        console.error(
            "Physics Lab: faltan elementos HTML del laboratorio de circuitos."
        );

        return;

    }


    // Añadir componentes desde la paleta.

    document.querySelectorAll(".component-button").forEach(button => {

        button.addEventListener("click", () => {

            addComponent(button.dataset.component);

        });

    });


    // Conexiones.

    wireModeButton.addEventListener(
        "click",
        toggleWireMode
    );


    // Limpiar.

    clearCircuitButton.addEventListener(
        "click",
        clearCircuit
    );


    // Clic en el fondo para deseleccionar.

    circuitSvg.addEventListener("click", event => {

        const clickedBackground =
            event.target === circuitSvg ||
            (
                event.target.tagName.toLowerCase() === "rect" &&
                event.target.parentNode === circuitSvg
            );


        if (clickedBackground) {

            state.selectedId = null;

            renderCircuit();

            renderProperties();

            refreshMeasurementsOnly();

        }

    });


    // Movimiento.

    window.addEventListener(
        "pointermove",
        handlePointerMove
    );

    window.addEventListener(
        "pointerup",
        handlePointerUp
    );


    // Teclado.

    document.addEventListener(
        "keydown",
        handleKeyboard
    );


    // Arrastrar desde la paleta.

    enablePaletteDrag();


    // Estado inicial.

    state.initialized = true;

    renderCircuit();

    renderProperties();

    refreshSimulation();


    console.info(
        "Physics Lab: laboratorio de circuitos preparado."
    );

}


/* =========================================================
   FIN DE CIRCUITS.JS
========================================================= */
