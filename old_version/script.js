let currentFloorIndex = 0;
let floor0PendingDraw = false;
let floor1PendingDraw = false;
let floor2PendingDraw = false;
let switchB = true;
let prevFloorIndex = 0;
let lastActionByFloor = [null, null, null];    
let lastStairNode = null;
let lastTargetRoomId = null;   
let lastTargetExitByFloor = [null, null, null];
let originRoomId = null;
let pendingPaths = [];
const searchButton = document.getElementById('search-button');
const searchContainer = document.getElementById('search-container');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
let activeRoute = null;
let routeFloors = [];
let routeStepIndex = 0;
let finalTargetRoomId = null;
let allPathsSteps = 0;
let previouslyHighlightedRoom = null;
const floors = document.querySelectorAll('.floor-rooms');
let scale = 1;
let posX = 0;
let posY = 0;
const container = document.querySelector('.container'); 
let isDragging = false;
let startX = 0;
let startY = 0;
let initialX = 0;
let initialY = 0;
let currentRoomElement = null;
let startDistance = 0;
let lastTouchX = 0;
let lastTouchY = 0;
const popup = document.getElementById('info-popup');
let currentTargetNode = null;
let currentRoomNode = null;
const pathGraphs = [{
    TN: ['T'],
    T: ['TN', 'TP'],
    TP: ['T', 'TV', 'S'],
    TV: ['TP'],
    S: ['TP', 'L', 'SN', 'K11'],
    L: ['S'],
    SN: ['S'],
    K11: ['S', 'K11N', 'K10'],
    K11N: ['K11'],
    K10: ['K11', 'K9', 'K10N'],
    K10N: ['K10'],
    K9: ['K9N', 'TD', 'K10'],
    K9N: ['K9'],
    TD: ['K9', 'TDN', 'TM'],
    TDN: ['TD'],
    TM: ['L2', 'TMN', 'TD'],
    TMN: ['TM'],
    L2: ['L2N', 'TM', 'K7', 'G'],
    L2N: ['L2'],
    K7: ['L2', 'K7N', 'SP'],
    K7N: ['K7'],
    G: ['L2', 'GN'],
    GN: ['G', 'G2'],
    G2: ['F2', 'GN'],
    SP:['SPN', 'F', 'K7', 'M'],
    SPN: ['SP'],
    F: ['SP'],
    F2: ['G2'],
    MN: ['M'],
    M:['MN', 'SP', 'L3', 'K6N'],
    K6N: ['M'],
    LIB: ['L3'],
    L3: ['L3N', 'LIB', 'K5N', 'M'],
    K5N: ['L3'],
    L3N: ['L3']
},
{
    L: ['LR'],
    LR:['L', 'R', 'FT', 'K28'],
    R: ['LR'],
    FT: ['LR', 'FTV'],
    FTV: ['FT'],
    K28: ['LR', 'K28N', 'K27'],
    K28N: ['K28'],
    K27: ['K28', 'K27N', 'K26'],
    K27N: ['K27'],
    K26: ['K27', 'K26N', 'K25'],
    K26N: ['K26'],
    K25: ['K25N', 'K26', 'K24'],
    K25N: ['K25'],
    K24: ['K24N', 'K25','TD'],
    K24N: ['K24'],
    TD:['K24', 'TDN', 'TM'],
    TDN: ['TD'],
    TM: ['TD', 'TMN', 'L2'],
    TMN: ['TM'],
    L2:['TM', 'L2N', 'K23', 'U'],
    L2N:['L2'],
    K23:['L2'],
    K20:['UC'],
    UC: ['K20', 'U'],
    U:['L2', 'UC', 'K22', 'LB'],
    K22:['U'],
    K21B:['LB'],
    LB:['K21B', 'U', 'LAB', 'K21'],
    LAB:['LB'],
    K21A:['K21'],
    K21:['K21A', 'LB', 'K18', 'L3'],
    K18: ['K21'],
    L3:['K19', 'K21','K17','L3N'],
    K19:['L3'],
    K17:['L3'],
    L3N:['L3']
},
{
    L:['K44'],
    K44: ['L', 'K44N', 'K43'],
    K44N:['K44'],
    K43: ['K44', 'K43N', 'K42'],
    K43N: ['K43'],
    K42: ['K43', 'K42N', 'K41'],
    K42N: ['K42'],
    K41: ['K42', 'K41N', 'K40'],
    K41N: ['K41'],
    K40: ['K41', 'K40N', 'K39'],
    K40N: ['K40'],
    K39: ['K40', 'K39N', 'SP1'],
    K39N: ['K39'],
    SP1: ['SP1N', 'K39', 'SP2'],
    SP1N: ['SP1'],
    SP2: ['SP1', 'SP2N', 'K38', 'L2'],
    K38: ['SP2'],
    SP2N: ['SP2'],
    L2: ['SP2', 'L2N', 'ACT', 'K36'],
    L2N: ['L2'],
    ACT: ['L2', 'L3'],
    K36: ['L2'],
    L3: ['K35', 'K33', 'L3N', 'ACT'],
    K35: ['L3'],
    K33: ['L3'],
    L3N: ['L3']
}];
let down = ['K5N', 'K6N', 'F', 'GN', 'K17', 'K18', 'LAB', 'K22', 'K23', 'K33', 'K36'];
let up = ['LIB', 'MN', 'SPN', 'K7N', 'K19', 'K21A', 'K21B', 'UC', 'K20', 'K35', 'K38'];
let right = ['SN', 'K11N', 'K10N', 'K9N', 'TDN', 'TMN', 'R', 'K28N', 'K27N', 'K26N', 'K25N', 'K24N', 'K44N', 'K43N', 'K42N', 'K41N', 'K40N', 'K39N', 'SP1N', 'SP2N'];

const searchRess = document.getElementById('search-results');

