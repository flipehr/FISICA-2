
/* =========================================================
   PHYSICS LABORATORY
   MOTOR MATEMÁTICO Y FÍSICO

   Funciones compartidas por:
   - Circuitos eléctricos.
   - Ley de Ohm.
   - Cargas eléctricas.
   - Ley de Coulomb.
   - Campo eléctrico.
   - Movimiento físico.

   Todas las operaciones utilizan unidades del SI.
========================================================= */


/* =========================================================
   1. CONSTANTES FÍSICAS
========================================================= */

export const PHYSICS_CONSTANTS = Object.freeze({

    // Constante electrostática de Coulomb (N·m²/C²).
    COULOMB_K: 8.9875517923e9,

    // Distancia mínima para evitar singularidades numéricas.
    MIN_DISTANCE: 0.02,

    // Gravedad terrestre (m/s²).
    GRAVITY: 9.80665,

    // Conversión de microculombios a culombios.
    MICROCOULOMB: 1e-6,

    // Conversión de kiloohmios a ohmios.
    KILOOHM: 1000

});


/* =========================================================
   2. VALIDACIÓN DE DATOS
========================================================= */

/**
 * Comprueba que un valor sea numérico y finito.
 */

function isFiniteNumber(value) {

    return typeof value === "number" &&
        Number.isFinite(value);

}


/**
 * Comprueba que un valor sea válido.
 */

function validateNumber(value, name) {

    if (!isFiniteNumber(value)) {

        throw new TypeError(
            `${name} debe ser un número finito.`
        );

    }

    return value;

}


/**
 * Valida un vector bidimensional.
 */

function validateVector(vector, name = "Vector") {

    if (!vector || typeof vector !== "object") {

        throw new TypeError(
            `${name} debe contener coordenadas x e y.`
        );

    }

    validateNumber(vector.x, `${name}.x`);

    validateNumber(vector.y, `${name}.y`);

}


/**
 * Obtiene un valor opcional numérico.
 */

function optionalNumber(value) {

    if (value === null || value === undefined || value === "") {
        return null;
    }

    return validateNumber(value, "Parámetro");

}


/* =========================================================
   3. LEY DE OHM
========================================================= */

/**
 * Calcula la corriente eléctrica.
 *
 * I = V / R
 *
 * @param {number} voltage Voltios.
 * @param {number} resistance Ohmios.
 * @returns {number} Amperios.
 */

export function calculateCurrent(voltage, resistance) {

    validateNumber(voltage, "Voltaje");

    validateNumber(resistance, "Resistencia");

    if (resistance <= 0) {

        throw new RangeError(
            "La resistencia debe ser mayor que cero."
        );

    }

    return voltage / resistance;

}


/**
 * Calcula el voltaje.
 *
 * V = I * R
 */

export function calculateVoltage(current, resistance) {

    validateNumber(current, "Corriente");

    validateNumber(resistance, "Resistencia");

    if (resistance < 0) {

        throw new RangeError(
            "La resistencia no puede ser negativa."
        );

    }

    return current * resistance;

}


/**
 * Calcula la resistencia.
 *
 * R = V / I
 */

export function calculateResistance(voltage, current) {

    validateNumber(voltage, "Voltaje");

    validateNumber(current, "Corriente");

    if (current === 0) {

        throw new RangeError(
            "No se puede dividir por una corriente igual a cero."
        );

    }

    const resistance = voltage / current;

    if (resistance < 0) {

        throw new RangeError(
            "La resistencia no puede ser negativa."
        );

    }

    return resistance;

}


/**
 * Calcula la ley de Ohm con dos magnitudes conocidas.
 *
 * Se puede proporcionar cualquier combinación de:
 * voltage, current y resistance.
 *
 * Ejemplo:
 * calculateOhmsLaw({ voltage: 12, resistance: 6 })
 */

