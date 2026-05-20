export function createCharacterData() {
    return {
        model: null,
        mixer: null,
        actions: {},
        activeAction: null,
        isMoving: false,
        moveData: null,

        comboQueue: [],
        isComboing: false,
        nextAttackTime: 0,

        // Variables de Colisiones e Impactos
        isHit: false,
        currentPunch: null,
        hasHit: false,
        
        // --- NUEVAS VARIABLES: MEMORIA PARA EVASIÓN ---
        consecutiveHitsReceived: 0,
        lastHitTime: 0,
        evadeTimer: 0,
        needsToEvade: false,

        // --- NUEVA VARIABLE: I-FRAMES ---
        isEvading: false,

        // --- SISTEMA DE VIDA ---
        maxHealth: 100, // Se sobrescribirá al cargar
        health: 100,
        isDead: false
    };
}