if (searchRess) {
    searchRess.addEventListener('wheel', function (e) {
        e.stopPropagation();
    }, { passive: false });

    searchRess.addEventListener('touchmove', function (e) {
        e.stopPropagation();
    }, { passive: false });
}
function disableFloorSwitching(disable) {
    const floorButtons = document.querySelectorAll('.floor');
    floorButtons.forEach(btn => {
        if (disable) {
            btn.classList.add('disabled');
            btn.style.pointerEvents = 'none';
            btn.style.opacity = '0.5';
        } else {
            btn.classList.remove('disabled');
            btn.style.pointerEvents = '';
            btn.style.opacity = '';
        }
    });
}
searchButton.addEventListener('click', () => {
    searchContainer.classList.toggle('hidden');
    searchInput.value = '';
    searchResults.innerHTML = '';
    searchInput.focus();
});

document.getElementById('evacuate-button').addEventListener('click', () => {
    if (!originRoomId) return;
    setURLParam('evacuate', 'true');
    const roomEl = document.getElementById(originRoomId);
    if (!roomEl) return;

    const floorIndex = getFloorIndexForRoom(roomEl);
    if (floorIndex !== -1) {
        showFloor(floorIndex + 1);
        currentRoomElement = roomEl;
        setTimeout(() => evacuate(), 400);
    }
});
searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();
    const results = [];

    const rooms = Array.from(document.querySelectorAll('.room'));

    results.push({ label: 'Эвакуация', type: 'evacuation' });

    for (let room of rooms) {
        const info = room.getAttribute('data-info')?.toLowerCase() || '';
        const id = room.getAttribute('id')?.toLowerCase() || '';
        if (info.includes(query) || id.includes(query)) {
            results.push({ label: `${room.getAttribute('data-info')} (${id.toUpperCase()})`, id: id.toUpperCase(), type: 'room' });
        }

    }

    searchResults.innerHTML = '';
    for (let result of results) {
        const li = document.createElement('li');
        li.textContent = result.label;
        li.addEventListener('click', () => {
            handleSearchSelection(result);
        });
        searchResults.appendChild(li);
    }
});
function handleSearchSelection(result) {
    searchContainer.classList.add('hidden');
    if (!originRoomId) return;

    const originRoom = document.getElementById(originRoomId);
    if (!originRoom) return;

    const originFloor = Array.from(document.querySelectorAll('.floor-rooms')).findIndex(floor =>
        floor.contains(originRoom)
    );

    if (originFloor !== -1) {
        showFloor(originFloor + 1); 
    }

    if (result.type === 'evacuation') {
        setURLParam('evacuate', 'true');
        setTimeout(() => {
            evacuate();
        }, 300);
    } else if (result.type === 'room') {
        setTimeout(() => {
            buildMultiFloorPath(originRoomId, result.id);
        }, 300);
    }
}
function clearAllPaths() {
    document.querySelectorAll('.evacuation-svg').forEach(svg => svg.innerHTML = '');
    document.querySelectorAll('.path-node').forEach(node => {
        node.style.backgroundColor = 'transparent';
    });
    document.querySelectorAll('.show-all-paths-button').forEach(btn => {
        btn.style.display = 'none';
    });

    searchContainer.classList.add('hidden');
    lastStairNode = null;
    lastTargetRoomId = null;
    floor0PendingDraw = false;
    floor1PendingDraw = false;
    floor2PendingDraw = false;
    const wasEvacuation = lastActionByFloor.includes('evacuate') || lastActionByFloor.includes('all-paths');
    if (wasEvacuation) {
        removeURLParam('evacuate');
    }
    for (let i = 0; i < 3; i++) {
        lastActionByFloor[i] = null;
        lastTargetExitByFloor[i] = null;
    }
    allPathsSteps = 0;
    updateInfoText();

}

function getDistanceBetweenElements(el1, el2) {
    const r1 = el1.getBoundingClientRect();
    const r2 = el2.getBoundingClientRect();

    const x1 = r1.left + r1.width / 2;
    const y1 = r1.top + r1.height / 2;
    const x2 = r2.left + r2.width / 2;
    const y2 = r2.top + r2.height / 2;

    const dx = x1 - x2;
    const dy = y1 - y2;
    return dx * dx + dy * dy;
}