export function calculateOhmsLaw({
    voltage = null,
    current = null,
    resistance = null
} = {}) {

    let V = optionalNumber(voltage);

    let I = optionalNumber(current);

    let R = optionalNumber(resistance);


    if (R !== null && R < 0) {

        throw new RangeError(
            "La resistencia no puede ser negativa."
        );

    }


    const knownValues = [
        V !== null,
        I !== null,
        R !== null
    ].filter(Boolean).length;


    if (knownValues < 2) {

        return {

            voltage: V,
            current: I,
            resistance: R,
            power: null,
            complete: false,
            consistent: null

        };

    }


    // Determinar la magnitud desconocida.

    if (V !== null && R !== null && I === null) {

        I = calculateCurrent(V, R);

    } else if (V !== null && I !== null && R === null) {

        R = calculateResistance(V, I);

    } else if (I !== null && R !== null && V === null) {

        V = calculateVoltage(I, R);

    }


    // Comprobar consistencia si se proporcionaron
    // las tres magnitudes.

    const expectedCurrent = calculateCurrent(V, R);

    const tolerance = 1e-9 * Math.max(
        1,
        Math.abs(I),
        Math.abs(expectedCurrent)
    );

    const consistent =
        Math.abs(I - expectedCurrent) <= tolerance;


    return {

        voltage: V,

        current: I,

        resistance: R,

        power: calculatePower({
            voltage: V,
            current: I,
            resistance: R
        }),

        complete: true,

        consistent

    };

}


/* =========================================================
   4. POTENCIA ELÉCTRICA
========================================================= */

/**
 * Calcula la potencia mediante las magnitudes disponibles.
 *
 * P = V * I
 * P = I² * R
 * P = V² / R
 */

export function calculatePower({
    voltage = null,
    current = null,
    resistance = null
} = {}) {

    const V = optionalNumber(voltage);

    const I = optionalNumber(current);

    const R = optionalNumber(resistance);


    if (V !== null && I !== null) {

        return V * I;

    }


    if (I !== null && R !== null) {

        if (R < 0) {
            throw new RangeError("Resistencia inválida.");
        }

        return I * I * R;

    }


    if (V !== null && R !== null) {

        if (R <= 0) {
            throw new RangeError("La resistencia debe ser positiva.");
        }

        return (V * V) / R;

    }


    return null;

}


/* =========================================================
   5. RESISTENCIAS EQUIVALENTES
========================================================= */

/**
 * Resistencia equivalente en serie.
 *
 * Req = R1 + R2 + ... + Rn
 */

export function calculateSeriesResistance(resistances = []) {

    if (!Array.isArray(resistances) || resistances.length === 0) {

        throw new TypeError(
            "Se requiere una lista de resistencias."
        );

    }

    resistances.forEach((resistance, index) => {

        validateNumber(resistance, `Resistencia ${index + 1}`);

        if (resistance <= 0) {

            throw new RangeError(
                "Las resistencias deben ser positivas."
            );

        }

    });

    return resistances.reduce(
        (total, resistance) => total + resistance,
        0
    );

}


/**
 * Resistencia equivalente en paralelo.
 *
 * 1/Req = 1/R1 + 1/R2 + ... + 1/Rn
 */

export function calculateParallelResistance(resistances = []) {

    if (!Array.isArray(resistances) || resistances.length === 0) {

        throw new TypeError(
            "Se requiere una lista de resistencias."
        );

    }

    resistances.forEach((resistance, index) => {

        validateNumber(resistance, `Resistencia ${index + 1}`);

        if (resistance <= 0) {

            throw new RangeError(
                "Las resistencias deben ser positivas."
            );

        }

    });

    const reciprocalSum = resistances.reduce(
        (total, resistance) => total + 1 / resistance,
        0
    );

    return 1 / reciprocalSum;

}


/**
 * Calcula la resistencia equivalente según la conexión.
 *
 * type: "series" o "parallel".
 */

export function calculateEquivalentResistance(
    resistances,
    type = "series"
) {

    if (type === "series") {

        return calculateSeriesResistance(resistances);

    }

    if (type === "parallel") {

        return calculateParallelResistance(resistances);

    }

    throw new RangeError(
        "El tipo de conexión debe ser 'series' o 'parallel'."
    );

}


/* =========================================================
   6. OPERACIONES CON VECTORES
========================================================= */

/**
 * Calcula la magnitud de un vector bidimensional.
 */

export function vectorMagnitude(vector) {

    validateVector(vector);

    return Math.hypot(vector.x, vector.y);

}


/**
 * Suma dos vectores.
 */

export function addVectors(vectorA, vectorB) {

    validateVector(vectorA, "Vector A");

    validateVector(vectorB, "Vector B");

    return {

        x: vectorA.x + vectorB.x,

        y: vectorA.y + vectorB.y

    };

}


/**
 * Multiplica un vector por un escalar.
 */

export function scaleVector(vector, scalar) {

    validateVector(vector);

    validateNumber(scalar, "Escalar");

    return {

        x: vector.x * scalar,

        y: vector.y * scalar

    };

}


/**
 * Limita un valor a un intervalo.
 */

