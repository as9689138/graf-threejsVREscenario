export const stepDistances = {
    shortForward: 35,
    shortBackward: 30,
    shortLeft: 28,
    shortRight: 28,
    mediumForward: 70,
    mediumBackward: 60,
    mediumLeft: 55,
    mediumRight: 55
};

export const enemyPunches = [
    'leadJab',
    'leadJab',
    'jabCross',
    'jabCross',
    'hook',
    'bodyJabCross',
    'leadJabShift',
    'uppercut',
    'hookShift',
    'bodyJabCrossShift'
];

export const punchTypes = {
    leadJab: 'body',
    jabCross: 'head',
    hook: 'body',
    bodyJabCross: 'body',
    leadJabShift: 'body',
    uppercut: 'head',
    hookShift: 'body',
    bodyJabCrossShift: 'body'
};

export const cameraConfig = {
    mode: 1,
    camDistMode1: 280,
    minCamDist1: 150,
    maxCamDist1: 500,
    camHeightMode1: 350
};

export const ringConfig = {
    ringSize: 800,
    ringHeight: 40,
    ringHalf: 350,
    postHeight: 120
};