function buildMultiFloorPath(fromId, toId) {
    finalTargetRoomId = toId;
    clearAllPaths();

    const leftZoneRooms = ['CAB33', 'CAB35', 'LWT'];
    const rightZoneRooms = ['CAB36', 'CAB38', 'CAB39', 'CAB40', 'CAB41', 'CAB42', 'CAB43', 'CAB44', 'ACT', 'CORT', 'SP1T', 'SP2T', 'LNT', 'LET'];

    const fromEl = document.getElementById(fromId);
    const toEl = document.getElementById(toId);
    if (!fromEl || !toEl) return;

    const fromFloor = getFloorIndexForRoom(fromEl);
    const toFloor = getFloorIndexForRoom(toEl);
    const fromNode = getClosestNodeToElement(fromEl);
    const toNode = getClosestNodeToElement(toEl);
    currentRoomNode = fromNode;
    const isFromLeft = leftZoneRooms.includes(fromId);
    const isFromRight = rightZoneRooms.includes(fromId);
    const isToLeft = leftZoneRooms.includes(toId);
    const isToRight = rightZoneRooms.includes(toId);

    const svgFrom = getSvgForFloor(fromFloor);
    showFloor(fromFloor + 1);
    let didDraw = false;

    if (isFromLeft && isToRight) {
        const path1 = findPath(pathGraphs[2], fromNode, 'L3N');
        if (path1) drawEvacuationPath(path1, svgFrom);
        lastStairNode = 'L3N';
        currentTargetNode = 'L3N';
        lastTargetRoomId = 'L2N';
        floor1PendingDraw = true;
        pendingPaths.push({ floorIndex: 2, from: 'LET', to: toId });
        didDraw = true;
    } else if (isFromRight && isToLeft) {
        const path1 = findPath(pathGraphs[2], fromNode, 'L2N');
        if (path1) drawEvacuationPath(path1, svgFrom);
        lastStairNode = 'L2N';
        currentTargetNode = 'L2N';
        lastTargetRoomId = 'L3N';
        floor1PendingDraw = true;
        pendingPaths.push({ floorIndex: 2, from: 'LWT', to: toId });
        didDraw = true;
    } else if (!isFromLeft && !isFromRight && isToLeft) {
        const path1 = findPath(pathGraphs[fromFloor], fromNode, 'L3N');
        if (path1) drawEvacuationPath(path1, svgFrom);
        lastStairNode = 'L3N';
        currentTargetNode = 'L3N';
        lastTargetRoomId = toId;
        didDraw = true;
        if (toFloor === 0) floor0PendingDraw = true;
        if (toFloor === 1) floor1PendingDraw = true;
        if (toFloor === 2) floor2PendingDraw = true;
    } else if (!isFromLeft && !isFromRight && isToRight) {
        const stairCandidates = ['L2N', 'L'];
        let closest = null;
        let minDist = Infinity;
        stairCandidates.forEach(stairId => {
            const el = document.querySelector(`.floor-rooms:nth-child(${fromFloor + 1}) .path-node[data-id="${stairId}"]`);
            if (!el) return;
            const dist = getDistanceBetweenElements(fromEl, el);
            if (dist < minDist) {
                minDist = dist;
                closest = stairId;
            }
        });
        const path1 = findPath(pathGraphs[fromFloor], fromNode, closest);
        if (path1) drawEvacuationPath(path1, svgFrom);
        lastStairNode = closest;
        currentTargetNode = closest;
        lastTargetRoomId = toId;
        didDraw = true;
        if (toFloor === 0) floor0PendingDraw = true;
        if (toFloor === 1) floor1PendingDraw = true;
        if (toFloor === 2) floor2PendingDraw = true;
    } else if (fromFloor === toFloor) {
        const path = findPath(pathGraphs[fromFloor], fromNode, toNode);
        if (path) drawEvacuationPath(path, svgFrom);
        lastStairNode = null;
        currentTargetNode = toNode;
        lastTargetRoomId = null;
        didDraw = true;
    } else {
        const stairOptions = ['L', 'L2N', 'L3N'];
        let stairNode = null;
        let minDist = Infinity;
        stairOptions.forEach(id => {
            const el = document.querySelector(`.floor-rooms:nth-child(${fromFloor + 1}) .path-node[data-id="${id}"]`);
            if (!el) return;
            const dist = getDistanceBetweenElements(fromEl, el);
            if (dist < minDist) {
                minDist = dist;
                stairNode = id;
            }
        });
        const path1 = findPath(pathGraphs[fromFloor], fromNode, stairNode);
        if (path1) drawEvacuationPath(path1, svgFrom);
        lastStairNode = stairNode;
        currentTargetNode = stairNode;
        lastTargetRoomId = toId;
        didDraw = true;
        if (toFloor === 0) floor0PendingDraw = true;
        if (toFloor === 1) floor1PendingDraw = true;
        if (toFloor === 2) floor2PendingDraw = true;
    }
    for (let i = 0; i < 3; i++) {
        lastActionByFloor[i] = 'room-to-room';
        lastTargetExitByFloor[i] = toId;
    }

    updateInfoText();


    if (didDraw) {
        routeFloors = [];
        if (isFromLeft && isToRight) {
            routeFloors = [2, 1, 2];
        } else if (isFromRight && isToLeft) {
            routeFloors = [2, 1, 2];
        } else if (fromFloor !== toFloor) {
            routeFloors.push(fromFloor);
            if (floor1PendingDraw) routeFloors.push(1);
            if (floor0PendingDraw) routeFloors.push(0);
            if (floor2PendingDraw) routeFloors.push(2);
        } else {
            routeFloors.push(fromFloor);
        }
        if (routeFloors.length > 0 && routeFloors[0] === fromFloor) {
            routeFloors.shift();
        }
        routeStepIndex = 0;
        activeRoute = true;

        disableFloorSwitching(true);
        if (routeFloors.length > 0) {
            document.getElementById('route-next').style.display = 'inline-block';
            document.getElementById('route-finish').style.display = 'inline-block';
        }
    }
}
function getURLParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
}

function setURLParam(name, value) {
    const url = new URL(window.location.href);
    url.searchParams.set(name, value);
    window.history.replaceState({}, '', url.toString());
}
function removeURLParam(name) {
    const url = new URL(window.location.href);
    url.searchParams.delete(name);
    window.history.replaceState({}, '', url.toString());
}
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('search-button').style.display = 'none';
    document.getElementById('evacuate-button').style.display = 'none';
    
    const roomId = getURLParam('roomId');
    if (roomId) {
        originRoomId = roomId;
        document.getElementById('search-button').style.display = 'flex';
        document.getElementById('evacuate-button').style.display = 'flex';
        const roomEl = document.getElementById(roomId);
        if (roomEl) {
            const floorIndex = getFloorIndexForRoom(roomEl);
            if (floorIndex !== -1) {
                currentRoomElement = roomEl;
                showFloor(floorIndex + 1);
                setTimeout(() => highlightRoom(roomId), 500); 
            }
            const evacFlag = getURLParam('evacuate');
            if (evacFlag === 'true' && roomId) {
                setTimeout(() => {
                    evacuate();
                }, 1000);
            }
        }
    }
    if (window.innerWidth < 600) {
        document.querySelectorAll('.floor').forEach((el) => {
            const num = el.textContent.replace(/[^\d]/g, ''); 
            el.textContent = num;
        });
    }
    const screenWidth = window.innerWidth;
    const invisibleButton = document.getElementById('invisible-creator-button');
    const creatorInfo = document.getElementById('creator-info');

    if (invisibleButton && creatorInfo) {
        invisibleButton.addEventListener('click', () => {
            creatorInfo.classList.toggle('hidden');
        });
    }
    if (screenWidth < 600) {
        scale = 0.6;
        posX = -100;
        posY = -50;
    } else if (screenWidth < 1000) {
        scale = 0.75;
        posX = -50;
        posY = -30;
    } else {
        scale = 1;
        posX = 0;
        posY = 0;
    }

    applyTransform();

});

