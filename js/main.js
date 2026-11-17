
/* =========================================================
   PHYSICS LABORATORY
   Archivo principal de JavaScript

   Responsabilidades:
   1. Controlar la navegación entre laboratorios.
   2. Inicializar el simulador de circuitos.
   3. Inicializar el simulador de baloncesto.
   4. Gestionar mensajes de accesibilidad.
========================================================= */


/* =========================================================
   1. ELEMENTOS PRINCIPALES
========================================================= */

const navigationButtons = document.querySelectorAll(".nav-button");

const circuitsSection = document.getElementById("circuitsSection");
const basketballSection = document.getElementById("basketballSection");

const accessibilityStatus = document.getElementById(
    "accessibilityStatus"
);


/* =========================================================
   2. CONFIGURACIÓN DE LAS SECCIONES
========================================================= */

const sections = {
    circuits: {
        element: circuitsSection,
        button: document.getElementById("navCircuits"),
        title: "Circuitos eléctricos"
    },

    basketball: {
        element: basketballSection,
        button: document.getElementById("navBasketball"),
        title: "Baloncesto eléctrico"
    }
};


/* =========================================================
   3. NAVEGACIÓN ENTRE LABORATORIOS
========================================================= */

/**
 * Activa una sección del laboratorio y desactiva la otra.
 *
 * @param {string} sectionName - Nombre de la sección.
 * @returns {boolean} Indica si la sección existe.
 */

function changeSection(sectionName) {

    const selectedSection = sections[sectionName];

    if (!selectedSection) {
        console.warn(
            `Physics Lab: sección desconocida: ${sectionName}`
        );

        return false;
    }

    // Desactivar todas las secciones.

    Object.values(sections).forEach(section => {

        section.element.classList.remove("active");

        section.button.classList.remove("active");

        section.button.setAttribute("aria-pressed", "false");

    });


    // Activar la sección seleccionada.

    selectedSection.element.classList.add("active");

    selectedSection.button.classList.add("active");

    selectedSection.button.setAttribute("aria-pressed", "true");


    // Actualizar el título del navegador.

    document.title =
        `${selectedSection.title} | Physics Laboratory`;


    // Informar a los lectores de pantalla.

    if (accessibilityStatus) {
        accessibilityStatus.textContent =
            `Sección seleccionada: ${selectedSection.title}`;
    }


    // Registrar el cambio.

    console.info(
        `Physics Lab: ${selectedSection.title} activado.`
    );

    return true;
}


/* =========================================================
   4. EVENTOS DE NAVEGACIÓN
========================================================= */

navigationButtons.forEach(button => {

    button.addEventListener("click", () => {

        const sectionName = button.dataset.section;

        changeSection(sectionName);

    });

});


/* =========================================================
   5. ATAJOS DE TECLADO
========================================================= */

/**
 * Alt + 1: abre circuitos eléctricos.
 * Alt + 2: abre baloncesto eléctrico.
 */

document.addEventListener("keydown", event => {

    if (!event.altKey || event.ctrlKey || event.metaKey) {
        return;
    }

    if (event.key === "1") {

        event.preventDefault();

        changeSection("circuits");

    }

    if (event.key === "2") {

        event.preventDefault();

        changeSection("basketball");

    }

});


/* =========================================================
   6. INICIALIZACIÓN DEL LABORATORIO
========================================================= */

/**
 * Carga los módulos independientes.
 *
 * circuits.js debe exportar:
 * initCircuitLab()
 *
 * basketball.js debe exportar:
 * initBasketball()
 *
 * Se utilizan importaciones dinámicas para permitir
 * completar los módulos por separado durante el desarrollo.
 */

async function initializeLaboratories() {


    // Inicializar circuitos eléctricos.

    try {

        const circuitModule = await import("./circuits.js");

        if (typeof circuitModule.initCircuitLab === "function") {

            circuitModule.initCircuitLab();

            console.info(
                "Physics Lab: módulo de circuitos inicializado."
            );

        } else {

            console.error(
                "El módulo circuits.js no exporta initCircuitLab()."
            );

        }

    } catch (error) {

        console.info(
            "El módulo de circuitos todavía no está disponible.",
            error.message
        );

    }


    // Inicializar baloncesto eléctrico.

    try {

        const basketballModule = await import("./basketball.js");

        if (typeof basketballModule.initBasketball === "function") {

            basketballModule.initBasketball();

            console.info(
                "Physics Lab: módulo de baloncesto inicializado."
            );

        } else {

            console.error(
                "El módulo basketball.js no exporta initBasketball()."
            );

        }

    } catch (error) {

        console.info(
            "El módulo de baloncesto todavía no está disponible.",
            error.message
        );

    }

}


/* =========================================================
   7. ARRANQUE DE LA APLICACIÓN
========================================================= */

function startApplication() {

    // Estado inicial: circuitos eléctricos.

    changeSection("circuits");


    // Inicializar los laboratorios.

    initializeLaboratories();


    console.info("--------------------------------------");
    console.info("PHYSICS LABORATORY");
    console.info("Aplicación iniciada correctamente.");
    console.info("Alt + 1: Circuitos eléctricos");
    console.info("Alt + 2: Baloncesto eléctrico");
    console.info("--------------------------------------");

}


// El script es un módulo y se ejecuta después de interpretar
// el HTML, por lo que los elementos ya están disponibles.

startApplication();


/* =========================================================
   FIN DE MAIN.JS
========================================================= */