export function clamp(value, minimum, maximum) {

    validateNumber(value, "Valor");

    validateNumber(minimum, "Mínimo");

    validateNumber(maximum, "Máximo");

    if (minimum > maximum) {

        throw new RangeError(
            "El mínimo no puede ser mayor que el máximo."
        );

    }

    return Math.max(
        minimum,
        Math.min(maximum, value)
    );

}


/* =========================================================
   7. LEY DE COULOMB
========================================================= */

/**
 * Calcula la fuerza eléctrica ejercida por una carga fuente
 * sobre una carga objetivo.
 *
 * F = k * |q1*q2| / r²
 *
 * La dirección se determina mediante:
 * - Cargas del mismo signo: repulsión.
 * - Cargas de signos opuestos: atracción.
 *
 * IMPORTANTE:
 * Las posiciones deben estar expresadas en metros.
 * Las cargas deben estar expresadas en culombios.
 *
 * @param {number} targetCharge Carga objetivo (C).
 * @param {{x:number,y:number}} targetPosition Posición objetivo (m).
 * @param {number} sourceCharge Carga fuente (C).
 * @param {{x:number,y:number}} sourcePosition Posición fuente (m).
 * @param {number} minimumDistance Distancia de protección (m).
 */

export function calculateCoulombForce(
    targetCharge,
    targetPosition,
    sourceCharge,
    sourcePosition,
    minimumDistance = PHYSICS_CONSTANTS.MIN_DISTANCE
) {

    validateNumber(targetCharge, "Carga objetivo");

    validateNumber(sourceCharge, "Carga fuente");

    validateVector(targetPosition, "Posición objetivo");

    validateVector(sourcePosition, "Posición fuente");

    validateNumber(minimumDistance, "Distancia mínima");


    if (minimumDistance <= 0) {

        throw new RangeError(
            "La distancia mínima debe ser positiva."
        );

    }


    // Vector que va desde la carga fuente
    // hacia la carga objetivo.

    const dx = targetPosition.x - sourcePosition.x;

    const dy = targetPosition.y - sourcePosition.y;


    const distance = Math.hypot(dx, dy);


    // En el punto de coincidencia exacta,
    // la dirección de la fuerza no está definida.

    if (distance === 0) {

        return {

            x: 0,

            y: 0,

            magnitude: 0,

            distance: 0,

            overlap: true

        };

    }


    // Se utiliza una distancia efectiva mínima
    // para evitar fuerzas numéricamente infinitas.

    const effectiveDistance = Math.max(
        distance,
        minimumDistance
    );


    const directionX = dx / distance;

    const directionY = dy / distance;


    // Magnitud de la fuerza eléctrica.

    const magnitude =
        PHYSICS_CONSTANTS.COULOMB_K *
        Math.abs(targetCharge * sourceCharge) /
        (effectiveDistance * effectiveDistance);


    // El producto de las cargas determina
    // el sentido de la fuerza.

    const sign = Math.sign(
        targetCharge * sourceCharge
    );


    return {

        x: sign * magnitude * directionX,

        y: sign * magnitude * directionY,

        magnitude,

        distance,

        overlap: false

    };

}


/* =========================================================
   8. PRINCIPIO DE SUPERPOSICIÓN
========================================================= */

/**
 * Calcula la fuerza eléctrica neta sobre una carga
 * debido a un conjunto de cargas fuente.
 *
 * Estructura de cada carga:
 *
 * {
 *     charge: -1e-6,
 *     position: {
 *         x: 0.5,
 *         y: 1.2
 *     }
 * }
 */

export function calculateNetElectricForce(
    targetCharge,
    targetPosition,
    charges = []
) {

    validateNumber(targetCharge, "Carga objetivo");

    validateVector(targetPosition, "Posición objetivo");


    if (!Array.isArray(charges)) {

        throw new TypeError(
            "Las cargas deben estar en un arreglo."
        );

    }


    let totalX = 0;

    let totalY = 0;


    const contributions = charges.map((charge, index) => {

        if (!charge || typeof charge !== "object") {

            throw new TypeError(
                `La carga ${index + 1} no es válida.`
            );

        }


        const force = calculateCoulombForce(

            targetCharge,

            targetPosition,

            charge.charge,

            charge.position

        );


        totalX += force.x;

        totalY += force.y;


        return {

            charge: charge.charge,

            forceX: force.x,

            forceY: force.y,

            magnitude: force.magnitude,

            distance: force.distance

        };

    });


    return {

        x: totalX,

        y: totalY,

        magnitude: Math.hypot(totalX, totalY),

        contributions

    };

}


/* =========================================================
   9. CAMPO ELÉCTRICO
========================================================= */