document.getElementById('im-here-button').addEventListener('click', () => {
    if (!currentRoomElement) return;
    clearAllPaths();
    const id = currentRoomElement.getAttribute('id');
    if (id) {
        originRoomId = id;
        setURLParam('roomId', id);
        document.getElementById('search-button').style.display = 'flex';
        document.getElementById('evacuate-button').style.display = 'flex';
        const floorIndex = getFloorIndexForRoom(currentRoomElement);
        if (floorIndex !== -1) {
            showFloor(floorIndex + 1);
            setTimeout(() => highlightRoom(id), 500);
        }
    }
    closePopup();
});
function highlightCurrentFloorButton() {
    document.querySelectorAll('.floor').forEach((btn, index) => {
        if (index === currentFloorIndex) {
            btn.classList.add('active-floor');
        } else {
            btn.classList.remove('active-floor');
        }
    });
}
function showFloor(floor) {
    if (switchB) {
        prevFloorIndex = currentFloorIndex;
        switchB = false;
    }
    if (currentFloorIndex + 1 != floor) {
        closePopup();
    }
    currentFloorIndex = floor - 1;

    document.querySelectorAll('.floor-rooms').forEach((floorDiv, index) => {
        if (index !== currentFloorIndex) {
            floorDiv.classList.remove('show');
            floorDiv.classList.add('hidden');
            if (index !== prevFloorIndex) {
                const btn = floorDiv.querySelector('.show-all-paths-button');
                if (btn) btn.style.display = 'none';
            }
        }
    });

    const floorDiv = document.getElementById(`floor${floor}`);
    floorDiv.classList.remove('hidden');
    setTimeout(() => floorDiv.classList.add('show'), 100);

    if (
        floor === 2 &&
        lastStairNode &&
        lastTargetRoomId &&
        (lastStairNode === 'L3N' && lastTargetRoomId === 'L2N' ||
        lastStairNode === 'L2N' && lastTargetRoomId === 'L3N')
    ) {
        const path = findPath(pathGraphs[1], lastStairNode, lastTargetRoomId);
        if (path) {
            const svg = getSvgForFloor(1);
            drawEvacuationPath(path, svg);
        }


        lastStairNode = null;
        lastTargetRoomId = null;
        floor1PendingDraw = false;
    }
    if (
        pendingPaths.length === 1 &&
        currentFloorIndex === 2
    ) {
        const { floorIndex, from, to } = pendingPaths[0];
        if (floorIndex === currentFloorIndex) {
            const fromEl = document.getElementById(from);
            const toEl = document.getElementById(to);
            if (fromEl && toEl) {
                const graph = pathGraphs[floorIndex];
                const fromNode = getClosestNodeToElement(fromEl);
                const toNode = getClosestNodeToElement(toEl);
                const path = findPath(graph, fromNode, toNode);
                if (path) {
                    const svg = getSvgForFloor(floorIndex);
                    svg.innerHTML = '';
                    drawEvacuationPath(path, svg);
                }
            }
            pendingPaths = []; 
        }
    }
    setTimeout(() => {
        if (
            ((floor === 1 && floor0PendingDraw) || 
            (floor === 2 && floor1PendingDraw) || 
            (floor === 3 && floor2PendingDraw)) &&
            lastStairNode && lastTargetRoomId
        ) {
            const graph = pathGraphs[floor - 1];
            const toNode = getClosestNodeToElement(document.getElementById(lastTargetRoomId));
            const path2 = findPath(graph, lastStairNode, toNode);
            if (path2) drawEvacuationPath(path2, getSvgForFloor(floor - 1));

            lastStairNode = null;
            lastTargetRoomId = null;
            if (floor === 1) floor0PendingDraw = false;
            if (floor === 2) floor1PendingDraw = false;
            if (floor === 3) floor2PendingDraw = false;
        }
    }, 300);
    const svg = floorDiv.querySelector('.evacuation-svg');
    const graph = pathGraphs[currentFloorIndex];

    if (
        ((floor === 2 && floor1PendingDraw) || (floor === 1 && floor0PendingDraw)) &&
        lastStairNode && lastTargetRoomId
    ) {
        svg.innerHTML = '';

        const path = findPath(graph, lastStairNode, getClosestNodeToElement(document.getElementById(lastTargetRoomId)));
        if (path) {
            drawEvacuationPath(path, svg);
        }

        if (floor === 1) floor0PendingDraw = false;
        if (floor === 2) floor1PendingDraw = false;

        lastStairNode = null;
        lastTargetRoomId = null;

        updateInfoText();
        return; 
    }


    if ((floor === 1 && floor0PendingDraw) || (floor === 2 && floor1PendingDraw)) {
        const baseNode = getClosestNodeToElement(currentRoomElement);
        const index = floor - 1;

        const exitsByFloor = [
            ['L', 'L2N', 'F', 'F2', 'L3N', 'TV'],
            ['L', 'L2N', 'L3N', 'FTV'],
            ['L', 'L3N', 'L2N']
        ];
        const exitNodes = exitsByFloor[index];

        floorDiv.querySelectorAll('.path-node').forEach(node => {
            node.style.backgroundColor = exitNodes.includes(node.dataset.id) ? 'red' : 'transparent';
        });

        exitNodes.forEach(endNode => {
            const path = findPath(graph, baseNode, endNode);
            if (!path) return;

            const points = path.map(id => {
                const node = floorDiv.querySelector(`.path-node[data-id="${id}"]`);
                if (!node) return '';
                const x = node.offsetLeft + node.offsetWidth / 2;
                const y = node.offsetTop + node.offsetHeight / 2;
                return `${x},${y}`;
            }).filter(Boolean).join(' ');

            const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
            polyline.setAttribute('points', points);
            polyline.setAttribute('stroke', 'orange');
            polyline.setAttribute('stroke-width', '3');
            polyline.setAttribute('fill', 'none');
            polyline.style.pointerEvents = 'auto';
            polyline.style.cursor = 'pointer';
            svg.appendChild(polyline);
        });


        if (floor === 1) floor0PendingDraw = false;
        if (floor === 2) floor1PendingDraw = false;
    }

    updateInfoText();
    highlightCurrentFloorButton();
}
function getSvgForFloor(index) {
    return document.querySelectorAll('.evacuation-svg')[index];
}


