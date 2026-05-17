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
        hasHit: false
    };
}