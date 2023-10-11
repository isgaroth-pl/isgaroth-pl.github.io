import * as THREE from './libs/three.module.js';
import GSAP from './libs/gsap-core.js';

const guiWorld = {
  plane: { width: 150, height: 150, widthSegments: 50, heightSegments: 50 },
  vertexAnimation: { deltaX: 0.28, deltaY: 0.28, deltaZ: 0.22, zBoostMax: 4 }
};

const pointer = new THREE.Vector2();
const defaultColor = new THREE.Vector3(0.2, 0.3, 0.4);
const highlightColor = new THREE.Vector3(0.1, 0.5, 1);
const gainLerpFactor = 0.15;  // factor for gaining color; adjust this for faster/slower color transition
const decayLerpFactor = 0.005;  // factor for decaying color; adjust this for faster/slower color transition

let scene, camera, raycaster, renderer;
let scenePlane, sceneFrontLight, sceneBackLight;
let frameCounter = 0;
let vertexPositions = [];
let activeVertices = [];

initialize();
animate();

function initialize() {
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(innerWidth, innerHeight);
  document.getElementById('background-canvas').appendChild(renderer.domElement);   

  camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 35);

  scene = new THREE.Scene();
  raycaster = new THREE.Raycaster();
  
  createScenePlane();

  //sceneFrontLight = createDirectionalLight(0, 0.4, 1);
  //sceneBackLight = createDirectionalLight(0, 0.3, -1);
  const ambientLight = new THREE.AmbientLight(0x404040, 1);

  scene.add(sceneFrontLight, sceneBackLight, ambientLight);

  addEventListener('click', onPointerClick);
  addEventListener('mousemove', onPointerMove);
  window.addEventListener('resize', onWindowResize);
}

function animate() {

  frameCounter += 0.01;

  animateActiveVertices();
 
  animatePlaneVertexPositions();

  adjustVertexColorsTowardsTarget();

  rotateMesh(scenePlane, 0, 0, 0.0001);

  requestAnimationFrame(animate);
  render();
}

function createDirectionalLight(x, y, z) {
  const light = new THREE.DirectionalLight(0x404040, 5);
  light.position.set(x, y, z);
  return light;
}

//#region Plane Creation
function createScenePlane() {
  const { width, height, widthSegments, heightSegments } = guiWorld.plane;
  const planeGeometry = new THREE.PlaneGeometry(width, height, widthSegments, heightSegments);
  const material = new THREE.MeshBasicMaterial({
    wireframe: true,
    side: THREE.DoubleSide,
    flatShading: THREE.FlatShading,
    vertexColors: true
  });
  
  scenePlane = new THREE.Mesh(planeGeometry, material);
  initializePlaneAttributes(scenePlane.geometry.attributes.position);

  scene.add(scenePlane);
}

function randomizeComponent(component) {
  const variance = 0.15; // Adjust as needed. This will randomize color up to ±5% of its original value.
  return component + (Math.random() * variance - variance / 2);
}

function initializePlaneAttributes(attr) {

  attr.originalPosArray = [];
  
  const { array, originalPosArray } = attr;
  
  for (let i = 0; i < array.length; i += 3) {
    randomizeVertexPosition(array, i);
    storeOriginalPosition(originalPosArray, array, i);

    // Store the vertex position
    vertexPositions.push(new THREE.Vector3(array[i], array[i + 1], array[i + 2]));
  }

  const colors = [];
  const targetColors = [];
  const startingColors = [];

  for (let i = 0; i < attr.count; i++) {
      const randomizedR = randomizeComponent(defaultColor.x);
      const randomizedG = randomizeComponent(defaultColor.y);
      const randomizedB = randomizeComponent(defaultColor.z);

      colors.push(randomizedR, randomizedG, randomizedB);
      targetColors.push(randomizedR, randomizedG, randomizedB);
      startingColors.push(randomizedR, randomizedG, randomizedB);
  }

  scenePlane.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
  scenePlane.geometry.attributes.startingColors = new THREE.BufferAttribute(new Float32Array(startingColors), 3);

  //const colors = Array(attr.count).fill(defaultColor.toArray()).flat();
  //scenePlane.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));

  attr.offsetArray = Array(attr.count).fill(0).map(() => Math.random() * Math.PI * 2);

  attr.zBoostArray = Array(attr.count).fill(0);

  // Initialize target color for each vertex
  //attr.targetColorArray = Array(attr.count * 3).fill(defaultColor.toArray()).flat();
  attr.targetColorArray = targetColors;
}