function highlightRoom(roomId) {
    if (previouslyHighlightedRoom) {
        previouslyHighlightedRoom.classList.remove('highlighted-room');
    }

    const roomEl = document.getElementById(roomId);
    if (roomEl) {
        roomEl.classList.add('highlighted-room');
        previouslyHighlightedRoom = roomEl;
    }
}
function getFloorIndexForRoom(roomEl) {
    const floors = document.querySelectorAll('.floor-rooms');
    return Array.from(floors).findIndex(floor => floor.contains(roomEl));
}

document.querySelectorAll('.room').forEach(room => {
    room.addEventListener('click', () => {
        currentRoomElement = room;
        const info = room.getAttribute('data-info');
        const imageSrc = room.getAttribute('data-image');

        document.getElementById('popup-text').innerText = info;

        const popupImage = document.getElementById('popup-image');
        if (imageSrc) {
            popupImage.src = imageSrc;
            popupImage.classList.remove('hidden');
        } else {
            popupImage.classList.add('hidden');
        }

        const popup = document.getElementById('info-popup');
        popup.classList.remove('hidden');
        setTimeout(() => popup.classList.add('show'), 50);
        
        
    });
});
document.body.style.overflow = 'hidden'; 
function closePopup() {
    const popup = document.getElementById('info-popup');
    popup.classList.remove('show');
    setTimeout(() => popup.classList.add('hidden'), 400);
}

const applyTransform = () => {
    floors.forEach((floor, index) => {
        floor.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
    });
    const popup = document.getElementById('info-popup');
    popup.style.transform = `scale(${scale})`;
};
container.addEventListener('wheel', (e) => {
    e.preventDefault(); 

    const scaleAmount = e.deltaY < 0 ? 0.1 : -0.1;
    scale = Math.min(Math.max(0.01, scale + scaleAmount), 3);

    applyTransform();
});



container.addEventListener('mousedown', (e) => {
    e.preventDefault();

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    initialX = posX;
    initialY = posY;
});


window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    posX = initialX + dx;
    posY = initialY + dy;

    applyTransform();
});


window.addEventListener('mouseup', () => {
    isDragging = false;
});


container.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
        isDragging = true;
        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
        document.body.style.overflow = 'hidden'; 
    } else if (e.touches.length === 2) {
        isDragging = false;
        startDistance = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
    }
});

container.addEventListener('touchmove', (e) => {
    if (isDragging && e.touches.length === 1) {
        const dx = e.touches[0].clientX - lastTouchX;
        const dy = e.touches[0].clientY - lastTouchY;

        posX += dx;
        posY += dy;

        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;

        applyTransform();
    } else if (e.touches.length === 2) {
        const newDistance = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );

        const scaleAmount = newDistance / startDistance;
        scale = Math.min(Math.max(0.1, scale * scaleAmount), 3);

        startDistance = newDistance;

        applyTransform();
    }
});

container.addEventListener('touchend', () => {
    isDragging = false;
    document.body.style.overflow = '';
});


function findPath(graph, start, end) {
    let queue = [[start]];
    let visited = new Set();

    while (queue.length > 0) {
        let path = queue.shift();
        let node = path[path.length - 1];

        if (node === end) return path;

        if (!visited.has(node)) {
            visited.add(node);
            const neighbors = graph[node] || [];
            neighbors.forEach(neighbor => {
                if (!visited.has(neighbor)) {
                    queue.push([...path, neighbor]);
                }
            });
        }
    }
    return null;
}

function getNodeCoordinates(id) {
    const floor = document.querySelectorAll('.floor-rooms')[currentFloorIndex];
    const el = floor.querySelector(`.path-node[data-id="${id}"]`);
    if (!el) return null;
    return {
        x: el.offsetLeft + el.offsetWidth / 2,
        y: el.offsetTop + el.offsetHeight / 2
    };
}
document.getElementById('route-finish').addEventListener('click', () => {
    activeRoute = null;
    disableFloorSwitching(false);

    const isEvacuation = lastActionByFloor.includes('evacuate');
    const isAllPaths = lastActionByFloor.includes('all-paths');

    if (isEvacuation || isAllPaths) {
        if (originRoomId) {
            const originEl = document.getElementById(originRoomId);
            if (originEl) originEl.classList.remove('highlighted-room');
        }
        originRoomId = null;
        currentRoomElement = null;
        removeURLParam('roomId');
        updateInfoText();
        clearAllPaths(); 
        document.getElementById('search-button').style.display = 'none';
        document.getElementById('evacuate-button').style.display = 'none';
        return;
    }

    if (!finalTargetRoomId) return;

    const targetEl = document.getElementById(finalTargetRoomId);
    if (!targetEl) return;

    const targetFloor = getFloorIndexForRoom(targetEl);

    if (currentRoomElement) currentRoomElement.classList.remove('highlighted-room');
    if (previouslyHighlightedRoom) previouslyHighlightedRoom.classList.remove('highlighted-room');

    if (targetFloor !== currentFloorIndex) {
        showFloor(targetFloor + 1);
    }
    highlightCurrentFloorButton();

    highlightRoom(finalTargetRoomId);
    currentRoomElement = targetEl;
    originRoomId = finalTargetRoomId;

    setURLParam('roomId', finalTargetRoomId);
    removeURLParam('evacuate');
    updateInfoText();
    clearAllPaths(); 
});

