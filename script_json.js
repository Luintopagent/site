

function makeCheckbox(id, labelText) {
  const lbl = document.createElement('label');
  lbl.style.display = 'inline-flex';
  lbl.style.alignItems = 'center';
  lbl.style.gap = '6px';
  lbl.style.fontSize = '14px';
  lbl.style.whiteSpace = 'nowrap';

  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.id = id;

  const span = document.createElement('span');
  span.textContent = labelText;

  lbl.appendChild(cb);
  lbl.appendChild(span);
  return { lbl, cb, span };
}


let building = null;


const container = document.querySelector('.container');
const floorsContainer = document.getElementById('floors-container');
const floorButtonsContainer = document.getElementById('floor-buttons');

const popup = document.getElementById('info-popup');
const popupText = document.getElementById('popup-text');
const popupImage = document.getElementById('popup-image');

const imHereButton = document.getElementById('im-here-button');
const searchButton = document.getElementById('search-button');
const evacuateButton = document.getElementById('evacuate-button');

const searchContainer = document.getElementById('search-container');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');

const infoPopupGlobal = document.getElementById('info-popup-global');
const infoText = document.getElementById('info-text');
const routeFinishBtn = document.getElementById('route-finish');
const routeNextBtn = document.getElementById('route-next');


let floors = [];              
let currentFloorIndex = 0;

let currentRoomElement = null;
let originRoomId = null;
let previouslyHighlightedRoom = null;

let floorSwitchingDisabled = false;

let activeMode = null;        
let routeSteps = [];          
let routeStepIndex = 0;
let routeTargetRoomId = null;
let routeTargetExitRoomId = null;
let showingAllPaths = false;


let scale = 1;
let posX = 0;
let posY = 0;
let isDragging = false;
let startX = 0;
let startY = 0;
let initialX = 0;
let initialY = 0;
let startDistance = 0;
let lastTouchX = 0;
let lastTouchY = 0;


let roomIndex = new Map();    
let nodeIndex = new Map();    
let globalGraph = {};         


let showGraphOverlay = false;


let activeEditor = null;
let editMode = false; 


let stairsEditorSelectedConnectorId = null;
let stairsPickFloorIndex = null;


let editorPanelDrag = { active: false, pointerId: null, offsetX: 0, offsetY: 0 };


let graphAction = 'select';   
let graphConnectDragMode = false; 
let selectedNodeId = null;
let edgeStartNodeId = null;   
let draggingNodeId = null;
let dragPointerId = null;
let tempEdgeLine = null;


let draggingEdge = null; 


let roomEditEnabled = true;
let roomAction = 'select';    
let selectedRoomId = null;
let draggingRoomId = null;
let roomDragPointerId = null;
let roomDragOffset = { dx: 0, dy: 0 };


const GRID_STEP_DEFAULT_PX = 10;
function getGridStepPx() {
  const v = building?.editor?.gridStepPx;
  const n = Number(v);
  return (Number.isFinite(n) && n > 0) ? n : GRID_STEP_DEFAULT_PX;
}
function snapToGrid(v, stepPx) {
  const s = Number(stepPx) || GRID_STEP_DEFAULT_PX;
  return Math.round(v / s) * s;
}
function isAnyEditor() { return showGraphOverlay && activeEditor !== null; }
function isGraphEditor() { return showGraphOverlay && activeEditor === 'graph'; }
function isRoomsEditor() { return showGraphOverlay && activeEditor === 'rooms'; }
function isFloorEditor() { return showGraphOverlay && activeEditor === 'floor'; }
function isStairsEditor() { return showGraphOverlay && activeEditor === 'stairs'; }
function qs(sel, root=document){ return root.querySelector(sel); }
function qsa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

function setInlineStyles(el, styleObj) {
  if (!styleObj) return;
  Object.entries(styleObj).forEach(([k,v]) => {
    if (v === undefined || v === null) return;
    el.style.setProperty(k, String(v));
  });
}

function getFloorDiv(floorIndex) {
  return floors[floorIndex] || null;
}

function getSvgForFloor(floorIndex) {
  const floorDiv = getFloorDiv(floorIndex);
  return floorDiv ? qs('svg.evacuation-svg', floorDiv) : null;
}

function getGraphSvgForFloor(floorIndex) {
  const floorDiv = getFloorDiv(floorIndex);
  return floorDiv ? qs('svg.graph-svg', floorDiv) : null;
}

function clearSvg(svg) {
  if (svg) svg.innerHTML = '';
}

function clearNodeHighlights() {
  floors.forEach(floorDiv => {
    qsa('.path-node', floorDiv).forEach(n => { n.style.backgroundColor = 'transparent'; });
  });
}

function clearAllPaths() {
  floors.forEach((_, idx) => clearSvg(getSvgForFloor(idx)));
  clearNodeHighlights();
}

function updateFloorButtonsActive() {
  qsa('.floor', floorButtonsContainer).forEach((btn, idx) => {
    btn.classList.toggle('active-floor', idx === currentFloorIndex);
  });
}

function disableFloorSwitching(disable) {
  floorSwitchingDisabled = disable;
  qsa('.floor', floorButtonsContainer).forEach(btn => {
    btn.style.pointerEvents = disable ? 'none' : 'auto';
    btn.style.opacity = disable ? '0.5' : '1';
  });
}

function getFloorCfg(floorIndex) {
  return building?.floors?.find(f => f.index === floorIndex) || null;
}

function ensureUndirectedEdge(floorIndex, a, b) {
  const floor = getFloorCfg(floorIndex);
  if (!floor) return;
  floor.graph = floor.graph || {};
  floor.graph[a] = floor.graph[a] || [];
  floor.graph[b] = floor.graph[b] || [];
  if (!floor.graph[a].includes(b)) floor.graph[a].push(b);
  if (!floor.graph[b].includes(a)) floor.graph[b].push(a);
}

function removeUndirectedEdge(floorIndex, a, b) {
  const floor = getFloorCfg(floorIndex);
  if (!floor || !floor.graph) return;
  if (floor.graph[a]) floor.graph[a] = floor.graph[a].filter(x => x !== b);
  if (floor.graph[b]) floor.graph[b] = floor.graph[b].filter(x => x !== a);
}

function deleteNodeFromGraph(floorIndex, nodeId) {
  const floor = getFloorCfg(floorIndex);
  if (!floor) return;
  floor.graph = floor.graph || {};
  Object.keys(floor.graph).forEach(k => {
    floor.graph[k] = (floor.graph[k] || []).filter(x => x !== nodeId);
  });
  delete floor.graph[nodeId];
  floor.nodes = (floor.nodes || []).filter(n => n.id !== nodeId);
}

function setRoomData(floorIndex, oldId, newRoomObj) {
  const floor = getFloorCfg(floorIndex);
  if (!floor) return;
  floor.rooms = floor.rooms || [];
  const idx = floor.rooms.findIndex(r => r.id === oldId);
  if (idx >= 0) floor.rooms[idx] = newRoomObj;
  else floor.rooms.push(newRoomObj);
}

function deleteRoomData(floorIndex, roomId) {
  const floor = getFloorCfg(floorIndex);
  if (!floor) return;
  floor.rooms = (floor.rooms || []).filter(r => r.id !== roomId);
}