/**
 * Calcula el campo eléctrico producido por una carga puntual.
 *
 * E = k * |q| / r²
 *
 * El resultado conserva la dirección según el signo
 * de la carga fuente.
 */

export function calculateElectricField(
    sourceCharge,
    sourcePosition,
    observationPoint,
    minimumDistance = PHYSICS_CONSTANTS.MIN_DISTANCE
) {

    validateNumber(sourceCharge, "Carga fuente");

    validateVector(sourcePosition, "Posición fuente");

    validateVector(observationPoint, "Punto de observación");


    const result = calculateCoulombForce(

        1,

        observationPoint,

        sourceCharge,

        sourcePosition,

        minimumDistance

    );


    // Como E = F/q y q = 1 C,
    // los componentes numéricos coinciden.

    return {

        x: result.x,

        y: result.y,

        magnitude: result.magnitude,

        distance: result.distance

    };

}


/**
 * Suma los campos eléctricos de varias cargas.
 *
 * Aplica el principio de superposición.
 */

export function calculateNetElectricField(
    observationPoint,
    charges = []
) {

    validateVector(observationPoint, "Punto de observación");


    if (!Array.isArray(charges)) {

        throw new TypeError(
            "Las cargas deben estar en un arreglo."
        );

    }


    let totalX = 0;

    let totalY = 0;


    charges.forEach(charge => {

        const field = calculateElectricField(

            charge.charge,

            charge.position,

            observationPoint

        );


        totalX += field.x;

        totalY += field.y;

    });


    return {

        x: totalX,

        y: totalY,

        magnitude: Math.hypot(totalX, totalY)

    };

}


/* =========================================================
   10. SEGUNDA LEY DE NEWTON
========================================================= */

/**
 * Calcula la aceleración a partir de una fuerza.
 *
 * F = m * a
 * a = F / m
 *
 * @param {{x:number,y:number}} force Fuerza en Newtons.
 * @param {number} mass Masa en kilogramos.
 */

export function calculateAcceleration(force, mass) {

    validateVector(force, "Fuerza");

    validateNumber(mass, "Masa");


    if (mass <= 0) {

        throw new RangeError(
            "La masa debe ser mayor que cero."
        );

    }


    const acceleration = {

        x: force.x / mass,

        y: force.y / mass

    };


    return {

        ...acceleration,

        magnitude: vectorMagnitude(acceleration),

        directionRadians: Math.atan2(
            acceleration.y,
            acceleration.x
        )

    };

}


/* =========================================================
   11. ACTUALIZACIÓN DEL MOVIMIENTO
========================================================= */

/**
 * Integra el movimiento utilizando el método de Euler
 * semiimplícito.
 *
 * Primero actualiza la velocidad:
 *
 * v(t+dt) = v(t) + a*dt
 *
 * Después actualiza la posición:
 *
 * x(t+dt) = x(t) + v(t+dt)*dt
 *
 * Todas las magnitudes deben utilizar unidades SI.
 */

export function updateKinematics(
    position,
    velocity,
    acceleration,
    deltaTime
) {

    validateVector(position, "Posición");

    validateVector(velocity, "Velocidad");

    validateVector(acceleration, "Aceleración");

    validateNumber(deltaTime, "Intervalo de tiempo");


    if (deltaTime < 0) {

        throw new RangeError(
            "El intervalo de tiempo no puede ser negativo."
        );

    }


    // Actualización de la velocidad.

    const newVelocity = {

        x: velocity.x + acceleration.x * deltaTime,

        y: velocity.y + acceleration.y * deltaTime

    };


    // Actualización de la posición.

    const newPosition = {

        x: position.x + newVelocity.x * deltaTime,

        y: position.y + newVelocity.y * deltaTime

    };


    return {

        position: newPosition,

        velocity: newVelocity,

        acceleration: {

            x: acceleration.x,

            y: acceleration.y

        }

    };

}


/* =========================================================
   12. INFORMACIÓN DEL MOTOR
========================================================= */

export const PHYSICS_ENGINE_INFO = Object.freeze({

    name: "Physics Laboratory Engine",

    version: "1.0.0",

    units: "Sistema Internacional (SI)",

    laws: [

        "Ley de Ohm",

        "Ley de Joule",

        "Resistencias equivalentes",

        "Ley de Coulomb",

        "Principio de superposición",

        "Campo eléctrico",

        "Segunda ley de Newton"

    ]

});


/* =========================================================
   FIN DEL MOTOR MATEMÁTICO
========================================================= */