document.getElementById('route-next').addEventListener('click', () => {
    if (!activeRoute) return;

    const currentAction = lastActionByFloor[currentFloorIndex];

    if (currentAction === 'all-paths') {

        if (currentFloorIndex > 0) {
            showFloor(currentFloorIndex); 
        }
        if (currentFloorIndex - 1 < 0) {
            activeRoute = null;
        }
        return;
    }

    if (routeStepIndex >= routeFloors.length) {

        activeRoute = null;
        return;
    }

    const nextFloor = routeFloors[routeStepIndex];
    showFloor(nextFloor + 1);
    highlightCurrentFloorButton();
    routeStepIndex++;

    if (routeStepIndex >= routeFloors.length) {
        activeRoute = null;
    }
    updateInfoText();
});
function getClosestNodeToElement(element) {
    const floorIndex = getFloorIndexForRoom(element);
    const floor = document.querySelectorAll('.floor-rooms')[floorIndex];
    const nodes = floor.querySelectorAll('.path-node');

    let minDist = Infinity;
    let closestId = null;

    const elemRect = element.getBoundingClientRect();
    const elemX = elemRect.left + elemRect.width / 2;
    const elemY = elemRect.top + elemRect.height / 2;

    nodes.forEach(node => {
        const nodeRect = node.getBoundingClientRect();
        const x = nodeRect.left + nodeRect.width / 2;
        const y = nodeRect.top + nodeRect.height / 2;
        const dx = x - elemX;
        const dy = y - elemY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
            minDist = dist;
            closestId = node.dataset.id;
        }
    });

    return closestId;
}

function drawEvacuationPath(path, svg) {
    if (!path || path.length < 2 || !svg) return;

    const coordsList = path.map(id => getNodeCoordinates(id)).filter(Boolean);


    const polylinePoints = coordsList.map(pt => `${pt.x},${pt.y}`).join(' ');
    const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    polyline.setAttribute('points', polylinePoints);
    polyline.setAttribute('stroke', 'limegreen');
    polyline.setAttribute('stroke-width', '4');
    polyline.setAttribute('fill', 'none');
    polyline.style.pointerEvents = 'auto';
    polyline.style.cursor = 'pointer';




    svg.appendChild(polyline);
    const arrowSize = 10;
    for (let i = 1; i < coordsList.length; i++) {
        const from = coordsList[i - 1];
        const to = coordsList[i];

        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const arrowX = to.x;
        const arrowY = to.y;

        const arrow = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        const p1 = `${arrowX},${arrowY}`;
        const p2 = `${arrowX - arrowSize * Math.cos(angle - Math.PI / 6)},${arrowY - arrowSize * Math.sin(angle - Math.PI / 6)}`;
        const p3 = `${arrowX - arrowSize * Math.cos(angle + Math.PI / 6)},${arrowY - arrowSize * Math.sin(angle + Math.PI / 6)}`;
        arrow.setAttribute("points", `${p1} ${p2} ${p3}`);
        arrow.setAttribute("fill", "limegreen");

        svg.appendChild(arrow);
    }
}

function evacuate() {
    disableFloorSwitching(true);
    lastStairNode = null;
    lastTargetRoomId = null;
    floor0PendingDraw = false;
    floor1PendingDraw = false;
    floor2PendingDraw = false;
    activeRoute = true;
    lastActionByFloor[currentFloorIndex] = 'evacuate';
    for (let i = currentFloorIndex + 1; i < 3; i++) {
        lastActionByFloor[i] = null;
        lastTargetExitByFloor[i] = null;
    }

    for (let i = 0; i < currentFloorIndex; i++) {
        lastActionByFloor[i] = 'evacuate';
        lastTargetExitByFloor[i] = 'Лестница';
    }
    const roomEl = currentRoomElement;
    switchB = true;
    if (!roomEl) return;

    const roomNode = getClosestNodeToElement(roomEl);
    const floor = document.querySelector('.floor-rooms:not(.hidden)');
    const svg = floor.querySelector('.evacuation-svg');
    svg.innerHTML = '';

    const graph = pathGraphs[currentFloorIndex];
    const exits = Array.from(floor.querySelectorAll('.room')).filter(el =>
        ['Лестница', 'Фойе', 'Эвакуационный выход'].includes(el.dataset.info)
    );

    let minDist = Infinity;
    let targetEl = null;

    exits.forEach(el => {
        const r = roomEl.getBoundingClientRect();
        const e = el.getBoundingClientRect();
        const dx = e.left - r.left;
        const dy = e.top - r.top;
        const d = dx * dx + dy * dy;
        if (d < minDist) {
            minDist = d;
            targetEl = el;
        }
    });
    if (currentFloorIndex === 1 && roomNode === 'FT'){
        targetEl = document.getElementById('fzk');
    }
    lastTargetExitByFloor[currentFloorIndex] = targetEl.dataset.info;
    
    const stairsNode = getClosestNodeToElement(targetEl);
    currentTargetNode = stairsNode;
    currentRoomNode = roomNode;
    updateInfoText();
    const path = findPath(graph, roomNode, stairsNode);

    if (path) {
        document.querySelectorAll('.evacuation-svg').forEach(s => s.innerHTML = '');
        document.querySelectorAll('.show-all-paths-button').forEach(btn => btn.style.display = 'none');
        document.querySelectorAll('.path-node').forEach(node => {
            node.style.backgroundColor = 'transparent';
        });
        floor.querySelectorAll('.path-node').forEach(node => {
            node.style.backgroundColor = (node.dataset.id === stairsNode) ? 'red' : 'transparent';
        });
        drawEvacuationPath(path, svg);
        floor.querySelector('.show-all-paths-button').style.display = 'block';
        floor0PendingDraw = false;
        floor1PendingDraw = false;
    }

}