async function loadBuilding() {
  const cfg = document.body.dataset.config || 'building.json';
  const res = await fetch(cfg, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Не удалось загрузить ${cfg}: ${res.status}`);
  building = await res.json();
}

function createRoomButton(floorIndex, r) {
  const roomBtn = document.createElement('button');
  roomBtn.id = r.id;
  roomBtn.className = ['room', ...(r.classes || [])].join(' ').trim();
  roomBtn.textContent = r.label || r.id;
  if (r.info) roomBtn.dataset.info = r.info;
  if (r.image) roomBtn.dataset.image = r.image;
  if (r.nodeId) roomBtn.dataset.nodeId = r.nodeId;
  setInlineStyles(roomBtn, r.style || {});

  roomBtn.addEventListener('pointerdown', (e) => onRoomPointerDown(e, floorIndex, roomBtn));
  roomBtn.addEventListener('click', (e) => {
    
    if (isRoomsEditor()) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    openRoomPopup(roomBtn);
  });

  roomIndex.set(r.id, { floorIndex, element: roomBtn, data: r });
  return roomBtn;
}

function createNodeDiv(floorIndex, n) {
  const nodeDiv = document.createElement('div');
  nodeDiv.className = 'path-node';
  nodeDiv.dataset.id = n.id;
  if (n.label) nodeDiv.dataset.label = n.label;
  setInlineStyles(nodeDiv, n.style || {});
  nodeIndex.set(`${floorIndex}:${n.id}`, nodeDiv);
  return nodeDiv;
}

function renderBuilding() {
  if (!building) return;

  
  floorButtonsContainer.innerHTML = '';
  building.floors
    .slice()
    .sort((a,b) => a.index - b.index)
    .forEach(floor => {
      const btn = document.createElement('div');
      btn.className = 'floor';
      btn.textContent = floor.label || `Этаж ${floor.index+1}`;
      setInlineStyles(btn, floor.floorButtonStyle || {});
      btn.addEventListener('click', () => {
        if (!floorSwitchingDisabled) showFloor(floor.index + 1);
      });
      floorButtonsContainer.appendChild(btn);
    });

  
  floorsContainer.innerHTML = '';
  roomIndex.clear();
  nodeIndex.clear();

  building.floors
    .slice()
    .sort((a,b) => a.index - b.index)
    .forEach(floor => {
      const floorDiv = document.createElement('div');
      floorDiv.id = floor.id;
      floorDiv.className = 'floor-rooms hidden';
      floorDiv.style.backgroundImage = `url('${floor.backgroundImage}')`;

      
      const allBtn = document.createElement('button');
      allBtn.className = 'show-all-paths-button';
      allBtn.textContent = 'Все пути к выходам';
      setInlineStyles(allBtn, floor.showAllPathsButtonStyle || {});
      allBtn.addEventListener('click', () => showAllPathsOnCurrentFloor());
      floorDiv.appendChild(allBtn);

      
      const graphSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      graphSvg.classList.add('graph-svg');
      graphSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      graphSvg.dataset.floorIndex = String(floor.index);
      graphSvg.addEventListener('pointermove', onGraphSvgPointerMove);
      graphSvg.addEventListener('pointerup', onGraphSvgPointerUp);
      graphSvg.addEventListener('pointercancel', onGraphSvgPointerCancel);
      graphSvg.addEventListener('lostpointercapture', onGraphSvgPointerCancel);
      setInlineStyles(graphSvg, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        'z-index': '3',
        'pointer-events': 'none'
      });
      floorDiv.appendChild(graphSvg);

      
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.classList.add('evacuation-svg');
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      setInlineStyles(svg, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        'z-index': '4',
        'pointer-events': 'none'
      });
      floorDiv.appendChild(svg);

      
      (floor.rooms || []).forEach(r => {
        const roomBtn = createRoomButton(floor.index, r);
        floorDiv.appendChild(roomBtn);
      });

      
      (floor.nodes || []).forEach(n => {
        const nodeDiv = createNodeDiv(floor.index, n);
        floorDiv.appendChild(nodeDiv);
      });

      
      floorDiv.addEventListener('pointerdown', (e) => {
        if (!isAnyEditor()) return;

        const t = e.target;

        
        if (t.closest && (t.closest('#editor-panel') || t.closest('#editor-bar'))) return;

        
        if (activeEditor === 'graph' && graphAction === 'add-node') {
          if (t.classList && t.classList.contains('room')) return;
          e.preventDefault();
          e.stopPropagation();
          const pt = getLocalPointFromClient(e.clientX, e.clientY, floor.index);
          addNodeAtPoint(floor.index, pt.x, pt.y);
          
          graphAction = 'select';
          syncEditorBarUI();
          updateEditorUI();
          return;
        }

        
        if (activeEditor === 'rooms' && roomAction === 'add-room') {
          e.preventDefault();
          e.stopPropagation();
          const pt = getLocalPointFromClient(e.clientX, e.clientY, floor.index);
          addRoomAtPoint(floor.index, pt.x, pt.y);
          
          roomAction = 'select';
          syncEditorBarUI();
          updateEditorUI();
          return;
        }
      });

      floorsContainer.appendChild(floorDiv);
    });

  floors = qsa('.floor-rooms', floorsContainer);
  updateFloorButtonsActive();
}


function buildGlobalGraph() {
  globalGraph = {};

  
  building.floors.forEach(floor => {
    const graph = floor.graph || {};
    Object.keys(graph).forEach(nodeId => {
      const fromKey = `${floor.index}:${nodeId}`;
      if (!nodeIndex.has(fromKey)) return;
      globalGraph[fromKey] = globalGraph[fromKey] || [];
      (graph[nodeId] || []).forEach(nbId => {
        const toKey = `${floor.index}:${nbId}`;
        if (!nodeIndex.has(toKey)) return;
        globalGraph[fromKey].push(toKey);
      });
    });
  });

  
  (building.connectors || []).forEach(conn => {
    const nodesByFloor = conn.nodesByFloor || {};
    const floorIndices = Object.keys(nodesByFloor)
      .map(x => parseInt(x, 10))
      .filter(Number.isFinite)
      .sort((a,b) => a-b);

    for (let i = 0; i < floorIndices.length - 1; i++) {
      const fA = floorIndices[i];
      const fB = floorIndices[i+1];
      const nA = nodesByFloor[String(fA)];
      const nB = nodesByFloor[String(fB)];
      if (!nA || !nB) continue;

      const keyA = `${fA}:${nA}`;
      const keyB = `${fB}:${nB}`;
      if (!nodeIndex.has(keyA) || !nodeIndex.has(keyB)) continue;

      globalGraph[keyA] = globalGraph[keyA] || [];
      globalGraph[keyB] = globalGraph[keyB] || [];
      globalGraph[keyA].push(keyB);
      globalGraph[keyB].push(keyA);
    }
  });

  
  Object.keys(globalGraph).forEach(k => {
    globalGraph[k] = Array.from(new Set(globalGraph[k]));
  });
}


function parseCssToPx(val, basePx) {
  if (!val) return 0;
  const s = String(val).trim();
  if (s.endsWith('px')) return parseFloat(s) || 0;
  if (s.endsWith('%')) return (parseFloat(s) || 0) * basePx / 100;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function getFloorBaseSize(floorIndex) {
  const floorDiv = getFloorDiv(floorIndex);
  if (!floorDiv) return { w: 800, h: 750 };
  const cs = getComputedStyle(floorDiv);
  const w = parseFloat(cs.width) || 800;
  const h = parseFloat(cs.height) || 750;
  return { w, h };
}

function getElementCenterFromInline(floorIndex, el) {
  const { w, h } = getFloorBaseSize(floorIndex);
  const left = parseCssToPx(el.style.left, w);
  const top = parseCssToPx(el.style.top, h);

  const cs = getComputedStyle(el);
  const ew = parseFloat(cs.width) || (el.classList.contains('path-node') ? 8 : 60);
  const eh = parseFloat(cs.height) || (el.classList.contains('path-node') ? 8 : 30);
  return { x: left + ew / 2, y: top + eh / 2 };
}

function getNodeCenter(floorIndex, nodeId) {
  const nodeEl = nodeIndex.get(`${floorIndex}:${nodeId}`);
  if (!nodeEl) return null;
  return getElementCenterFromInline(floorIndex, nodeEl);
}

function getLocalPointFromClient(clientX, clientY, floorIndex) {
  const floorDiv = getFloorDiv(floorIndex);
  const rect = floorDiv.getBoundingClientRect();
  
  const x = (clientX - rect.left) / scale;
  const y = (clientY - rect.top) / scale;
  return { x, y };
}

function getClosestNodeToElement(floorIndex, element) {
  if (!element) return null;

  
  const explicit = element.dataset?.nodeId;
  if (explicit && nodeIndex.has(`${floorIndex}:${explicit}`)) return explicit;

  
  const floorDiv = getFloorDiv(floorIndex);
  if (!floorDiv) return null;
  const roomCenter = getElementCenterFromInline(floorIndex, element);

  let best = null;
  let bestDist = Infinity;

  qsa('.path-node', floorDiv).forEach(node => {
    const nodeCenter = getElementCenterFromInline(floorIndex, node);
    const d = Math.hypot(nodeCenter.x - roomCenter.x, nodeCenter.y - roomCenter.y);
    if (d < bestDist) {
      bestDist = d;
      best = node.dataset.id;
    }
  });

  return best;
}


function getStairPenaltyPx() {
  const v = building?.navigation?.stairPenaltyPx;
  const n = Number(v);
  return Number.isFinite(n) ? n : 120;
}

let _nodeCenterCache = new Map();
function getNodeCenterKey(nodeKey) {
  if (_nodeCenterCache.has(nodeKey)) return _nodeCenterCache.get(nodeKey);
  const [fStr, nodeId] = nodeKey.split(':');
  const f = parseInt(fStr, 10);
  const c = getNodeCenter(f, nodeId);
  _nodeCenterCache.set(nodeKey, c || null);
  return c || null;
}
function resetNodeCenterCache() { _nodeCenterCache = new Map(); }

function getEdgeWeight(fromKey, toKey) {
  const [fA] = fromKey.split(':');
  const [fB] = toKey.split(':');
  if (fA !== fB) return getStairPenaltyPx();

  const a = getNodeCenterKey(fromKey);
  const b = getNodeCenterKey(toKey);
  if (!a || !b) return 1;
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function dijkstraPath(startKey, goalKeySet) {
  if (!startKey || !goalKeySet || goalKeySet.size === 0) return null;
  if (goalKeySet.has(startKey)) return [startKey];

  const heap = [[0, startKey]];
  const dist = new Map([[startKey, 0]]);
  const prev = new Map();

  while (heap.length) {
    heap.sort((a, b) => a[0] - b[0]);
    const [d, u] = heap.shift();
    if (d !== dist.get(u)) continue;

    if (goalKeySet.has(u)) {
      const path = [u];
      let cur = u;
      while (prev.has(cur)) {
        cur = prev.get(cur);
        path.push(cur);
      }
      path.reverse();
      return path;
    }

    const neighbors = globalGraph[u] || [];
    for (const v of neighbors) {
      const nd = d + getEdgeWeight(u, v);
      const best = dist.get(v);
      if (best === undefined || nd < best) {
        dist.set(v, nd);
        prev.set(v, u);
        heap.push([nd, v]);
      }
    }
  }
  return null;
}

function bfsOnFloor(floorIndex, startNodeId, endNodeId) {
  const floor = getFloorCfg(floorIndex);
  if (!floor) return null;
  const graph = floor.graph || {};
  if (startNodeId === endNodeId) return [startNodeId];

  const q = [startNodeId];
  const prev = new Map();
  const visited = new Set([startNodeId]);

  while (q.length) {
    const cur = q.shift();
    const neighbors = graph[cur] || [];
    for (const nb of neighbors) {
      if (visited.has(nb)) continue;
      visited.add(nb);
      prev.set(nb, cur);

      if (nb === endNodeId) {
        const path = [nb];
        let p = nb;
        while (prev.has(p)) {
          p = prev.get(p);
          path.push(p);
        }
        path.reverse();
        return path;
      }
      q.push(nb);
    }
  }
  return null;
}

function splitGlobalPathIntoSteps(pathKeys) {
  if (!pathKeys || pathKeys.length === 0) return [];
  const steps = [];
  let [curFloorStr, curNodeId] = pathKeys[0].split(':');
  let curStep = { floorIndex: parseInt(curFloorStr, 10), nodeIds: [curNodeId] };

  for (let i = 1; i < pathKeys.length; i++) {
    const [fStr, nodeId] = pathKeys[i].split(':');
    const f = parseInt(fStr, 10);
    if (f === curStep.floorIndex) curStep.nodeIds.push(nodeId);
    else {
      steps.push(curStep);
      curStep = { floorIndex: f, nodeIds: [nodeId] };
    }
  }
  steps.push(curStep);
  return steps;
}


function drawPathOnFloor(floorIndex, nodeIds, options={}) {
  const svg = getSvgForFloor(floorIndex);
  if (!svg || !nodeIds || nodeIds.length === 0) return;

  const color = options.color || 'limegreen';
  const width = options.width || 4;

  const pts = [];
  for (const nodeId of nodeIds) {
    const c = getNodeCenter(floorIndex, nodeId);
    if (!c) continue;
    pts.push(`${c.x},${c.y}`);
  }
  if (pts.length < 2) return;

  const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  polyline.setAttribute('points', pts.join(' '));
  polyline.setAttribute('fill', 'none');
  polyline.setAttribute('stroke', color);
  polyline.setAttribute('stroke-width', String(width));
  polyline.setAttribute('stroke-linecap', 'round');
  polyline.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(polyline);

  for (let i = 0; i < nodeIds.length - 1; i++) {
    const a = getNodeCenter(floorIndex, nodeIds[i]);
    const b = getNodeCenter(floorIndex, nodeIds[i+1]);
    if (!a || !b) continue;

    const angle = Math.atan2(b.y - a.y, b.x - a.x);

    const arrowLength = 10;
    const arrowWidth = 6;

    const tipX = b.x;
    const tipY = b.y;

    const leftX = tipX - arrowLength * Math.cos(angle) + arrowWidth * Math.sin(angle);
    const leftY = tipY - arrowLength * Math.sin(angle) - arrowWidth * Math.cos(angle);
    const rightX = tipX - arrowLength * Math.cos(angle) - arrowWidth * Math.sin(angle);
    const rightY = tipY - arrowLength * Math.sin(angle) + arrowWidth * Math.cos(angle);

    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    arrow.setAttribute('points', `${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`);
    arrow.setAttribute('fill', color);
    svg.appendChild(arrow);
  }
}


function clearGraphOverlayAll() {
  for (let i = 0; i < floors.length; i++) {
    const svg = getGraphSvgForFloor(i);
    if (svg) svg.innerHTML = '';
  }
}

function getNodeLabel(floorIndex, nodeId) {
  const floor = getFloorCfg(floorIndex);
  const n = (floor?.nodes || []).find(x => x.id === nodeId);
  return n?.label || nodeIndex.get(`${floorIndex}:${nodeId}`)?.dataset?.label || nodeId;
}

function setNodeLabel(floorIndex, nodeId, label) {
  const floor = getFloorCfg(floorIndex);
  if (!floor) return;
  floor.nodes = floor.nodes || [];
  const n = floor.nodes.find(x => x.id === nodeId);
  if (n) n.label = label;
  const el = nodeIndex.get(`${floorIndex}:${nodeId}`);
  if (el) el.dataset.label = label;
}

function stopTempEdge() {
  if (tempEdgeLine && tempEdgeLine.parentNode) tempEdgeLine.parentNode.removeChild(tempEdgeLine);
  tempEdgeLine = null;
}

function stopGraphDragState() {
  draggingNodeId = null;
  dragPointerId = null;
  stopTempEdge();
  edgeStartNodeId = null;
  draggingEdge = null;
}

function stopRoomDragState() {
  draggingRoomId = null;
  roomDragPointerId = null;
  roomDragOffset = { dx: 0, dy: 0 };
}

function getGraphFloorIndexFromEvent(e) {
  const svg = e.currentTarget;
  const f = parseInt(svg?.dataset?.floorIndex || String(currentFloorIndex), 10);
  return Number.isFinite(f) ? f : currentFloorIndex;
}

function onGraphSvgPointerMove(e) {
  if (!isGraphEditor()) return;
  if (dragPointerId !== e.pointerId) return;

  const floorIndex = getGraphFloorIndexFromEvent(e);
  const pt = getLocalPointFromClient(e.clientX, e.clientY, floorIndex);

  
  if (draggingEdge && draggingEdge.floorIndex === floorIndex) {
    const dx = pt.x - draggingEdge.startPt.x;
    const dy = pt.y - draggingEdge.startPt.y;

    moveNodeToPoint(floorIndex, draggingEdge.a, draggingEdge.startA.x + dx, draggingEdge.startA.y + dy);
    moveNodeToPoint(floorIndex, draggingEdge.b, draggingEdge.startB.x + dx, draggingEdge.startB.y + dy);

    drawGraphOverlayOnFloor(floorIndex);
    e.preventDefault();
    return;
  }

  
  if (edgeStartNodeId && tempEdgeLine) {
    tempEdgeLine.setAttribute('x2', String(pt.x));
    tempEdgeLine.setAttribute('y2', String(pt.y));
    e.preventDefault();
    return;
  }

  
  if (draggingNodeId) {
    moveNodeToPoint(floorIndex, draggingNodeId, pt.x, pt.y);
    drawGraphOverlayOnFloor(floorIndex);
    e.preventDefault();
  }
}

function onGraphSvgPointerUp(e) {
  if (!isGraphEditor()) return;
  if (dragPointerId !== e.pointerId) return;

  const floorIndex = getGraphFloorIndexFromEvent(e);
  const pt = getLocalPointFromClient(e.clientX, e.clientY, floorIndex);

  
  if (draggingEdge) {
    stopGraphDragState();
    rebuildAfterGraphEdit(false);
    updateEditorUI();
    e.preventDefault();
    return;
  }


  
  if (edgeStartNodeId && tempEdgeLine) {
    const target = hitTestNode(floorIndex, pt.x, pt.y, edgeStartNodeId);
    
    if (target) ensureUndirectedEdge(floorIndex, edgeStartNodeId, target);
    if (graphAction === 'add-edge') graphAction = 'select';

    stopTempEdge();
    stopGraphDragState();
    rebuildAfterGraphEdit(true);
    e.preventDefault();
    return;
  }

  
  if (draggingNodeId) {
    stopGraphDragState();
    rebuildAfterGraphEdit(false);
    e.preventDefault();
    return;
  }

  stopGraphDragState();
}

function onGraphSvgPointerCancel(e) {
  if (!isGraphEditor()) return;
  if (dragPointerId !== e.pointerId) return;
  stopGraphDragState();
  rebuildAfterGraphEdit(false);
}

function startTempEdge(floorIndex, x1, y1) {
  const svg = getGraphSvgForFloor(floorIndex);
  if (!svg) return;
  tempEdgeLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  tempEdgeLine.dataset.floorIndex = String(floorIndex);
  tempEdgeLine.setAttribute('x1', String(x1));
  tempEdgeLine.setAttribute('y1', String(y1));
  tempEdgeLine.setAttribute('x2', String(x1));
  tempEdgeLine.setAttribute('y2', String(y1));
  tempEdgeLine.setAttribute('stroke', 'rgba(0,0,0,0.45)');
  tempEdgeLine.setAttribute('stroke-width', '2');
  tempEdgeLine.setAttribute('stroke-dasharray', '4 3');
  tempEdgeLine.style.pointerEvents = 'none';
  svg.appendChild(tempEdgeLine);
}

function drawGraphOverlayOnFloor(floorIndex) {
  const floorCfg = getFloorCfg(floorIndex);
  const svg = getGraphSvgForFloor(floorIndex);
  if (!floorCfg || !svg) return;

  const _savedTempEdge = tempEdgeLine && tempEdgeLine.dataset && tempEdgeLine.dataset.floorIndex === String(floorIndex) ? tempEdgeLine : null;
  svg.innerHTML = '';
  if (_savedTempEdge) {
    
    tempEdgeLine = _savedTempEdge;
  }


  if (!showGraphOverlay) return;

  const graph = floorCfg.graph || {};
  const edges = new Set();

  
  Object.keys(graph).forEach(a => {
    (graph[a] || []).forEach(b => {
      const k = a < b ? `${a}|${b}` : `${b}|${a}`;
      if (edges.has(k)) return;
      edges.add(k);

      const ca = getNodeCenter(floorIndex, a);
      const cb = getNodeCenter(floorIndex, b);
      if (!ca || !cb) return;

      
      const hit = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      hit.setAttribute('x1', String(ca.x));
      hit.setAttribute('y1', String(ca.y));
      hit.setAttribute('x2', String(cb.x));
      hit.setAttribute('y2', String(cb.y));
      hit.setAttribute('stroke', 'transparent');
      hit.setAttribute('stroke-width', '24'); 
      hit.style.pointerEvents = (activeEditor === 'graph') ? 'stroke' : 'none';
      hit.style.cursor = (activeEditor === 'graph') ? 'pointer' : 'default';

      hit.addEventListener('pointerdown', (e) => {
        if (activeEditor !== 'graph') return;

        
        if (graphAction === 'delete' || e.altKey) {
          e.preventDefault(); e.stopPropagation();
          removeUndirectedEdge(floorIndex, a, b);
          if (graphAction === 'delete') graphAction = 'select';
          rebuildAfterGraphEdit(true);
          updateEditorUI();
          return;
        }

        
        if (graphAction === 'select') {
          e.preventDefault(); e.stopPropagation();

          const pt = getLocalPointFromClient(e.clientX, e.clientY, floorIndex);
          edgeStartNodeId = null;
          stopTempEdge();
          const ca2 = getNodeCenter(floorIndex, a);
          const cb2 = getNodeCenter(floorIndex, b);
          if (!ca2 || !cb2) return;

          draggingEdge = {
            floorIndex,
            a,
            b,
            startPt: { x: pt.x, y: pt.y },
            startA: { x: ca2.x, y: ca2.y },
            startB: { x: cb2.x, y: cb2.y }
          };

          dragPointerId = e.pointerId;
          try { svg.setPointerCapture(dragPointerId); } catch {}
          return;
        }
      });

      
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(ca.x));
      line.setAttribute('y1', String(ca.y));
      line.setAttribute('x2', String(cb.x));
      line.setAttribute('y2', String(cb.y));
      line.setAttribute('stroke', 'rgba(0,0,0,0.25)');
      line.setAttribute('stroke-width', '2');
      line.style.pointerEvents = 'none';

      svg.appendChild(hit);
      svg.appendChild(line);
    });
  });

  
  const floorDiv = getFloorDiv(floorIndex);
  if (!floorDiv) return;

  qsa('.path-node', floorDiv).forEach(nodeEl => {
    const nodeId = nodeEl.dataset.id;
    const c = getNodeCenter(floorIndex, nodeId);
    if (!c) return;

    const isSel = selectedNodeId === nodeId;

    
    const hit = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    hit.setAttribute('cx', String(c.x));
    hit.setAttribute('cy', String(c.y));
    hit.setAttribute('r', isSel ? '18' : '16');
    hit.setAttribute('fill', 'transparent');
    hit.setAttribute('data-id', nodeId);
    hit.style.pointerEvents = (activeEditor === 'graph' || activeEditor === 'stairs') ? 'auto' : 'none';
    hit.style.cursor = (activeEditor === 'graph') ? 'grab' : 'default';

    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', String(c.x));
    dot.setAttribute('cy', String(c.y));
    dot.setAttribute('r', isSel ? '6' : '5');
    dot.setAttribute('fill', isSel ? 'rgba(0,0,0,0.95)' : 'rgba(0,0,0,0.55)');
    dot.style.pointerEvents = 'none';

    
    const label = getNodeLabel(floorIndex, nodeId);
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', String(c.x + 10));
    text.setAttribute('y', String(c.y - 10));
    text.setAttribute('font-size', '12');
    text.setAttribute('fill', 'rgba(0,0,0,0.75)');
    text.textContent = label;
    text.style.pointerEvents = 'none';

    hit.addEventListener('pointerdown', (e) => {
      if (!(activeEditor === 'graph' || activeEditor === 'stairs')) return;
      e.preventDefault();
      e.stopPropagation();

      const id = hit.getAttribute('data-id');
      selectNode(id);

      
      if (activeEditor === 'stairs') {
        if (!building || !stairsEditorSelectedConnectorId) return;
        const conn = (building.connectors || []).find(c => c.id === stairsEditorSelectedConnectorId);
        if (!conn) return;
        conn.nodesByFloor = conn.nodesByFloor || {};
        const f = (stairsPickFloorIndex !== null) ? stairsPickFloorIndex : currentFloorIndex;
        conn.nodesByFloor[String(f)] = id;
        stairsPickFloorIndex = null;
        buildGlobalGraph();
        updateEditorUI();
        updateGraphOverlay();
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (graphAction === 'delete') {
        deleteNodeFromGraph(floorIndex, id);
        const el = nodeIndex.get(`${floorIndex}:${id}`);
        if (el) el.remove();
        nodeIndex.delete(`${floorIndex}:${id}`);
        if (selectedNodeId === id) selectedNodeId = null;
        graphAction = 'select';
        rebuildAfterGraphEdit(true);
        updateEditorUI();
        return;
      }


      
      if (activeEditor === 'graph' && graphConnectDragMode) {
        edgeStartNodeId = id;
        startTempEdge(floorIndex, c.x, c.y);
        dragPointerId = e.pointerId;
        try { svg.setPointerCapture(dragPointerId); } catch {}
        drawGraphOverlayOnFloor(floorIndex);
        updateEditorUI();
        return;
      }

      
      if (graphAction === 'add-edge') {
        if (!edgeStartNodeId) {
          edgeStartNodeId = id;
          updateEditorUI();
          drawGraphOverlayOnFloor(floorIndex);
          return;
        }
        if (edgeStartNodeId && edgeStartNodeId !== id) {
          ensureUndirectedEdge(floorIndex, edgeStartNodeId, id);
          edgeStartNodeId = null;
          graphAction = 'select';
          rebuildAfterGraphEdit(true);
          updateEditorUI();
          return;
        }
      }

      
      if (e.shiftKey) {
        edgeStartNodeId = id;
        startTempEdge(floorIndex, c.x, c.y);
        dragPointerId = e.pointerId;
        try { svg.setPointerCapture(dragPointerId); } catch {}
        hit.style.cursor = 'grabbing';
        return;
      }

      
      if (graphAction === 'select') {
        draggingNodeId = id;
        dragPointerId = e.pointerId;
        try { svg.setPointerCapture(dragPointerId); } catch {}
        hit.style.cursor = 'grabbing';
      }
    });

    svg.appendChild(hit);
    svg.appendChild(dot);
    svg.appendChild(text);
  });
  if (tempEdgeLine && tempEdgeLine.dataset && tempEdgeLine.dataset.floorIndex === String(floorIndex) && !tempEdgeLine.parentNode) {
    svg.appendChild(tempEdgeLine);
  }

}

function updateGraphOverlay() {
  clearGraphOverlayAll();
  if (showGraphOverlay) drawGraphOverlayOnFloor(currentFloorIndex);

  updateRoomEditingClasses();
  updateRoomSelectionHighlight();
}

function rebuildAfterGraphEdit(rebuildGlobal = true) {
  resetNodeCenterCache();
  if (rebuildGlobal) buildGlobalGraph();
  updateGraphOverlay();
}

function selectNode(nodeId) {
  selectedNodeId = nodeId;
  updateEditorUI();
  updateGraphOverlay();
}

function hitTestNode(floorIndex, x, y, excludeId=null) {
  const floorDiv = getFloorDiv(floorIndex);
  if (!floorDiv) return null;

  let best = null;
  let bestDist = Infinity;
  qsa('.path-node', floorDiv).forEach(nodeEl => {
    const id = nodeEl.dataset.id;
    if (excludeId && id === excludeId) return;
    const c = getNodeCenter(floorIndex, id);
    if (!c) return;
    const d = Math.hypot(c.x - x, c.y - y);
    if (d < bestDist) {
      bestDist = d;
      best = id;
    }
  });

  return bestDist <= 22 ? best : null;
}

function moveNodeToPoint(floorIndex, nodeId, x, y) {
  const nodeEl = nodeIndex.get(`${floorIndex}:${nodeId}`);
  if (!nodeEl) return;

  const cs = getComputedStyle(nodeEl);
  const w = parseFloat(cs.width) || 8;
  const h = parseFloat(cs.height) || 8;

  let left = Math.max(0, x - w/2);
  let top = Math.max(0, y - h/2);
  const step = getGridStepPx();
  left = Math.max(0, snapToGrid(left, step));
  top = Math.max(0, snapToGrid(top, step));

  nodeEl.style.left = `${left}px`;
  nodeEl.style.top = `${top}px`;

  const floor = getFloorCfg(floorIndex);
  if (!floor) return;
  const n = (floor.nodes || []).find(nn => nn.id === nodeId);
  if (n) {
    n.style = n.style || {};
    n.style.left = `${left}px`;
    n.style.top = `${top}px`;
  }
}

function addNodeAtPoint(floorIndex, x, y) {
  const floor = getFloorCfg(floorIndex);
  if (!floor) return;

  const existing = new Set((floor.nodes || []).map(n => n.id));
  let i = 1;
  let id = `N${floorIndex+1}_${i}`;
  while (existing.has(id)) { i++; id = `N${floorIndex+1}_${i}`; }

  const floorDiv = getFloorDiv(floorIndex);
  const nodeDiv = document.createElement('div');
  nodeDiv.className = 'path-node';
  nodeDiv.dataset.id = id;

  const nodeSize = 8;
  let left = Math.max(0, x - nodeSize/2);
  let top = Math.max(0, y - nodeSize/2);
  const step = getGridStepPx();
  left = Math.max(0, snapToGrid(left, step));
  top = Math.max(0, snapToGrid(top, step));

  nodeDiv.style.left = `${left}px`;
  nodeDiv.style.top = `${top}px`;
  floorDiv.appendChild(nodeDiv);

  nodeIndex.set(`${floorIndex}:${id}`, nodeDiv);

  floor.nodes = floor.nodes || [];
  floor.nodes.push({ id, label: id, style: { left: `${left}px`, top: `${top}px` } });

  floor.graph = floor.graph || {};
  floor.graph[id] = floor.graph[id] || [];

  selectNode(id);
  
  if (graphAction === 'add-node') graphAction = 'select';
  edgeStartNodeId = null;
  rebuildAfterGraphEdit(true);
  updateEditorUI();
}


function updateRoomEditingClasses() {
  const floorDiv = getFloorDiv(currentFloorIndex);
  if (!floorDiv) return;
  qsa('.room', floorDiv).forEach(el => {
    if (isRoomsEditor()) {
      el.style.cursor = (roomAction === 'delete') ? 'not-allowed' : 'move';
    } else {
      el.style.cursor = '';
    }
  });
}

function updateRoomSelectionHighlight() {
  const floorDiv = getFloorDiv(currentFloorIndex);
  if (!floorDiv) return;
  qsa('.room', floorDiv).forEach(el => {
    if (selectedRoomId && el.id === selectedRoomId) {
      el.style.outline = '2px solid rgba(0,0,0,0.45)';
      el.style.outlineOffset = '2px';
    } else {
      el.style.outline = '';
      el.style.outlineOffset = '';
    }
  });
}

function selectRoom(roomId) {
  selectedRoomId = roomId;
  updateRoomSelectionHighlight();
  updateEditorUI();
}

function onRoomPointerDown(e, floorIndex, roomEl) {
  if (!isRoomsEditor()) return;

  e.preventDefault();
  e.stopPropagation();

  const roomId = roomEl.id;
  selectRoom(roomId);

  if (roomAction === 'delete') {
    deleteRoom(floorIndex, roomId);
    
    roomAction = 'select';
    syncEditorBarUI();
    updateEditorUI();
    return;
  }

  
  if (roomAction === 'select') {
    const pt = getLocalPointFromClient(e.clientX, e.clientY, floorIndex);
    const { w, h } = getFloorBaseSize(floorIndex);
    const left = parseCssToPx(roomEl.style.left, w);
    const top = parseCssToPx(roomEl.style.top, h);

    roomDragOffset.dx = pt.x - left;
    roomDragOffset.dy = pt.y - top;

    draggingRoomId = roomId;
    roomDragPointerId = e.pointerId;
    try { roomEl.setPointerCapture(roomDragPointerId); } catch {}

    roomEl.addEventListener('pointermove', onRoomPointerMove);
    roomEl.addEventListener('pointerup', onRoomPointerUp);
    roomEl.addEventListener('pointercancel', onRoomPointerUp);
  }
}

function onRoomPointerMove(e) {
  if (!draggingRoomId || roomDragPointerId !== e.pointerId) return;
  const entry = roomIndex.get(draggingRoomId);
  if (!entry) return;

  const floorIndex = entry.floorIndex;
  const roomEl = entry.element;

  const pt = getLocalPointFromClient(e.clientX, e.clientY, floorIndex);
  let left = Math.max(0, pt.x - roomDragOffset.dx);
  let top = Math.max(0, pt.y - roomDragOffset.dy);
  const step = getGridStepPx();
  left = Math.max(0, snapToGrid(left, step));
  top = Math.max(0, snapToGrid(top, step));

  roomEl.style.left = `${left}px`;
  roomEl.style.top = `${top}px`;

  
  const floor = getFloorCfg(floorIndex);
  if (floor) {
    const r = (floor.rooms || []).find(x => x.id === draggingRoomId);
    if (r) {
      r.style = r.style || {};
      r.style.left = `${left}px`;
      r.style.top = `${top}px`;
    }
  }
}

function onRoomPointerUp(e) {
  const entry = draggingRoomId ? roomIndex.get(draggingRoomId) : null;
  if (entry && entry.element) {
    entry.element.removeEventListener('pointermove', onRoomPointerMove);
    entry.element.removeEventListener('pointerup', onRoomPointerUp);
    entry.element.removeEventListener('pointercancel', onRoomPointerUp);
    try { entry.element.releasePointerCapture(e.pointerId); } catch {}
  }
  stopRoomDragState();
}

function addRoomAtPoint(floorIndex, x, y) {
  const floor = getFloorCfg(floorIndex);
  if (!floor) return;

  const existing = new Set((floor.rooms || []).map(r => r.id));
  let i = 1;
  let id = `CAB_NEW_${i}`;
  while (existing.has(id) || roomIndex.has(id)) { i++; id = `CAB_NEW_${i}`; }

  let left = Math.max(0, x - 30);
  let top = Math.max(0, y - 15);
  const step = getGridStepPx();
  left = Math.max(0, snapToGrid(left, step));
  top = Math.max(0, snapToGrid(top, step));

  const r = {
    id,
    label: id,
    info: '',
    image: '',
    classes: [],
    nodeId: '',
    style: { left: `${left}px`, top: `${top}px` }
  };

  floor.rooms = floor.rooms || [];
  floor.rooms.push(r);

  const floorDiv = getFloorDiv(floorIndex);
  const btn = createRoomButton(floorIndex, r);
  floorDiv.appendChild(btn);

  selectRoom(id);
  
  if (roomAction === 'add-room') roomAction = 'select';
  updateGraphOverlay();
  updateEditorUI();
}

function deleteRoom(floorIndex, roomId) {
  const entry = roomIndex.get(roomId);
  if (entry?.element) entry.element.remove();
  roomIndex.delete(roomId);
  deleteRoomData(floorIndex, roomId);

  if (originRoomId === roomId) originRoomId = null;
  if (routeTargetRoomId === roomId) routeTargetRoomId = null;
  if (selectedRoomId === roomId) selectedRoomId = null;

  if (roomAction === 'delete') roomAction = 'select';
  updateEditorUI();
  updateGraphOverlay();
}

function getSelectedRoomEntry() {
  if (!selectedRoomId) return null;
  return roomIndex.get(selectedRoomId) || null;
}

function applyRoomForm() {
  const entry = getSelectedRoomEntry();
  if (!entry) { alert('Сначала выберите кабинет на схеме'); return; }

  const floorIndex = entry.floorIndex;
  const floor = getFloorCfg(floorIndex);
  if (!floor) return;

  const idInput = qs('#re-room-id');
  const labelInput = qs('#re-room-label');
  const infoInput = qs('#re-room-info');
  const imgInput = qs('#re-room-image');
  const clsInput = qs('#re-room-classes');
  const nodeSel = qs('#re-room-node');

  const oldId = entry.data.id;
  const newId = (idInput.value || '').trim();

  if (!newId) { alert('ID кабинета не может быть пустым'); return; }
  if (newId !== oldId && roomIndex.has(newId)) { alert('Такой ID уже существует'); return; }

  const newRoom = {
    id: newId,
    label: (labelInput.value || '').trim() || newId,
    info: (infoInput.value || '').trim(),
    image: (imgInput.value || '').trim(),
    classes: (clsInput.value || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean),
    nodeId: (nodeSel.value || '').trim(),
    style: entry.data.style || {}
  };

  setRoomData(floorIndex, oldId, newRoom);

  const el = entry.element;

  
  if (newId !== oldId) {
    roomIndex.delete(oldId);
    el.id = newId;

    if (originRoomId === oldId) originRoomId = newId;
    if (routeTargetRoomId === oldId) routeTargetRoomId = newId;
    if (selectedRoomId === oldId) selectedRoomId = newId;
  }

  el.textContent = newRoom.label || newRoom.id;
  el.dataset.info = newRoom.info || '';
  if (newRoom.image) el.dataset.image = newRoom.image;
  else delete el.dataset.image;

  if (newRoom.nodeId) el.dataset.nodeId = newRoom.nodeId;
  else delete el.dataset.nodeId;

  el.className = ['room', ...(newRoom.classes || [])].join(' ').trim();

  roomIndex.set(newRoom.id, { floorIndex, element: el, data: newRoom });
  entry.data = newRoom;

  updateRoomSelectionHighlight();
  updateEditorUI();
}

function bindSelectedRoomToSelectedNode() {
  if (!selectedNodeId) { alert('Сначала выберите узел'); return; }
  const sel = qs('#re-room-node');
  if (sel) sel.value = selectedNodeId;
  applyRoomForm();
}


function highlightExitNodesOnFloor(floorIndex, exitNodeIds) {
  const floorDiv = getFloorDiv(floorIndex);
  if (!floorDiv) return;
  qsa('.path-node', floorDiv).forEach(node => {
    node.style.backgroundColor = (exitNodeIds || []).includes(node.dataset.id) ? 'red' : 'transparent';
  });
}

function showAllPathsButtonVisibility() {
  floors.forEach((floorDiv, idx) => {
    const btn = qs('.show-all-paths-button', floorDiv);
    if (!btn) return;
    const shouldShow = (activeMode === 'evacuate') && (idx === currentFloorIndex);
    btn.style.display = shouldShow ? 'block' : 'none';
  });
}

function drawCurrentStep() {
  if (!activeMode || routeSteps.length === 0) return;
  const step = routeSteps[routeStepIndex];
  if (!step) return;

  showingAllPaths = false;
  clearAllPaths();
  showAllPathsButtonVisibility();

  drawPathOnFloor(step.floorIndex, step.nodeIds, { color: 'limegreen', width: 4 });
  updateInfoText();
}

function showAllPathsOnCurrentFloor() {
  const floorCfg = getFloorCfg(currentFloorIndex);
  if (!floorCfg) return;

  let baseNodeId = null;
  if (activeMode && routeSteps.length && routeSteps[routeStepIndex]?.floorIndex === currentFloorIndex) {
    baseNodeId = routeSteps[routeStepIndex].nodeIds[0];
  } else if (originRoomId && roomIndex.get(originRoomId)) {
    const startRoom = roomIndex.get(originRoomId);
    baseNodeId = getClosestNodeToElement(startRoom.floorIndex, startRoom.element);
  }
  if (!baseNodeId) return;

  showingAllPaths = true;
  clearAllPaths();
  showAllPathsButtonVisibility();

  highlightExitNodesOnFloor(currentFloorIndex, floorCfg.exitNodes || []);

  (floorCfg.exitNodes || []).forEach(endNodeId => {
    const path = bfsOnFloor(currentFloorIndex, baseNodeId, endNodeId);
    if (!path) return;
    drawPathOnFloor(currentFloorIndex, path, { color: 'orange', width: 3 });
  });

  updateInfoText();
}


function openRoomPopup(roomEl) {
  currentRoomElement = roomEl;
  const info = roomEl.dataset.info || roomEl.id;
  popupText.textContent = info;

  const img = roomEl.dataset.image;
  if (img) {
    popupImage.src = img;
    popupImage.classList.remove('hidden');
  } else {
    popupImage.classList.add('hidden');
    popupImage.src = '';
  }

  popup.classList.remove('hidden');
  popup.classList.add('show');
}

function closePopup() {
  popup.classList.remove('show');
  popup.classList.add('hidden');
}
window.closePopup = closePopup;

function highlightRoom(roomId) {
  if (previouslyHighlightedRoom) previouslyHighlightedRoom.classList.remove('highlighted-room');
  const entry = roomIndex.get(roomId);
  if (!entry) return;
  entry.element.classList.add('highlighted-room');
  previouslyHighlightedRoom = entry.element;
}

function clearHighlightedRoom() {
  if (previouslyHighlightedRoom) {
    previouslyHighlightedRoom.classList.remove('highlighted-room');
    previouslyHighlightedRoom = null;
  }
}

function setCurrentLocation(roomId) {
  originRoomId = roomId;
  highlightRoom(roomId);

  const entry = roomIndex.get(roomId);
  if (entry) showFloor(entry.floorIndex + 1);

  setUrlParams({ roomId, toRoomId: null, evacuate: null });
}


function getUrlParams() {
  const p = new URLSearchParams(window.location.search);
  return {
    roomId: p.get('roomId'),
    toRoomId: p.get('to'),
    evacuate: p.get('evacuate') === 'true'
  };
}

function setUrlParams({ roomId, toRoomId, evacuate }) {
  const p = new URLSearchParams(window.location.search);

  if (roomId) p.set('roomId', roomId);
  else p.delete('roomId');

  if (toRoomId) p.set('to', toRoomId);
  else p.delete('to');

  if (evacuate === true) p.set('evacuate', 'true');
  else p.delete('evacuate');

  const newUrl = `${window.location.pathname}?${p.toString()}`;
  window.history.replaceState({}, '', newUrl.endsWith('?') ? window.location.pathname : newUrl);
}


function startRouteToRoom(targetRoomId) {
  if (!originRoomId) { alert('Сначала выберите "Я здесь" в кабинете.'); return; }
  const start = roomIndex.get(originRoomId);
  const target = roomIndex.get(targetRoomId);
  if (!start || !target) return;

  const startNodeId = getClosestNodeToElement(start.floorIndex, start.element);
  const endNodeId = getClosestNodeToElement(target.floorIndex, target.element);
  if (!startNodeId || !endNodeId) return;

  const startKey = `${start.floorIndex}:${startNodeId}`;
  const endKey = `${target.floorIndex}:${endNodeId}`;
  const path = dijkstraPath(startKey, new Set([endKey]));
  if (!path) { alert('Маршрут не найден.'); return; }

  activeMode = 'room-to-room';
  routeTargetRoomId = targetRoomId;
  routeTargetExitRoomId = null;

  routeSteps = splitGlobalPathIntoSteps(path);
  routeStepIndex = 0;

  disableFloorSwitching(true);
  closePopup();
  hideSearch();

  setUrlParams({ roomId: originRoomId, toRoomId: targetRoomId, evacuate: null });

  showFloor(routeSteps[0].floorIndex + 1);
}

function startEvacuation() {
  if (!originRoomId) { alert('Сначала выберите "Я здесь" в кабинете.'); return; }
  const start = roomIndex.get(originRoomId);
  if (!start) return;

  const exitRoomIds = new Set(building.evacuation?.finalExitRoomIds || []);
  const goalKeyToRoomId = new Map();
  const goalKeys = new Set();

  exitRoomIds.forEach(roomId => {
    const entry = roomIndex.get(roomId);
    if (!entry) return;
    const nodeId = getClosestNodeToElement(entry.floorIndex, entry.element);
    if (!nodeId) return;
    const key = `${entry.floorIndex}:${nodeId}`;
    goalKeys.add(key);
    if (!goalKeyToRoomId.has(key)) goalKeyToRoomId.set(key, roomId);
  });

  const startNodeId = getClosestNodeToElement(start.floorIndex, start.element);
  if (!startNodeId || goalKeys.size === 0) return;

  const startKey = `${start.floorIndex}:${startNodeId}`;
  const path = dijkstraPath(startKey, goalKeys);
  if (!path) { alert('Маршрут эвакуации не найден.'); return; }

  const lastKey = path[path.length - 1];
  const chosenExitRoomId = goalKeyToRoomId.get(lastKey) || null;

  activeMode = 'evacuate';
  routeTargetExitRoomId = chosenExitRoomId;
  routeTargetRoomId = null;

  routeSteps = splitGlobalPathIntoSteps(path);
  routeStepIndex = 0;

  disableFloorSwitching(true);
  closePopup();
  hideSearch();

  setUrlParams({ roomId: originRoomId, toRoomId: null, evacuate: true });
  showFloor(routeSteps[0].floorIndex + 1);
}

function nextStep() {
  if (!activeMode || routeSteps.length === 0) return;
  showingAllPaths = false;

  if (routeStepIndex < routeSteps.length - 1) {
    routeStepIndex += 1;
    const step = routeSteps[routeStepIndex];
    showFloor(step.floorIndex + 1);
  } else updateInfoText();
}

function finishRoute() {
  if (!activeMode) return;
  const mode = activeMode;

  activeMode = null;
  routeSteps = [];
  routeStepIndex = 0;
  showingAllPaths = false;

  disableFloorSwitching(false);
  clearAllPaths();
  showAllPathsButtonVisibility();
  infoPopupGlobal.classList.add('hidden');

  if (mode === 'room-to-room' && routeTargetRoomId) {
    setCurrentLocation(routeTargetRoomId);
    routeTargetRoomId = null;
    routeTargetExitRoomId = null;
    return;
  }

  routeTargetRoomId = null;
  routeTargetExitRoomId = null;

  originRoomId = null;
  clearHighlightedRoom();
  setUrlParams({ roomId: null, toRoomId: null, evacuate: null });
}


function formatStepHint() {
  if (!activeMode || routeSteps.length === 0) return '';
  const step = routeSteps[routeStepIndex];
  const floorLabel = building.floors.find(f => f.index === step.floorIndex)?.label || `Этаж ${step.floorIndex+1}`;
  const isLast = routeStepIndex === routeSteps.length - 1;

  if (activeMode === 'room-to-room') {
    const target = roomIndex.get(routeTargetRoomId);
    const targetName = target?.data?.info || target?.element?.dataset?.info || routeTargetRoomId;
    if (isLast) return `${floorLabel}. Следуйте по маршруту до: ${targetName}.`;

    const nextFloor = routeSteps[routeStepIndex + 1].floorIndex;
    const verb = nextFloor > step.floorIndex ? 'поднимитесь' : 'спуститесь';
    const nextLabel = building.floors.find(f => f.index === nextFloor)?.label || `Этаж ${nextFloor+1}`;
    return `${floorLabel}. Дойдите до лестницы, затем ${verb} на ${nextLabel}.`;
  }

  if (activeMode === 'evacuate') {
    const exit = roomIndex.get(routeTargetExitRoomId);
    const exitName = exit?.data?.info || exit?.element?.dataset?.info || routeTargetExitRoomId || 'выход';
    if (isLast) return `${floorLabel}. Следуйте по маршруту до выхода: ${exitName}.`;

    const nextFloor = routeSteps[routeStepIndex + 1].floorIndex;
    const verb = nextFloor > step.floorIndex ? 'поднимитесь' : 'спуститесь';
    const nextLabel = building.floors.find(f => f.index === nextFloor)?.label || `Этаж ${nextFloor+1}`;
    return `${floorLabel}. Дойдите до лестницы, затем ${verb} на ${nextLabel}.`;
  }
  return '';
}

function updateInfoText() {
  if (!activeMode) { infoPopupGlobal.classList.add('hidden'); return; }
  infoText.textContent = showingAllPaths
    ? `${building.floors.find(f=>f.index===currentFloorIndex)?.label || ('Этаж '+(currentFloorIndex+1))}. Показаны все пути к выходам на этом этаже.`
    : formatStepHint();

  infoPopupGlobal.classList.remove('hidden');
  const hasNext = routeSteps.length > 0 && routeStepIndex < routeSteps.length - 1;
  routeNextBtn.style.display = hasNext ? 'inline-block' : 'none';
  routeFinishBtn.style.display = 'inline-block';
}


function hideSearch() {
  searchContainer.classList.add('hidden');
  searchInput.value = '';
  searchResults.innerHTML = '';
}

function toggleSearch() {
  if (searchContainer.classList.contains('hidden')) {
    searchContainer.classList.remove('hidden');
    searchInput.focus();
    updateSearchResults();
  } else hideSearch();
}

function updateSearchResults() {
  const query = (searchInput.value || '').trim().toLowerCase();
  searchResults.innerHTML = '';

  const evacLi = document.createElement('li');
  evacLi.textContent = 'Эвакуация';
  evacLi.addEventListener('click', () => { hideSearch(); startEvacuation(); });
  searchResults.appendChild(evacLi);

  building.floors.forEach(floor => {
    (floor.rooms || []).forEach(r => {
      const hay = `${r.id} ${r.info || ''} ${r.label || ''}`.toLowerCase();
      if (!query || hay.includes(query)) {
        const li = document.createElement('li');
        const fl = floor.label || `Этаж ${floor.index+1}`;
        li.textContent = `${r.id} — ${r.info || r.label || ''} (${fl})`.trim();
        li.addEventListener('click', () => { hideSearch(); startRouteToRoom(r.id); });
        searchResults.appendChild(li);
      }
    });
  });
}


function showFloor(floorNumber) {
  const idx = floorNumber - 1;
  if (idx < 0 || idx >= floors.length) return;

  if (idx !== currentFloorIndex) closePopup();
  currentFloorIndex = idx;

  
  if (selectedRoomId) {
    const re = roomIndex.get(selectedRoomId);
    if (!re || re.floorIndex !== currentFloorIndex) selectedRoomId = null;
  }

  floors.forEach((floorDiv, i) => {
    if (i === idx) {
      floorDiv.classList.remove('hidden');
      setTimeout(() => floorDiv.classList.add('show'), 50);
    } else {
      floorDiv.classList.remove('show');
      floorDiv.classList.add('hidden');
    }
  });

  updateFloorButtonsActive();
  showAllPathsButtonVisibility();
  updateGraphOverlay();
  updateEditorUI();

  if (activeMode && routeSteps.length) {
    const step = routeSteps[routeStepIndex];
    if (step && step.floorIndex === currentFloorIndex) drawCurrentStep();
    else updateInfoText();
  }
}
window.showFloor = showFloor;


function applyTransform() {
  floors.forEach(f => {
    f.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
  });
}

function isEditingNow() {
  return showGraphOverlay && activeEditor !== null;
}

container.addEventListener('wheel', (e) => {
  if (!floors.length) return;
  if (!searchContainer.classList.contains('hidden') && searchContainer.contains(e.target)) return;
  if (isEditingNow()) return;
  e.preventDefault();
  const delta = e.deltaY > 0 ? -0.1 : 0.1;
  scale = Math.min(3, Math.max(0.5, scale + delta));
  applyTransform();
}, { passive: false });

container.addEventListener('mousedown', (e) => {
  if (!floors.length) return;
  if (searchContainer.contains(e.target) || popup.contains(e.target) || infoPopupGlobal.contains(e.target)) return;
  if (isEditingNow()) return;

  isDragging = true;
  startX = e.clientX;
  startY = e.clientY;
  initialX = posX;
  initialY = posY;
});

container.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  posX = initialX + (e.clientX - startX);
  posY = initialY + (e.clientY - startY);
  applyTransform();
});

container.addEventListener('mouseup', () => { isDragging = false; });
container.addEventListener('mouseleave', () => { isDragging = false; });

container.addEventListener('touchstart', (e) => {
  if (!floors.length) return;
  if (isEditingNow()) return;

  if (e.touches.length === 1) {
    isDragging = true;
    lastTouchX = e.touches[0].clientX;
    lastTouchY = e.touches[0].clientY;
  } else if (e.touches.length === 2) {
    isDragging = false;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    startDistance = Math.hypot(dx, dy);
  }
}, { passive: false });

container.addEventListener('touchmove', (e) => {
  if (!floors.length) return;
  if (searchContainer.contains(e.target) || popup.contains(e.target) || infoPopupGlobal.contains(e.target)) return;
  if (isEditingNow()) return;

  if (e.touches.length === 1 && isDragging) {
    const dx = e.touches[0].clientX - lastTouchX;
    const dy = e.touches[0].clientY - lastTouchY;
    posX += dx;
    posY += dy;
    lastTouchX = e.touches[0].clientX;
    lastTouchY = e.touches[0].clientY;
    applyTransform();
  } else if (e.touches.length === 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const dist = Math.hypot(dx, dy);
    const diff = dist - startDistance;
    scale = Math.min(3, Math.max(0.5, scale + diff / 300));
    startDistance = dist;
    applyTransform();
  }
  e.preventDefault();
}, { passive: false });

container.addEventListener('touchend', () => { isDragging = false; });

if (searchResults) {
  searchResults.addEventListener('wheel', e => e.stopPropagation(), { passive: false });
  searchResults.addEventListener('touchmove', e => e.stopPropagation(), { passive: false });
}


function setActiveEditor(next) {
  if (next === activeEditor) next = null;

  
  if (next && !showGraphOverlay) showGraphOverlay = true;

  
  stopGraphDragState();
  stopRoomDragState();
  stairsPickFloorIndex = null;

  
  if (activeEditor === 'graph' && next !== 'graph') selectedNodeId = null;
  if (activeEditor === 'rooms' && next !== 'rooms') selectedRoomId = null;

  activeEditor = next;
  editMode = (activeEditor !== null);

  
  graphAction = 'select';
  edgeStartNodeId = null;
  draggingEdge = null;

  roomAction = 'select';
  roomEditEnabled = (activeEditor === 'rooms');

  syncEditorBarUI();
  updateGraphOverlay();
  updateEditorUI();
}

function ensureEditorBarUI() {
  if (document.getElementById('editor-bar')) return;

  const bar = document.createElement('div');
  bar.id = 'editor-bar';
  bar.style.position = 'fixed';
  bar.style.left = '50%';
  bar.style.bottom = '12px';
  bar.style.transform = 'translateX(-50%)';
  bar.style.zIndex = '2600';
  bar.style.display = 'flex';
  bar.style.alignItems = 'center';
  bar.style.gap = '12px';
  bar.style.padding = '8px 10px';
  bar.style.borderRadius = '12px';
  bar.style.background = 'rgba(255,255,255,0.86)';
  bar.style.backdropFilter = 'blur(4px)';
  bar.style.boxShadow = '0 8px 20px rgba(0,0,0,0.12)';
  bar.style.userSelect = 'none';
  bar.style.maxWidth = '96vw';
  bar.style.flexWrap = 'wrap';

  function makeCheckbox(id, labelText) {
    const lbl = document.createElement('label');
    lbl.style.display = 'inline-flex';
    lbl.style.alignItems = 'center';
    lbl.style.gap = '6px';
    lbl.style.fontSize = '14px';
    lbl.style.whiteSpace = 'nowrap';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = id;

    const sp = document.createElement('span');
    sp.textContent = labelText;

    lbl.appendChild(cb);
    lbl.appendChild(sp);
    return { lbl, cb };
  }

  const show = makeCheckbox('cb-show-graph', 'Показать граф');
  show.cb.checked = showGraphOverlay;
  show.cb.addEventListener('change', () => {
    showGraphOverlay = show.cb.checked;
    if (!showGraphOverlay) setActiveEditor(null);
    syncEditorBarUI();
    updateGraphOverlay();
    updateEditorUI();
  });

  const edGraph = makeCheckbox('cb-ed-graph', 'редактор графа');
  const edRooms = makeCheckbox('cb-ed-rooms', 'редактор кабинетов');
  const edFloor = makeCheckbox('cb-ed-floor', 'редактор этажа');
  const edStairs = makeCheckbox('cb-ed-stairs', 'редактор связи лестниц');

  function attachEditorHandler(type, cb) {
    cb.addEventListener('change', () => {
      if (cb.checked) setActiveEditor(type);
      else setActiveEditor(null);
    });
  }
  attachEditorHandler('graph', edGraph.cb);
  attachEditorHandler('rooms', edRooms.cb);
  attachEditorHandler('floor', edFloor.cb);
  attachEditorHandler('stairs', edStairs.cb);

  const exportBtn = document.createElement('button');
  exportBtn.id = 'btn-export-json';
  exportBtn.textContent = 'Экспорт JSON';
  exportBtn.style.marginLeft = '6px';
  exportBtn.addEventListener('click', () => exportBuildingJson());

  bar.appendChild(show.lbl);
  bar.appendChild(edGraph.lbl);
  bar.appendChild(edRooms.lbl);
  bar.appendChild(edFloor.lbl);
  bar.appendChild(edStairs.lbl);
  bar.appendChild(exportBtn);

  container.appendChild(bar);
  syncEditorBarUI();
}

function syncEditorBarUI() {
  const cbShow = document.getElementById('cb-show-graph');
  const cbG = document.getElementById('cb-ed-graph');
  const cbR = document.getElementById('cb-ed-rooms');
  const cbF = document.getElementById('cb-ed-floor');
  const cbS = document.getElementById('cb-ed-stairs');

  if (cbShow) cbShow.checked = !!showGraphOverlay;

  const enabled = !!showGraphOverlay;
  [cbG, cbR, cbF, cbS].forEach(cb => {
    if (!cb) return;
    cb.disabled = !enabled;
    cb.style.opacity = enabled ? '1' : '0.5';
  });

  if (cbG) cbG.checked = (activeEditor === 'graph');
  if (cbR) cbR.checked = (activeEditor === 'rooms');
  if (cbF) cbF.checked = (activeEditor === 'floor');
  if (cbS) cbS.checked = (activeEditor === 'stairs');
}

function ensureEditorPanelUI() {
  if (document.getElementById('editor-panel')) return;

  const panel = document.createElement('div');
  panel.id = 'editor-panel';
  panel.style.position = 'fixed';
  panel.style.left = '50%';
  panel.style.top = '80px';
  panel.style.transform = 'translateX(-50%)';
  panel.style.zIndex = '2600';
  panel.style.display = 'none';
  panel.style.width = '440px';
  panel.style.maxWidth = '94vw';
  panel.style.maxHeight = '72vh';
  panel.style.overflow = 'hidden';
  panel.style.borderRadius = '14px';
  panel.style.background = 'rgba(255,255,255,0.92)';
  panel.style.backdropFilter = 'blur(4px)';
  panel.style.boxShadow = '0 10px 28px rgba(0,0,0,0.14)';
  panel.style.fontSize = '13px';

  const header = document.createElement('div');
  header.id = 'editor-panel-header';
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.justifyContent = 'space-between';
  header.style.gap = '10px';
  header.style.padding = '10px 12px';
  header.style.borderBottom = '1px solid rgba(0,0,0,0.08)';
  header.style.cursor = 'move';
  header.style.userSelect = 'none';

  const title = document.createElement('div');
  title.id = 'editor-panel-title';
  title.style.fontWeight = '600';
  title.textContent = 'Редактор';
  header.appendChild(title);

  const body = document.createElement('div');
  body.id = 'editor-panel-body';
  body.style.padding = '10px 12px';
  body.style.overflow = 'auto';
  body.style.maxHeight = 'calc(72vh - 44px)';

  
  header.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const rect = panel.getBoundingClientRect();

    
    panel.style.transform = 'none';
    panel.style.left = `${rect.left}px`;
    panel.style.top = `${rect.top}px`;

    editorPanelDrag.active = true;
    editorPanelDrag.pointerId = e.pointerId;
    editorPanelDrag.offsetX = e.clientX - rect.left;
    editorPanelDrag.offsetY = e.clientY - rect.top;
    try { header.setPointerCapture(e.pointerId); } catch {}
    e.preventDefault();
  });

  header.addEventListener('pointermove', (e) => {
    if (!editorPanelDrag.active || editorPanelDrag.pointerId !== e.pointerId) return;
    const x = Math.max(8, Math.min(window.innerWidth - 20, e.clientX - editorPanelDrag.offsetX));
    const y = Math.max(8, Math.min(window.innerHeight - 60, e.clientY - editorPanelDrag.offsetY));
    panel.style.left = `${x}px`;
    panel.style.top = `${y}px`;
    e.preventDefault();
  });

  function endDrag(e) {
    if (editorPanelDrag.pointerId !== e.pointerId) return;
    editorPanelDrag.active = false;
    editorPanelDrag.pointerId = null;
    try { header.releasePointerCapture(e.pointerId); } catch {}
  }
  header.addEventListener('pointerup', endDrag);
  header.addEventListener('pointercancel', endDrag);
  header.addEventListener('lostpointercapture', endDrag);

  panel.appendChild(header);
  panel.appendChild(body);
  container.appendChild(panel);
}

function setPanelTitle(txt) {
  const t = document.getElementById('editor-panel-title');
  if (t) t.textContent = txt;
}

function clearPanelBody() {
  const body = document.getElementById('editor-panel-body');
  if (body) body.innerHTML = '';
  return body;
}

function makeRow() {
  const row = document.createElement('div');
  row.style.display = 'flex';
  row.style.gap = '8px';
  row.style.flexWrap = 'wrap';
  row.style.alignItems = 'center';
  return row;
}

function makeGrid() {
  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = '110px 1fr';
  grid.style.gap = '6px 10px';
  grid.style.alignItems = 'center';
  return grid;
}

function makeLabel(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d;
}

function makeInput(type='text') {
  const i = document.createElement('input');
  i.type = type;
  i.style.width = '100%';
  return i;
}

function makeSelect() {
  const s = document.createElement('select');
  s.style.width = '100%';
  return s;
}

function rebuildRoomNodeSelect(selectEl, floorIndex) {
  selectEl.innerHTML = '';
  const optEmpty = document.createElement('option');
  optEmpty.value = '';
  optEmpty.textContent = '— (авто: ближайший узел)';
  selectEl.appendChild(optEmpty);

  const floorDiv = getFloorDiv(floorIndex);
  if (!floorDiv) return;
  const ids = qsa('.path-node', floorDiv).map(n => n.dataset.id).sort();
  ids.forEach(id => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = `${id} (${getNodeLabel(floorIndex, id)})`;
    selectEl.appendChild(opt);
  });
}

function renderGraphEditor(body) {
  setPanelTitle('Редактор графа');

  const row = makeRow();

  const btnNode = document.createElement('button');
  btnNode.textContent = 'Добавить узел (1x)';
  btnNode.addEventListener('click', () => { graphAction = 'add-node'; edgeStartNodeId = null; updateEditorUI(); });

  const btnEdge = document.createElement('button');
  btnEdge.textContent = 'Соединить (1x)';
  btnEdge.addEventListener('click', () => { graphAction = 'add-edge'; edgeStartNodeId = null; updateEditorUI(); });

  const btnDel = document.createElement('button');
  btnDel.textContent = 'Удалить (1x)';
  btnDel.addEventListener('click', () => { graphAction = 'delete'; edgeStartNodeId = null; updateEditorUI(); });

  row.appendChild(btnNode);
  row.appendChild(btnEdge);
  row.appendChild(btnDel);
  body.appendChild(row);

  
  const connRow = makeRow();
  const connCb = makeCheckbox('cb-graph-connect', 'Режим соединения узлов');
  connCb.cb.checked = graphConnectDragMode;
  connCb.cb.addEventListener('change', () => {
    graphConnectDragMode = connCb.cb.checked;
    
    graphAction = 'select';
    edgeStartNodeId = null;
    stopTempEdge();
    stopGraphDragState();
    updateEditorUI();
    updateGraphOverlay();
  });
  connRow.appendChild(connCb.lbl);
  body.appendChild(connRow);

  const grid = makeGrid();
  const nodeIdV = document.createElement('div');
  nodeIdV.textContent = selectedNodeId || '—';

  const labelIn = makeInput('text');
  labelIn.value = selectedNodeId ? getNodeLabel(currentFloorIndex, selectedNodeId) : '';
  labelIn.placeholder = 'Название узла (label)';
  labelIn.addEventListener('input', () => {
    if (!selectedNodeId) return;
    setNodeLabel(currentFloorIndex, selectedNodeId, labelIn.value || selectedNodeId);
    updateGraphOverlay();
  });

  grid.appendChild(makeLabel('Узел:'));
  grid.appendChild(nodeIdV);
  grid.appendChild(makeLabel('Название:'));
  grid.appendChild(labelIn);
  body.appendChild(grid);

  const hint = document.createElement('div');
  hint.style.opacity = '0.75';
  hint.style.marginTop = '8px';
  if (graphAction === 'add-node') hint.textContent = 'Кликните по схеме, чтобы добавить узел. Режим выключится автоматически.';
  else if (graphAction === 'add-edge') hint.textContent = edgeStartNodeId ? `Кликните по второму узлу (первый: ${edgeStartNodeId}). Режим выключится автоматически.` : 'Кликните по двум узлам, чтобы соединить. Режим выключится автоматически.';
  else if (graphAction === 'delete') hint.textContent = 'Клик по узлу — удалить узел. Клик по ребру — удалить ребро. Режим выключится автоматически. Alt+клик по ребру — удалить всегда.';
  else if (graphConnectDragMode) hint.textContent = 'Режим соединения узлов: потяните от узла к другому узлу (пока тянете — пунктир). Отпустите над узлом, чтобы создать ребро.';
  else hint.textContent = 'Перетащите узел, чтобы переместить. Рёбра: перетащите ребро, чтобы сдвинуть его в пространстве. Alt+клик по ребру — удалить.';
  body.appendChild(hint);
}

function renderRoomsEditor(body) {
  setPanelTitle('Редактор кабинетов');

  const row = makeRow();

  const btnAdd = document.createElement('button');
  btnAdd.textContent = 'Добавить кабинет (1x)';
  btnAdd.addEventListener('click', () => { roomAction = 'add-room'; updateEditorUI(); });

  const btnDel = document.createElement('button');
  btnDel.textContent = 'Удалить кабинет (1x)';
  btnDel.addEventListener('click', () => { roomAction = 'delete'; updateEditorUI(); });

  row.appendChild(btnAdd);
  row.appendChild(btnDel);
  body.appendChild(row);

  const entry = selectedRoomId ? (roomIndex.get(selectedRoomId) || null) : null;

  const grid = makeGrid();
  const idIn = makeInput('text'); idIn.id = 're-room-id';
  const labelIn = makeInput('text'); labelIn.id = 're-room-label';
  const infoIn = makeInput('text'); infoIn.id = 're-room-info';
  const imgIn = makeInput('text'); imgIn.id = 're-room-image';
  const clsIn = makeInput('text'); clsIn.id = 're-room-classes';
  const nodeSel = makeSelect(); nodeSel.id = 're-room-node';

  rebuildRoomNodeSelect(nodeSel, currentFloorIndex);

  if (entry) {
    idIn.value = entry.data.id || '';
    labelIn.value = entry.data.label || '';
    infoIn.value = entry.data.info || '';
    imgIn.value = entry.data.image || '';
    clsIn.value = (entry.data.classes || []).join(', ');
    nodeSel.value = entry.data.nodeId || '';
  }

  grid.appendChild(makeLabel('ID:')); grid.appendChild(idIn);
  grid.appendChild(makeLabel('Label:')); grid.appendChild(labelIn);
  grid.appendChild(makeLabel('Info:')); grid.appendChild(infoIn);
  grid.appendChild(makeLabel('Image:')); grid.appendChild(imgIn);
  grid.appendChild(makeLabel('Classes:')); grid.appendChild(clsIn);
  grid.appendChild(makeLabel('Node:')); grid.appendChild(nodeSel);

  body.appendChild(grid);

  const btnRow = makeRow();
  const btnSave = document.createElement('button');
  btnSave.textContent = 'Сохранить кабинет';
  btnSave.addEventListener('click', () => applyRoomForm());

  const btnBind = document.createElement('button');
  btnBind.textContent = 'Привязать к ближайшему узлу';
  btnBind.addEventListener('click', () => {
    const ent = selectedRoomId ? roomIndex.get(selectedRoomId) : null;
    if (!ent) return;
    const nid = getClosestNodeToElement(ent.floorIndex, ent.element);
    const sel = document.getElementById('re-room-node');
    if (sel) sel.value = nid || '';
    applyRoomForm();
  });

  btnRow.appendChild(btnSave);
  btnRow.appendChild(btnBind);
  body.appendChild(btnRow);

  const hint = document.createElement('div');
  hint.style.opacity = '0.75';
  hint.style.marginTop = '8px';
  if (roomAction === 'add-room') hint.textContent = 'Кликните по схеме, чтобы добавить кабинет. Режим выключится автоматически.';
  else if (roomAction === 'delete') hint.textContent = 'Клик по кабинету удалит его. Режим выключится автоматически.';
  else hint.textContent = 'Кликните по кабинету, чтобы редактировать поля. Перетащите кабинет, чтобы переместить.';
  body.appendChild(hint);
}


function shiftConnectorKeysOnInsert(insertAtIndex) {
  (building.connectors || []).forEach(conn => {
    const nb = conn.nodesByFloor || {};
    const out = {};
    Object.keys(nb).forEach(k => {
      const fi = parseInt(k, 10);
      if (!Number.isFinite(fi)) return;
      const newKey = (fi >= insertAtIndex) ? String(fi + 1) : String(fi);
      out[newKey] = nb[k];
    });
    conn.nodesByFloor = out;
  });
}

function shiftConnectorKeysOnDelete(deleteIndex) {
  (building.connectors || []).forEach(conn => {
    const nb = conn.nodesByFloor || {};
    const out = {};
    Object.keys(nb).forEach(k => {
      const fi = parseInt(k, 10);
      if (!Number.isFinite(fi)) return;
      if (fi === deleteIndex) return; 
      const newKey = (fi > deleteIndex) ? String(fi - 1) : String(fi);
      out[newKey] = nb[k];
    });
    conn.nodesByFloor = out;
  });
}

function normalizeFloorsIndices() {
  building.floors = (building.floors || []).slice().sort((a,b)=>a.index-b.index);
  building.floors.forEach((f, i) => { f.index = i; });
}

function createUniqueFloorId(base) {
  const ids = new Set((building.floors || []).map(f => f.id));
  let id = base;
  let i = 2;
  while (ids.has(id)) { id = `${base}_${i}`; i++; }
  return id;
}

function addNewFloorAfterCurrent() {
  if (!building) return;
  normalizeFloorsIndices();

  const insertAt = Math.min((building.floors || []).length, currentFloorIndex + 1);

  const baseId = createUniqueFloorId(`FLOOR_${insertAt+1}`);
  const newFloor = {
    index: insertAt,
    id: baseId,
    label: `Этаж ${insertAt+1}`,
    backgroundImage: '',
    rooms: [],
    nodes: [],
    graph: {},
    exitNodes: []
  };

  const arr = (building.floors || []).slice().sort((a,b)=>a.index-b.index);
  arr.splice(insertAt, 0, newFloor);
  building.floors = arr;

  shiftConnectorKeysOnInsert(insertAt);
  normalizeFloorsIndices();

  
  finishRoute();
  renderBuilding();
  resetNodeCenterCache();
  buildGlobalGraph();
  updateGraphOverlay();
  updateEditorUI();
  showFloor(Math.min(insertAt, floors.length-1) + 1);
  applyTransform();
}

function deleteCurrentFloor() {
  if (!building) return;
  normalizeFloorsIndices();
  if ((building.floors || []).length <= 1) {
    alert('Нельзя удалить последний этаж.');
    return;
  }

  const del = currentFloorIndex;
  if (!confirm(`Удалить этаж ${del+1}?`)) return;

  building.floors = (building.floors || []).filter(f => f.index !== del);

  shiftConnectorKeysOnDelete(del);
  normalizeFloorsIndices();

  finishRoute();
  renderBuilding();
  resetNodeCenterCache();
  buildGlobalGraph();
  updateGraphOverlay();
  updateEditorUI();

  const nextIdx = Math.max(0, Math.min(del - 1, floors.length - 1));
  showFloor(nextIdx + 1);
  applyTransform();
}

function renderFloorEditor(body) {
  setPanelTitle('Редактор этажа');

  const floorCfg = getFloorCfg(currentFloorIndex);
  const grid = makeGrid();

  const labelIn = makeInput('text');
  labelIn.value = floorCfg?.label || '';

  const bgIn = makeInput('text');
  bgIn.value = floorCfg?.backgroundImage || '';
  bgIn.placeholder = 'URL картинки фона';

  grid.appendChild(makeLabel('Label:'));
  grid.appendChild(labelIn);
  grid.appendChild(makeLabel('Background:'));
  grid.appendChild(bgIn);

  body.appendChild(grid);

  const btnRow = makeRow();
  const btnApply = document.createElement('button');
  btnApply.textContent = 'Применить к текущему этажу';
  btnApply.addEventListener('click', () => {
    const f = getFloorCfg(currentFloorIndex);
    if (!f) return;
    f.label = (labelIn.value || '').trim();
    f.backgroundImage = (bgIn.value || '').trim();

    const btns = qsa('.floor', floorButtonsContainer);
    if (btns[currentFloorIndex]) btns[currentFloorIndex].textContent = f.label || `Этаж ${currentFloorIndex+1}`;
    const floorDiv = getFloorDiv(currentFloorIndex);
    if (floorDiv) floorDiv.style.backgroundImage = `url('${f.backgroundImage}')`;

    updateEditorUI();
  });

  btnRow.appendChild(btnApply);

  const btnAddFloor = document.createElement('button');
  btnAddFloor.textContent = 'Добавить этаж';
  btnAddFloor.addEventListener('click', () => addNewFloorAfterCurrent());

  const btnDelFloor = document.createElement('button');
  btnDelFloor.textContent = 'Удалить этаж';
  btnDelFloor.addEventListener('click', () => deleteCurrentFloor());

  btnRow.appendChild(btnAddFloor);
  btnRow.appendChild(btnDelFloor);
  body.appendChild(btnRow);

  const hint = document.createElement('div');
  hint.style.opacity = '0.75';
  hint.style.marginTop = '8px';
  hint.textContent = 'Здесь можно менять подпись этажа и фон (backgroundImage).';
  body.appendChild(hint);
}

function renderStairsEditor(body) {
  setPanelTitle('Редактор связи лестниц');

  building.connectors = building.connectors || [];

  const rowTop = makeRow();

  const sel = makeSelect();
  sel.style.minWidth = '220px';

  function refreshConnectorSelect() {
    sel.innerHTML = '';
    const opt0 = document.createElement('option');
    opt0.value = '';
    opt0.textContent = '— выберите связь —';
    sel.appendChild(opt0);

    (building.connectors || []).forEach(c => {
      const o = document.createElement('option');
      o.value = c.id;
      o.textContent = c.label ? `${c.id} — ${c.label}` : c.id;
      sel.appendChild(o);
    });

    if (stairsEditorSelectedConnectorId) sel.value = stairsEditorSelectedConnectorId;
  }

  const btnAdd = document.createElement('button');
  btnAdd.textContent = 'Добавить лестницу';
  btnAdd.addEventListener('click', () => {
    const existing = new Set((building.connectors || []).map(c => c.id));
    let i = 1;
    let id = `STAIR_${i}`;
    while (existing.has(id)) { i++; id = `STAIR_${i}`; }
    building.connectors.push({ id, label: '', nodesByFloor: {} });
    stairsEditorSelectedConnectorId = id;
    buildGlobalGraph();
    updateEditorUI();
  });

  const btnDel = document.createElement('button');
  btnDel.textContent = 'Удалить лестницу';
  btnDel.addEventListener('click', () => {
    if (!stairsEditorSelectedConnectorId) return;
    building.connectors = (building.connectors || []).filter(c => c.id !== stairsEditorSelectedConnectorId);
    stairsEditorSelectedConnectorId = null;
    stairsPickFloorIndex = null;
    buildGlobalGraph();
    updateEditorUI();
  });

  rowTop.appendChild(sel);
  rowTop.appendChild(btnAdd);
  rowTop.appendChild(btnDel);
  body.appendChild(rowTop);

  refreshConnectorSelect();

  sel.addEventListener('change', () => {
    stairsEditorSelectedConnectorId = sel.value || null;
    stairsPickFloorIndex = null;
    updateEditorUI();
  });

  const conn = stairsEditorSelectedConnectorId
    ? (building.connectors || []).find(c => c.id === stairsEditorSelectedConnectorId)
    : null;

  if (!conn) {
    const hint = document.createElement('div');
    hint.style.opacity = '0.75';
    hint.style.marginTop = '10px';
    hint.textContent = 'Выберите связь (лестницу) или создайте новую.';
    body.appendChild(hint);
    return;
  }

  conn.nodesByFloor = conn.nodesByFloor || {};

  const grid = makeGrid();
  const idIn = makeInput('text');
  idIn.value = conn.id;

  const labelIn = makeInput('text');
  labelIn.value = conn.label || '';

  grid.appendChild(makeLabel('ID:'));
  grid.appendChild(idIn);
  grid.appendChild(makeLabel('Label:'));
  grid.appendChild(labelIn);
  body.appendChild(grid);

  const mapTitle = document.createElement('div');
  mapTitle.style.fontWeight = '600';
  mapTitle.style.marginTop = '10px';
  mapTitle.textContent = 'Связанные узлы по этажам:';
  body.appendChild(mapTitle);

  const mapWrap = document.createElement('div');
  mapWrap.style.display = 'grid';
  mapWrap.style.gridTemplateColumns = '110px 1fr';
  mapWrap.style.gap = '6px 10px';
  mapWrap.style.alignItems = 'center';
  mapWrap.style.marginTop = '6px';

  building.floors
    .slice()
    .sort((a,b) => a.index - b.index)
    .forEach(f => {
      const l = document.createElement('div');
      l.textContent = f.label || `Этаж ${f.index+1}`;
      const s = makeSelect();

      const optEmpty = document.createElement('option');
      optEmpty.value = '';
      optEmpty.textContent = '—';
      s.appendChild(optEmpty);

      const fDiv = getFloorDiv(f.index);
      const ids = fDiv ? qsa('.path-node', fDiv).map(n => n.dataset.id).sort() : [];
      ids.forEach(id => {
        const o = document.createElement('option');
        o.value = id;
        o.textContent = `${id} (${getNodeLabel(f.index, id)})`;
        s.appendChild(o);
      });

      s.value = conn.nodesByFloor[String(f.index)] || '';

      s.addEventListener('change', () => {
        const v = s.value || '';
        if (v) conn.nodesByFloor[String(f.index)] = v;
        else delete conn.nodesByFloor[String(f.index)];
        buildGlobalGraph();
      });

      mapWrap.appendChild(l);
      mapWrap.appendChild(s);
    });

  body.appendChild(mapWrap);


  const btnRow = makeRow();
  const btnSave = document.createElement('button');
  btnSave.textContent = 'Сохранить';
  btnSave.addEventListener('click', () => {
    const newId = (idIn.value || '').trim();
    if (!newId) { alert('ID не может быть пустым'); return; }

    const exists = (building.connectors || []).some(c => c.id === newId && c !== conn);
    if (exists) { alert('Такой ID уже существует'); return; }

    if (newId !== conn.id) {
      conn.id = newId;
      stairsEditorSelectedConnectorId = newId;
    }
    conn.label = (labelIn.value || '').trim();

    buildGlobalGraph();
    updateEditorUI();
  });

  btnRow.appendChild(btnSave);
  body.appendChild(btnRow);

  const hint = document.createElement('div');
  hint.style.opacity = '0.75';
  hint.style.marginTop = '8px';
  hint.textContent = 'Назначьте узлы по этажам через списки и нажмите “Сохранить”.';
  body.appendChild(hint);
}

function updateEditorUI() {
  ensureEditorBarUI();
  ensureEditorPanelUI();
  syncEditorBarUI();

  const panel = document.getElementById('editor-panel');
  if (!panel) return;

  if (!showGraphOverlay || !activeEditor) {
    panel.style.display = 'none';
    return;
  }

  panel.style.display = 'block';
  const body = clearPanelBody();
  if (!body) return;

  if (activeEditor === 'graph') renderGraphEditor(body);
  else if (activeEditor === 'rooms') renderRoomsEditor(body);
  else if (activeEditor === 'floor') renderFloorEditor(body);
  else if (activeEditor === 'stairs') renderStairsEditor(body);
}

function exportBuildingJson() {
  if (!building) return;
  const json = JSON.stringify(building, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'building.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}


imHereButton.addEventListener('click', () => {
  if (!currentRoomElement) return;
  clearAllPaths();
  setCurrentLocation(currentRoomElement.id);
  closePopup();
});

searchButton.addEventListener('click', toggleSearch);
searchInput.addEventListener('input', updateSearchResults);

evacuateButton.addEventListener('click', () => startEvacuation());

routeNextBtn.addEventListener('click', nextStep);
routeFinishBtn.addEventListener('click', finishRoute);


const QR_ALIGNMENT_POS = [[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90], [6, 28, 50, 72, 94], [6, 26, 50, 74, 98], [6, 30, 54, 78, 102], [6, 28, 54, 80, 106], [6, 32, 58, 84, 110], [6, 30, 58, 86, 114], [6, 34, 62, 90, 118], [6, 26, 50, 74, 98, 122], [6, 30, 54, 78, 102, 126], [6, 26, 52, 78, 104, 130], [6, 30, 56, 82, 108, 134], [6, 34, 60, 86, 112, 138], [6, 30, 58, 86, 114, 142], [6, 34, 62, 90, 118, 146], [6, 30, 54, 78, 102, 126, 150], [6, 24, 50, 76, 102, 128, 154], [6, 28, 54, 80, 106, 132, 158], [6, 32, 58, 84, 110, 136, 162], [6, 26, 54, 82, 110, 138, 166], [6, 30, 58, 86, 114, 142, 170]];
const QR_RS_BLOCKS_M = [[[26, 16]], [[44, 28]], [[70, 44]], [[50, 32], [50, 32]], [[67, 43], [67, 43]], [[43, 27], [43, 27], [43, 27], [43, 27]], [[49, 31], [49, 31], [49, 31], [49, 31]], [[60, 38], [60, 38], [61, 39], [61, 39]], [[58, 36], [58, 36], [58, 36], [59, 37], [59, 37]], [[69, 43], [69, 43], [69, 43], [69, 43], [70, 44]], [[80, 50], [81, 51], [81, 51], [81, 51], [81, 51]], [[58, 36], [58, 36], [58, 36], [58, 36], [58, 36], [58, 36], [59, 37], [59, 37]], [[59, 37], [59, 37], [59, 37], [59, 37], [59, 37], [59, 37], [59, 37], [59, 37], [60, 38]], [[64, 40], [64, 40], [64, 40], [64, 40], [65, 41], [65, 41], [65, 41], [65, 41], [65, 41]], [[65, 41], [65, 41], [65, 41], [65, 41], [65, 41], [66, 42], [66, 42], [66, 42], [66, 42], [66, 42]], [[73, 45], [73, 45], [73, 45], [73, 45], [73, 45], [73, 45], [73, 45], [74, 46], [74, 46], [74, 46]], [[74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [75, 47]], [[69, 43], [69, 43], [69, 43], [69, 43], [69, 43], [69, 43], [69, 43], [69, 43], [69, 43], [70, 44], [70, 44], [70, 44], [70, 44]], [[70, 44], [70, 44], [70, 44], [71, 45], [71, 45], [71, 45], [71, 45], [71, 45], [71, 45], [71, 45], [71, 45], [71, 45], [71, 45], [71, 45]], [[67, 41], [67, 41], [67, 41], [68, 42], [68, 42], [68, 42], [68, 42], [68, 42], [68, 42], [68, 42], [68, 42], [68, 42], [68, 42], [68, 42], [68, 42], [68, 42]], [[68, 42], [68, 42], [68, 42], [68, 42], [68, 42], [68, 42], [68, 42], [68, 42], [68, 42], [68, 42], [68, 42], [68, 42], [68, 42], [68, 42], [68, 42], [68, 42], [68, 42]], [[74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46]], [[75, 47], [75, 47], [75, 47], [75, 47], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48]], [[73, 45], [73, 45], [73, 45], [73, 45], [73, 45], [73, 45], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46]], [[75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48]], [[74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [75, 47], [75, 47], [75, 47], [75, 47]], [[73, 45], [73, 45], [73, 45], [73, 45], [73, 45], [73, 45], [73, 45], [73, 45], [73, 45], [73, 45], [73, 45], [73, 45], [73, 45], [73, 45], [73, 45], [73, 45], [73, 45], [73, 45], [73, 45], [73, 45], [73, 45], [73, 45], [74, 46], [74, 46], [74, 46]], [[73, 45], [73, 45], [73, 45], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46]], [[73, 45], [73, 45], [73, 45], [73, 45], [73, 45], [73, 45], [73, 45], [73, 45], [73, 45], [73, 45], [73, 45], [73, 45], [73, 45], [73, 45], [73, 45], [73, 45], [73, 45], [73, 45], [73, 45], [73, 45], [73, 45], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46]], [[75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48]], [[74, 46], [74, 46], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47]], [[74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47]], [[74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47]], [[74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47]], [[75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48]], [[75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48]], [[74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47]], [[74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [74, 46], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47]], [[75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48]], [[75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [75, 47], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48], [76, 48]]];

const QRGen = (() => {
  
  const EXP = new Array(512);
  const LOG = new Array(256);
  (function initGF() {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11D;
    }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
    LOG[0] = 0;
  })();
  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return EXP[LOG[a] + LOG[b]];
  }

  const genCache = new Map();
  function makeGeneratorPoly(ecLen) {
    if (genCache.has(ecLen)) return genCache.get(ecLen);
    let poly = [1];
    for (let i = 0; i < ecLen; i++) {
      const next = new Array(poly.length + 1).fill(0);
      for (let j = 0; j < poly.length; j++) {
        next[j] ^= poly[j];
        next[j + 1] ^= gfMul(poly[j], EXP[i]);
      }
      poly = next;
    }
    const gen = poly.slice(1); 
    genCache.set(ecLen, gen);
    return gen;
  }

  function rsRemainder(data, ecLen) {
    const gen = makeGeneratorPoly(ecLen);
    const res = new Array(ecLen).fill(0);
    for (const b of data) {
      const factor = b ^ res[0];
      for (let i = 0; i < ecLen - 1; i++) res[i] = res[i + 1];
      res[ecLen - 1] = 0;
      for (let i = 0; i < ecLen; i++) res[i] ^= gfMul(gen[i], factor);
    }
    return res;
  }

  function toUtf8Bytes(str) {
    return Array.from(new TextEncoder().encode(str));
  }

  function getCountBits(version) {
    return version <= 9 ? 8 : 16; 
  }

  function blocksForVersion(version) {
    return QR_RS_BLOCKS_M[version - 1];
  }

  function totalDataCodewords(version) {
    let sum = 0;
    for (const [, dat] of blocksForVersion(version)) sum += dat;
    return sum;
  }

  class BitBuffer {
    constructor() { this.bits = []; }
    appendBits(val, len) {
      for (let i = len - 1; i >= 0; i--) this.bits.push(((val >>> i) & 1) !== 0);
    }
    appendByte(b) { this.appendBits(b, 8); }
    get length() { return this.bits.length; }
  }

  function buildDataCodewords(version, bytes) {
    const capCw = totalDataCodewords(version);
    const capBits = capCw * 8;

    const bb = new BitBuffer();
    bb.appendBits(0b0100, 4); 
    bb.appendBits(bytes.length, getCountBits(version));
    for (const b of bytes) bb.appendByte(b);

    
    const remaining = capBits - bb.length;
    bb.appendBits(0, Math.min(4, Math.max(0, remaining)));

    
    while (bb.length % 8 !== 0) bb.appendBits(0, 1);

    
    const codewords = [];
    for (let i = 0; i < bb.bits.length; i += 8) {
      let v = 0;
      for (let j = 0; j < 8; j++) v = (v << 1) | (bb.bits[i + j] ? 1 : 0);
      codewords.push(v);
    }

    const PAD = [0xEC, 0x11];
    let p = 0;
    while (codewords.length < capCw) {
      codewords.push(PAD[p & 1]);
      p++;
    }
    return codewords;
  }

  function interleave(version, dataCodewords) {
    const spec = blocksForVersion(version);
    const blocks = [];
    let k = 0;
    for (const [tot, dat] of spec) {
      const data = dataCodewords.slice(k, k + dat);
      k += dat;
      const ecLen = tot - dat;
      const ecc = rsRemainder(data, ecLen);
      blocks.push({ data, ecc });
    }

    const result = [];
    const maxDat = Math.max(...blocks.map(b => b.data.length));
    for (let i = 0; i < maxDat; i++) for (const b of blocks) if (i < b.data.length) result.push(b.data[i]);

    const maxEcc = Math.max(...blocks.map(b => b.ecc.length));
    for (let i = 0; i < maxEcc; i++) for (const b of blocks) if (i < b.ecc.length) result.push(b.ecc[i]);

    return result;
  }

  function highestBitIndex(x) {
    let n = -1;
    while (x > 0) { x >>>= 1; n++; }
    return n; 
  }

  function bchRemainder(value, poly) {
    
    const polyDeg = highestBitIndex(poly);
    let v = value;
    while (highestBitIndex(v) >= polyDeg) {
      v ^= poly << (highestBitIndex(v) - polyDeg);
    }
    return v;
  }

  function formatBits(mask) {
    
    const data = (0 << 3) | mask; 
    const d = bchRemainder(data << 10, 0x537);
    return (((data << 10) | d) ^ 0x5412) & 0x7FFF;
  }

  function versionBits(version) {
    const d = bchRemainder(version << 12, 0x1F25);
    return ((version << 12) | d) & 0x3FFFF;
  }

  function makeMatrix(size) {
    const mods = Array.from({ length: size }, () => Array(size).fill(null));
    const fun  = Array.from({ length: size }, () => Array(size).fill(false));
    return { mods, fun };
  }
  function setFunc(m, x, y, dark) {
    m.mods[y][x] = dark;
    m.fun[y][x] = true;
  }

  function drawFinder(m, x, y) {
    for (let dy = -1; dy <= 7; dy++) {
      for (let dx = -1; dx <= 7; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= m.mods.length || yy >= m.mods.length) continue;
        const on = (dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6 &&
          (dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4)));
        setFunc(m, xx, yy, on);
      }
    }
  }

  function drawAlignment(m, cx, cy) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        setFunc(m, cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  }

  function drawTiming(m) {
    const size = m.mods.length;
    for (let i = 8; i < size - 8; i++) {
      const dark = (i % 2) === 0;
      if (!m.fun[6][i]) setFunc(m, i, 6, dark);
      if (!m.fun[i][6]) setFunc(m, 6, i, dark);
    }
  }

  function drawAlignmentPatterns(m, version) {
    const pos = QR_ALIGNMENT_POS[version - 1];
    if (!pos || pos.length === 0) return;
    for (let i = 0; i < pos.length; i++) {
      for (let j = 0; j < pos.length; j++) {
        if ((i === 0 && j === 0) || (i === 0 && j === pos.length - 1) || (i === pos.length - 1 && j === 0)) continue;
        drawAlignment(m, pos[i], pos[j]);
      }
    }
  }

  function reserveFormat(m) {
    const size = m.mods.length;
    for (let i = 0; i < 9; i++) {
      if (i !== 6) { m.fun[i][8] = true; m.fun[8][i] = true; }
    }
    for (let i = 0; i < 8; i++) {
      m.fun[size - 1 - i][8] = true;
      m.fun[8][size - 1 - i] = true;
    }
    m.fun[8][8] = true;
  }

  function drawVersion(m, version) {
    if (version < 7) return;
    const size = m.mods.length;
    const bits = versionBits(version);
    for (let i = 0; i < 18; i++) {
      const bit = ((bits >>> i) & 1) !== 0;
      const x = (i % 3) + size - 11;
      const y = Math.floor(i / 3);
      setFunc(m, x, y, bit);
    }
    for (let i = 0; i < 18; i++) {
      const bit = ((bits >>> i) & 1) !== 0;
      const x = Math.floor(i / 3);
      const y = (i % 3) + size - 11;
      setFunc(m, x, y, bit);
    }
  }

  function drawFormatBits(m, mask) {
    const size = m.mods.length;
    const bits = formatBits(mask);

    
    for (let i = 0; i < 15; i++) {
      const bit = ((bits >>> i) & 1) !== 0;
      if (i < 6) setFunc(m, 8, i, bit);
      else if (i < 8) setFunc(m, 8, i + 1, bit);
      else setFunc(m, 8, size - 15 + i, bit);
    }

    
    for (let i = 0; i < 15; i++) {
      const bit = ((bits >>> i) & 1) !== 0;
      if (i < 8) setFunc(m, size - i - 1, 8, bit);
      else if (i < 9) setFunc(m, 7, 8, bit);
      else setFunc(m, 14 - i, 8, bit);
    }

    
    setFunc(m, 8, size - 8, true);
  }

  function placeData(m, codewords) {
    const size = m.mods.length;
    let bitIndex = 7;
    let byteIndex = 0;

    let row = size - 1;
    let inc = -1;

    const getBit = () => {
      if (byteIndex >= codewords.length) return 0;
      const b = codewords[byteIndex];
      const bit = (b >>> bitIndex) & 1;
      bitIndex--;
      if (bitIndex < 0) { byteIndex++; bitIndex = 7; }
      return bit;
    };

    for (let col = size - 1; col > 0; col -= 2) {
      if (col === 6) col--; 
      while (true) {
        for (let c = col; c >= col - 1; c--) {
          if (m.fun[row][c]) continue;
          m.mods[row][c] = getBit() === 1;
        }
        row += inc;
        if (row < 0 || row >= size) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }
  }

  function maskFunc(mask, r, c) {
    switch (mask) {
      case 0: return ((r + c) % 2) === 0;
      case 1: return (r % 2) === 0;
      case 2: return (c % 3) === 0;
      case 3: return ((r + c) % 3) === 0;
      case 4: return (((Math.floor(r / 2) + Math.floor(c / 3)) % 2) === 0);
      case 5: return (((r * c) % 2 + (r * c) % 3) === 0);
      case 6: return ((((r * c) % 2 + (r * c) % 3) % 2) === 0);
      case 7: return ((((r * c) % 3 + (r + c) % 2) % 2) === 0);
      default: return false;
    }
  }

  function applyMask(m, mask) {
    const size = m.mods.length;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (m.fun[r][c]) continue;
        if (maskFunc(mask, r, c)) m.mods[r][c] = !m.mods[r][c];
      }
    }
  }

  function cloneMatrix(m) {
    const size = m.mods.length;
    const mods = Array.from({ length: size }, (_, r) => m.mods[r].slice());
    const fun  = Array.from({ length: size }, (_, r) => m.fun[r].slice());
    return { mods, fun };
  }

  function penalty(m) {
    const size = m.mods.length;
    let score = 0;

    
    for (let r = 0; r < size; r++) {
      let runColor = m.mods[r][0];
      let runLen = 1;
      for (let c = 1; c < size; c++) {
        if (m.mods[r][c] === runColor) runLen++;
        else {
          if (runLen >= 5) score += 3 + (runLen - 5);
          runColor = m.mods[r][c];
          runLen = 1;
        }
      }
      if (runLen >= 5) score += 3 + (runLen - 5);
    }
    for (let c = 0; c < size; c++) {
      let runColor = m.mods[0][c];
      let runLen = 1;
      for (let r = 1; r < size; r++) {
        if (m.mods[r][c] === runColor) runLen++;
        else {
          if (runLen >= 5) score += 3 + (runLen - 5);
          runColor = m.mods[r][c];
          runLen = 1;
        }
      }
      if (runLen >= 5) score += 3 + (runLen - 5);
    }

    
    for (let r = 0; r < size - 1; r++) {
      for (let c = 0; c < size - 1; c++) {
        const v = m.mods[r][c];
        if (v === m.mods[r][c + 1] && v === m.mods[r + 1][c] && v === m.mods[r + 1][c + 1]) score += 3;
      }
    }

    
    const p1 = [1,0,1,1,1,0,1,0,0,0,0];
    const p2 = [0,0,0,0,1,0,1,1,1,0,1];
    function matchLine(get) {
      for (let i = 0; i <= size - 11; i++) {
        let ok1 = true, ok2 = true;
        for (let j = 0; j < 11; j++) {
          const b = get(i + j) ? 1 : 0;
          if (b !== p1[j]) ok1 = false;
          if (b !== p2[j]) ok2 = false;
          if (!ok1 && !ok2) break;
        }
        if (ok1 || ok2) score += 40;
      }
    }
    for (let r = 0; r < size; r++) matchLine(i => m.mods[r][i]);
    for (let c = 0; c < size; c++) matchLine(i => m.mods[i][c]);

    
    let dark = 0;
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (m.mods[r][c]) dark++;
    const total = size * size;
    const k = Math.abs((dark * 100 / total) - 50);
    score += Math.floor(k / 5) * 10;

    return score;
  }

  function encodeText(text) {
    const bytes = toUtf8Bytes(text);

    
    let version = 0;
    for (let v = 1; v <= 40; v++) {
      const capBits = totalDataCodewords(v) * 8;
      const header = 4 + getCountBits(v);
      const needed = header + bytes.length * 8;
      if (needed <= capBits) { version = v; break; }
    }
    if (!version) throw new Error('Слишком длинный URL для QR');

    const dataCw = buildDataCodewords(version, bytes);
    const allCw = interleave(version, dataCw);

    const size = 17 + 4 * version;
    const m = makeMatrix(size);

    drawFinder(m, 0, 0);
    drawFinder(m, size - 7, 0);
    drawFinder(m, 0, size - 7);
    drawAlignmentPatterns(m, version);
    drawTiming(m);
    reserveFormat(m);
    drawVersion(m, version);

    placeData(m, allCw);

    
    let bestMask = 0;
    let bestScore = Infinity;
    for (let mask = 0; mask < 8; mask++) {
      const mm = cloneMatrix(m);
      applyMask(mm, mask);
      drawFormatBits(mm, mask);
      const sc = penalty(mm);
      if (sc < bestScore) { bestScore = sc; bestMask = mask; }
    }

    applyMask(m, bestMask);
    drawFormatBits(m, bestMask);

    
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (m.mods[r][c] === null) m.mods[r][c] = false;

    return { version, size, mask: bestMask, modules: m.mods };
  }

  function toSvgString(qr, px = 240, border = 4) {
    const size = qr.size;
    const dim = size + border * 2;
    let path = '';
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (qr.modules[y][x]) {
          const xx = x + border;
          const yy = y + border;
          path += `M${xx},${yy}h1v1h-1z`;
        }
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" width="${px}" height="${px}" shape-rendering="crispEdges">` +
           `<rect width="100%" height="100%" fill="#fff"/>` +
           `<path d="${path}" fill="#000"/></svg>`;
  }

  function toSvgDataUrl(text, px = 240, border = 4) {
    const qr = encodeText(text);
    const svg = toSvgString(qr, px, border);
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  return { encodeText, toSvgDataUrl };
})();

let _qrBtn = null;
let _qrPopup = null;
let _qrImg = null;
let _qrUrlText = null;

function ensureQrUI() {
  
  _qrBtn = document.getElementById('qr-button');
  if (!_qrBtn && evacuateButton && evacuateButton.parentElement) {
    _qrBtn = document.createElement('button');
    _qrBtn.id = 'qr-button';
    _qrBtn.title = 'QR-код страницы';
    _qrBtn.setAttribute('aria-label', 'QR-код страницы');

    
    _qrBtn.innerHTML = `<span aria-hidden="true" style="font-size:20px; line-height:1;">⛆</span>`;

    
    _qrBtn.style.position = 'fixed';
    _qrBtn.style.top = '20px';
    _qrBtn.style.right = '140px'; 
    _qrBtn.style.width = '40px';
    _qrBtn.style.height = '40px';
    _qrBtn.style.borderRadius = '50%';
    _qrBtn.style.display = 'flex';
    _qrBtn.style.alignItems = 'center';
    _qrBtn.style.justifyContent = 'center';
    _qrBtn.style.border = '1px solid rgba(0,0,0,0.12)';
    _qrBtn.style.cursor = 'pointer';
    _qrBtn.style.zIndex = '2500';
    _qrBtn.style.backgroundColor = '#fff';
    _qrBtn.style.color = '#111';
    _qrBtn.style.boxShadow = '0 4px 10px rgba(0,0,0,0.25)';

    
    evacuateButton.parentElement.insertBefore(_qrBtn, evacuateButton);
  }

  
  _qrPopup = document.getElementById('qr-popup');
  if (!_qrPopup) {
    _qrPopup = document.createElement('div');
    _qrPopup.id = 'qr-popup';
    _qrPopup.className = 'hidden';
    _qrPopup.style.position = 'fixed';
    _qrPopup.style.inset = '0';
    _qrPopup.style.background = 'rgba(0,0,0,0.45)';
    _qrPopup.style.zIndex = '4000';
    _qrPopup.style.display = 'none';
    _qrPopup.style.alignItems = 'center';
    _qrPopup.style.justifyContent = 'center';
    _qrPopup.style.padding = '16px';

    const card = document.createElement('div');
    card.style.position = 'relative';
    card.style.background = 'rgba(255,255,255,0.96)';
    card.style.borderRadius = '14px';
    card.style.boxShadow = '0 14px 40px rgba(0,0,0,0.25)';
    card.style.padding = '14px 14px 12px';
    card.style.width = 'min(92vw, 360px)';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.gap = '10px';
    card.style.alignItems = 'center';

    const title = document.createElement('div');
    title.textContent = 'QR-код этой страницы';
    title.style.fontWeight = '700';
    title.style.fontSize = '14px';
    title.style.textAlign = 'center';

    const close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label', 'Закрыть');
    close.textContent = '×';
    close.style.position = 'absolute';
    close.style.top = '8px';
    close.style.right = '10px';
    close.style.width = '34px';
    close.style.height = '34px';
    close.style.borderRadius = '10px';
    close.style.border = 'none';
    close.style.cursor = 'pointer';
    close.style.background = 'rgba(0,0,0,0.06)';
    close.style.fontSize = '22px';
    close.style.lineHeight = '0';
    close.addEventListener('click', closeQrPopup);

    _qrImg = document.createElement('img');
    _qrImg.alt = 'QR';
    _qrImg.width = 240;
    _qrImg.height = 240;
    _qrImg.style.borderRadius = '10px';
    _qrImg.style.background = '#fff';
    _qrImg.style.border = '1px solid rgba(0,0,0,0.08)';

    const note = document.createElement('div');
    note.style.fontSize = '12px';
    note.style.opacity = '0.75';
    note.style.textAlign = 'center';
    note.textContent = 'Откройте камерой телефона';

    _qrUrlText = document.createElement('div');
    _qrUrlText.style.fontSize = '11px';
    _qrUrlText.style.opacity = '0.7';
    _qrUrlText.style.wordBreak = 'break-all';
    _qrUrlText.style.textAlign = 'center';

    const err = document.createElement('div');
    err.id = 'qr-error';
    err.style.display = 'none';
    err.style.fontSize = '12px';
    err.style.color = '#b00020';
    err.style.textAlign = 'center';
    err.textContent = 'Не удалось загрузить QR-код. Проверьте интернет.';

    _qrImg.addEventListener('error', () => {
      const e = document.getElementById('qr-error');
      if (e) e.style.display = 'block';
    });

    card.appendChild(close);
    card.appendChild(title);
    card.appendChild(_qrImg);
    card.appendChild(err);
    card.appendChild(note);
    card.appendChild(_qrUrlText);
    _qrPopup.appendChild(card);

    document.body.appendChild(_qrPopup);
  }

  if (_qrBtn) {
    _qrBtn.addEventListener('click', openQrPopup);
  }
}

function openQrPopup() {
  if (!_qrPopup || !_qrImg) return;
  const url = window.location.href; 
  const encoded = encodeURIComponent(url);

  
  _qrImg.src = QRGen.toSvgDataUrl(url, 240, 4);
  if (_qrUrlText) _qrUrlText.textContent = url;

  _qrPopup.classList.remove('hidden');
  _qrPopup.style.display = 'flex';
}

function closeQrPopup() {
  if (!_qrPopup) return;
  _qrPopup.classList.add('hidden');
  _qrPopup.style.display = 'none';
}


document.addEventListener('DOMContentLoaded', async () => {
  try {
    ensureQrUI();
    ensureEditorBarUI();
    ensureEditorPanelUI();

    await loadBuilding();
    renderBuilding();
    resetNodeCenterCache();
    buildGlobalGraph();
    updateEditorUI();
    updateGraphOverlay();

    applyTransform();

    const params = getUrlParams();
    if (params.roomId && roomIndex.get(params.roomId)) {
      setCurrentLocation(params.roomId);
      if (params.evacuate) {
        setTimeout(() => startEvacuation(), 200);
      } else if (params.toRoomId && roomIndex.get(params.toRoomId)) {
        setTimeout(() => startRouteToRoom(params.toRoomId), 200);
      }
    } else {
      showFloor(1);
    }
  } catch (err) {
    console.error(err);
    alert('Ошибка загрузки конфигурации схемы. Проверьте building.json.');
  }
});