function randomizeVertexPosition(array, i) {
  array[i] += (Math.random() - 0.5) * 0.2;
  array[i + 1] += (Math.random() - 0.5) * 0.25;
  array[i + 2] += (Math.random() - 0.5) * 0.5;
}

function storeOriginalPosition(originalPosArray, array, i) {
  originalPosArray.push(array[i], array[i + 1], array[i + 2]);
}
//#endregion

function animatePlaneVertexPositions() {
  const { array, originalPosArray, offsetArray, zBoostArray } = scenePlane.geometry.attributes.position;

  for (let i = 0; i < array.length; i += 3) {
    const vertexIndex = i / 3;

    array[i] = originalPosArray[i] 
        + Math.cos(frameCounter + offsetArray[vertexIndex]) * guiWorld.vertexAnimation.deltaX;
    array[i + 1] = originalPosArray[i + 1] 
        + Math.cos(frameCounter + offsetArray[vertexIndex]) * guiWorld.vertexAnimation.deltaY;
    array[i + 2] = originalPosArray[i + 2] 
        + Math.cos(frameCounter + offsetArray[vertexIndex]) * guiWorld.vertexAnimation.deltaZ 
        + zBoostArray[vertexIndex];
}


  scenePlane.geometry.attributes.position.needsUpdate = true;
}

function rotateMesh(meshToRotate, xDelta, yDelta, zDelta) {
  meshToRotate.rotation.x += xDelta;
  meshToRotate.rotation.y += yDelta;
  meshToRotate.rotation.z += zDelta;
}

//#region Color higlight Logic
let prevHighlightedFace = null; // to keep track of previously highlighted face