document.querySelectorAll('.show-all-paths-button').forEach(button => {
     button.onclick = () => {
        activeRoute = true;
         disableFloorSwitching(true);
        lastActionByFloor[currentFloorIndex] = 'all-paths';


        const floorIndex = currentFloorIndex;
        const graph = pathGraphs[floorIndex];
        const exitsByFloor = [
            ['L', 'L2N', 'F', 'F2', 'L3N', 'TV'],  
            ['L', 'L2N', 'L3N', 'FTV'],                  
            ['L', 'L3N', 'L2N']                   
        ];

        const floor = document.querySelectorAll('.floor-rooms')[floorIndex];
        const svg = floor.querySelector('.evacuation-svg');
        svg.innerHTML = '';

        const userStartNode = getClosestNodeToElement(currentRoomElement);
        const exitNodes = exitsByFloor[floorIndex];


        floor.querySelectorAll('.path-node').forEach(node => {
            node.style.backgroundColor = exitNodes.includes(node.dataset.id) ? 'red' : 'transparent';
        });
        if (floorIndex === 2) {
            allPathsSteps = 2;
        } else if (floorIndex === 1) {
            allPathsSteps = 1;
        } else {
            allPathsSteps = 0;
        }
        updateInfoText();
        exitNodes.forEach(endNode => {
            const path = findPath(graph, userStartNode, endNode);
            if (!path) return;

            const coordsList = path.map(id => getNodeCoordinates(id)).filter(Boolean);


            const polylinePoints = coordsList.map(pt => `${pt.x},${pt.y}`).join(' ');
            const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
            polyline.setAttribute('points', polylinePoints);
            polyline.setAttribute('stroke', 'orange');
            polyline.setAttribute('stroke-width', '3');
            polyline.setAttribute('fill', 'none');
            polyline.style.pointerEvents = 'auto';
            polyline.style.cursor = 'pointer';



            svg.appendChild(polyline);
            const arrowSize = 10;
            for (let i = 1; i < coordsList.length; i++) {
                const from = coordsList[i - 1];
                const to = coordsList[i];

                const angle = Math.atan2(to.y - from.y, to.x - from.x);
                const arrow = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                const p1 = `${to.x},${to.y}`;
                const p2 = `${to.x - arrowSize * Math.cos(angle - Math.PI / 6)},${to.y - arrowSize * Math.sin(angle - Math.PI / 6)}`;
                const p3 = `${to.x - arrowSize * Math.cos(angle + Math.PI / 6)},${to.y - arrowSize * Math.sin(angle + Math.PI / 6)}`;
                arrow.setAttribute("points", `${p1} ${p2} ${p3}`);
                arrow.setAttribute("fill", "orange");
                svg.appendChild(arrow);
            }
        });
    if (floorIndex === 2) {
        lastActionByFloor[1] = 'all-paths';
        lastTargetExitByFloor[1] = null;

        lastActionByFloor[0] = 'all-paths';
        lastTargetExitByFloor[0] = null;
    } else if (floorIndex === 1) {
        lastActionByFloor[0] = 'all-paths';
        lastTargetExitByFloor[0] = null;
    }
    if (floorIndex === 2) {
        floor1PendingDraw = true;
        floor0PendingDraw = true;
    } else if (floorIndex === 1) {
        floor0PendingDraw = true;
    }

};})
const notAllowed = ['L3N', 'L2N', 'L', 'LB', 'K42', 'K11', 'TV']
function getDirectionText(from, to) {
    if(from in notAllowed){
        return " ";
    }
    if (to === "K20" && from !== "UC"){
        to = "UC";
    }
    if(from === "K20"){
        return " Поверните налево.";
    }
    const floor = document.querySelectorAll('.floor-rooms')[currentFloorIndex];
    const fromEl = floor.querySelector(`.path-node[data-id=${from}]`);
    const toEl = floor.querySelector(`.path-node[data-id=${to}]`);
    const fromX = parseFloat(fromEl.style.left);
    const fromY = parseFloat(fromEl.style.top);
    const toX = parseFloat(toEl.style.left);
    const toY = parseFloat(toEl.style.top);
    if(down.includes(from)){
        if(down.includes(to)){
            if(fromX < toX){
                return " Поверните направо.";
            }
            else if(fromX > toX){
                return " Поверните налево.";
            }
        }
        else if(up.includes(to)){
            if(fromX < toX){
                return " Поверните направо.";
            }
            else if(fromX > toX){
                return " Поверните налево.";
            }
            else{
                return " Идите прямо.";
            }
        }
        else if(right.includes(to)){
            if(from === "K23" || from === "GN" || from === "K36"){
                return " Идите прямо.";
            }
            return " Поверните направо.";
        }
        else{
            if(to === "ACT"){
                return " Поверните направо.";
            }
            else if (to === "FT" || to === "FTV" || to === "TN" || to === "TV"){
                if(from === "GN" || from === "K23"){
                    return " Идите прямо.";
                }
                else{
                    return " Поверните направо.";
                }
            }
            else if(to === "L2N"){
                return " Поверните направо.";
            }
            else if(to === "L3N"){
                return " Поверните налево.";
            }
        }
    }
    else if(right.includes(from)){
        if(down.includes(to)){
            return " Поверните налево.";
        }
        else if(up.includes(to)){
            if (to === "K38" && to === "SP2N"){
                return " Идите прямо.";
            }
            return " Поверните налево.";
        }
        else if(right.includes(to)){
            if(toY > fromY){
                return " Поверните налево.";
            }
            else{
                return " Поверните направо.";
            }
        }
        else{
            if(to === "TN" || to === "TV"){
                if(from === "SN"){
                    return " Идите прямо.";
                }
                return " Поверните направо.";
            }
            else if (to === "FT" || to === "FTV"){
                if(from === "R"){
                    return " Идите прямо.";
                }
                return " Поверните направо.";
            }
            else if(to === "L"){
                return " Поверните направо.";
            }
            else if(to === "L2N"){
                return " Поверните налево.";
            }
            else if(to === "L3N"){
                return " Поверните налево.";
            }
            else if (to === "ACT"){
                return " Поверните налево.";
            }
        }
    }
    else if(up.includes(from)){
        if(down.includes(to)){
            if(fromX < toX){
                return " Поверните налево.";
            }
            else if(fromX > toX){
                return " Поверните направо.";
            }
            else{
                return " Идите прямо.";
            }
        }
        else if(up.includes(to)){
            if(fromX < toX){
                return " Поверните налево.";
            }
            else if(fromX > toX){
                return " Поверните направо.";
            }

        }
        else if(right.includes(to)){
            return " Поверните налево.";
        }
        else{
            if (to === "FT" || to === "FTV" || to === "TN" || to === "TV"){
                return " Поверните налево.";
            }
            else if(to === "L2N"){
                if(from === "K38"){
                    return " Поверните направо.";
                }
                return " Поверните налево.";
            }
            else if(to === "L3N"){
                return " Поверните направо.";
            }
        }
    }
    else if(from === "TN"){
        return " Поверните налево.";
    }
    else if(from === "TV"){
        if(to === "TN"){
            return " Поверните налево.";
        }
        return " Поверните направо.";
    }
    else if(from === "FTV"){
        return " Идите прямо. ";
    }
    else if(from === "FT"){
        if(to === "R"){
            return " Идите прямо.";
        }
        else if(to === "L"){
            return " Поверните налево.";
        }
        else if(to === "FTV"){
            return " Идите прямо.";
        }
        return  "Поверните направо."
    }
    else if(from === "ACT"){
        if(to === "L2N"){
            return " Идите прямо.";
        }
        else if(to === "K36"){
            return " Поверните направо";
        }
        return " Поверните налево";
    }
    return " ";
}


function updateInfoText() {
    const popup = document.getElementById('info-popup-global');
    const text = document.getElementById('info-text');
    const floor = currentFloorIndex + 1;

    let result = '';
    let directionText = '';
    if(currentTargetNode !== null){
        directionText = getDirectionText(currentRoomNode, currentTargetNode);
        currentTargetNode = null;
    }

    const action = lastActionByFloor[currentFloorIndex];
    const targetExit = lastTargetExitByFloor[currentFloorIndex];

    const isPendingForThisFloor =
        (currentFloorIndex === 0 && floor0PendingDraw) ||
        (currentFloorIndex === 1 && floor1PendingDraw);

    const isAllPathsFromFloor3 = lastActionByFloor[2] === 'all-paths' && floor < 3;
    const nextBtn = document.getElementById('route-next');
    if (
        !activeRoute ||
        routeFloors.length === 0 ||
        routeStepIndex >= routeFloors.length ||
        (routeFloors[routeStepIndex] === currentFloorIndex)
    ) {
        nextBtn.style.display = 'none';
    } else {
        nextBtn.style.display = 'inline-block';
    }

    if(
        allPathsSteps > 0
    ) {
        nextBtn.style.display = 'inline-block';
        allPathsSteps--;
    }
    if (!action && !isPendingForThisFloor) {
        text.innerText = '';
        popup.classList.add('hidden');
        return;
    }

    if (action === 'evacuate') {
        if (floor === 1) {
            if (targetExit === 'Лестница') {
                result = 'Дойдите до ближайшей лестницы и спуститесь до эвакуационного выхода.' + directionText;
            } else if (targetExit === 'Фойе') {
                result = 'Дойдите до фойе к главному выходу.' + directionText;
            } else if (targetExit === 'Эвакуационный выход') {
                result = 'Дойдите до эвакуационного выхода у тех. центра' + directionText;
            }
        } else {
            if (floor === 2 && targetExit === 'Эвакуационный выход') {
                result = 'Дойдите до эвакуационного выхода.' + directionText;
            } else {
                result = 'Дойдите до ближайшей лестницы и спуститесь до эвакуационного выхода.' + directionText;
            }
        }
    } else if (action === 'all-paths' || isPendingForThisFloor) {
        if (floor === 1) {
            result = 'Дойдите до лестницы и спускайтесь до выхода, либо дойдите до запасного выхода у тех. центра, либо до главного выхода через фойе.' + directionText;
        } else if (floor === 2) {
            result = 'Дойдите до любой из лестниц и спускайтесь до 1 этажа, либо выйдите через спортивный зал.' + directionText;
        } else if (floor === 3) {
            result = 'Дойдите до любой из лестниц.' + directionText;
        }

        if (isAllPathsFromFloor3 || (lastActionByFloor[1] === 'all-paths' && floor == 1)) {
            result = 'Продолжайте спускаться по лестнице. Либо ' + result.toLowerCase();
        }
    } else if (action === 'room-to-room') {
        const targetEl = document.getElementById(lastTargetExitByFloor[currentFloorIndex]);
        if (!targetEl) {
            text.innerText = '';
            popup.classList.add('hidden');
            return;
        }

        const targetFloor = getFloorIndexForRoom(targetEl);

        if (targetFloor === currentFloorIndex && pendingPaths.length !== 1) {
            result = 'Следуйте маршруту.' + directionText;
        } else if (currentFloorIndex > targetFloor) {
            result = `Спуститесь по лестнице до ${targetFloor + 1} этажа.` + directionText;
        } else if (currentFloorIndex < targetFloor) {
            result = `Поднимитесь по лестнице до ${targetFloor + 1} этажа.` + directionText;
        } else {
            result = 'Спуститесь по лестнице до 2 этажа.' + directionText;
        }
    }

    text.innerText = result;
    if (result !== '') {
        popup.classList.remove('hidden');
    } else {
        popup.classList.add('hidden');
    }
}