function onPointerMove(event) {
    pointer.x = (event.clientX / innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(scenePlane);

    if (intersects.length > 0) {
        const intersectedFace = intersects[0].face;
        highlightFace(intersectedFace);
    } else {
        clearHighlight();
    }
}

function highlightFace(face) {
  // If the same face is already highlighted, we don't need to do anything
  if (prevHighlightedFace === face) {
      return;
  }

  clearHighlight(); // Clear previous highlight

  const vertices = [face.a, face.b, face.c];
  for (let i = 0; i < vertices.length; i++) {
      const index = vertices[i] * 3;
      scenePlane.geometry.attributes.position.targetColorArray[index] = highlightColor.x;
      scenePlane.geometry.attributes.position.targetColorArray[index + 1] = highlightColor.y;
      scenePlane.geometry.attributes.position.targetColorArray[index + 2] = highlightColor.z;
  }

  prevHighlightedFace = face; // update the previously highlighted face
}

function clearHighlight() {
  if (prevHighlightedFace) {
      const vertices = [prevHighlightedFace.a, prevHighlightedFace.b, prevHighlightedFace.c];
      for (let i = 0; i < vertices.length; i++) {
          const index = vertices[i] * 3;
          scenePlane.geometry.attributes.position.targetColorArray[index] = 
            scenePlane.geometry.attributes.startingColors.array[index];
          scenePlane.geometry.attributes.position.targetColorArray[index + 1] =
            scenePlane.geometry.attributes.startingColors.array[index + 1];
          scenePlane.geometry.attributes.position.targetColorArray[index + 2] =
            scenePlane.geometry.attributes.startingColors.array[index + 2];
      }

      prevHighlightedFace = null; // reset the previously highlighted face
  }
}


function adjustVertexColorsTowardsTarget() {
  const currentColors = scenePlane.geometry.attributes.color.array;
  const targetColors = scenePlane.geometry.attributes.position.targetColorArray;

  for (let i = 0; i < currentColors.length; i+=3) {
      const isHighlighting = 
          targetColors[i] === highlightColor.x && 
          targetColors[i+1] === highlightColor.y && 
          targetColors[i+2] === highlightColor.z;

      const lerpFactor = isHighlighting ? gainLerpFactor : decayLerpFactor;

      currentColors[i] += (targetColors[i] - currentColors[i]) * lerpFactor;
      currentColors[i+1] += (targetColors[i+1] - currentColors[i+1]) * lerpFactor;
      currentColors[i+2] += (targetColors[i+2] - currentColors[i+2]) * lerpFactor;
  }

  scenePlane.geometry.attributes.color.needsUpdate = true;
}

//#endregion

//#region Z Boost Wave Logic
function onPointerClick(event) {
  pointer.x = (event.clientX / innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / innerHeight) * 2 + 1;
  
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObject(scenePlane);

  if (intersects.length > 0) {
    const clickedVertexIndex = intersects[0].face.a; // assuming you clicked vertex 'a'
    propagateRippleEffect(clickedVertexIndex);
    //guiWorld.vertexAnimation.zBoostMax *= -1;
  }
}

// function propagateRippleEffect(clickedVertexIndex) {
//   const clickedVertex = vertexPositions[clickedVertexIndex];
//   for (let i = 0; i < vertexPositions.length; i++) {
//       const currentVertex = vertexPositions[i];
//       let distance = clickedVertex.distanceTo(currentVertex);

//       let rippleRange = 25; 

//       if (distance <= rippleRange) {
//           activeVertices.push(
//           {
//             index: i,
//             rising: true, 
//             boost: 0, 
//             maxBoost: ((rippleRange - distance ) * guiWorld.vertexAnimation.zBoostMax) / rippleRange
//           });
//       }
//   }
// }

let clickedVertex;
let rippleRange = 115; 

function propagateRippleEffect(clickedVertexIndex) {
  clickedVertex = vertexPositions[clickedVertexIndex];

  for (let i = 0; i < vertexPositions.length; i++) {
      const currentVertex = vertexPositions[i];
      let distance = clickedVertex.distanceTo(currentVertex);

      if (distance <= rippleRange) {
          activeVertices.push({
            index: i,
            time: -distance,  // Start with negative time proportional to distance
            maxBoost: guiWorld.vertexAnimation.zBoostMax,
          });
      }
  }
}

const waveSpeed = 0.35;
const decayRate = 0.8;
const waveFrequency = 2 * Math.PI / rippleRange; 

function animateActiveVertices() {
  let updatedActiveVertices = [];

  for (let i = 0; i < activeVertices.length; i++) {
      let vertexData = activeVertices[i];
      
      // Increment the time for this vertex
      vertexData.time += waveSpeed;

      // Only start the wave if time is positive
      if (vertexData.time > 0) {
          let sineValue = Math.sin(vertexData.time * waveFrequency);

          vertexData.boost = sineValue * vertexData.maxBoost;

          // Decay the boost to gradually dissipate the wave over time
          vertexData.boost *= decayRate;

          // Update Z position
          scenePlane.geometry.attributes.position.zBoostArray[vertexData.index] = vertexData.boost;

          // If boost value is significantly large, retain the vertex as active
          if (Math.abs(vertexData.boost) > 0.01) {
              updatedActiveVertices.push(vertexData);
          }
      } else {
          updatedActiveVertices.push(vertexData);  // Retain vertices that haven't started yet
      }
  }

  // Replace the active vertices with the updated list
  activeVertices = updatedActiveVertices;

  scenePlane.geometry.attributes.position.needsUpdate = true;
}


// function animateActiveVertices() {
//   const growRate = 0.05;  // Controls how fast the boost grows
//   const decayRate = 0.98; // Controls how fast the boost decays after reaching max

//   let updatedActiveVertices = [];

//   for (let i = 0; i < activeVertices.length - 1; i++) {
//       let vertexData = activeVertices[i];
//       if (vertexData.boost < vertexData.maxBoost && vertexData.rising) {
//           vertexData.boost += growRate;
//       } else {
//           vertexData.boost *= decayRate;
//           vertexData.rising = false;
//       }

//       // Update Z position
//       scenePlane.geometry.attributes.position.zBoostArray[vertexData.index] = vertexData.boost;

//       // If boost value is significantly large, retain the vertex as active
//       if (vertexData.boost > 0.01) {
//           updatedActiveVertices.push(vertexData);
//       }
//   }

//   // Replace the active vertices with the updated list
//   activeVertices = updatedActiveVertices;

//   scenePlane.geometry.attributes.position.needsUpdate = true;
// }

//#endregion

function render(){
  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}