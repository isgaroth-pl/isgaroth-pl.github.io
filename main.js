import * as THREE from './libs/three.module.js';
import GSAP from './libs/gsap-core.js';
//import { OrbitControls } from './libs/OrbitControls.js';
//import * as DATGUI from './libs/dat.gui.module.js';

let scene, camera, raycaster, renderer;
let gui;
let scenePlane, sceneFrontLight, sceneBackLight;
let frameCounter = 0;

const guiWorld = {
  plane: { width: 150, height: 150, widthSegments: 80, heightSegments: 80 },
  vertexAnimation: { deltaX: 0.08, deltaY: 0.08, deltaZ: 0.16, zBoostMax: 2.5 }
};

const pointer = new THREE.Vector2();
const defaultColor = new THREE.Vector3(0, 0.19, 0.4);
const highlightColor = new THREE.Vector3(0.1, 0.5, 1);

start();
update();

function start(){

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, (innerWidth / innerHeight), 0.1, 1000);
  raycaster = new THREE.Raycaster();
  renderer = new THREE.WebGLRenderer();

  renderer.setSize(innerWidth, innerHeight);
  document.getElementById('background-canvas').appendChild(renderer.domElement);

  //initGui();
  //initControls();      

  let cameraStartPos = new THREE.Vector3( 0, 0, 35);
  camera.position.copy(cameraStartPos);

  createScenePlane();

  sceneFrontLight = new THREE.DirectionalLight(0x404040, 3);
  sceneFrontLight.position.set(0, 0.4, 1);
  scene.add(sceneFrontLight);

  sceneBackLight = new THREE.DirectionalLight(0x404040, 3);
  sceneBackLight.position.set(0, 0.3, -1);
  scene.add(sceneBackLight);

  const ambientLight = new THREE.AmbientLight(0x404040, 1);
  scene.add(ambientLight);
  
  addEventListener('mousemove', onPointerMove);
  window.addEventListener('resize', onWindowResize);
}

function update()
{
  frameCounter += 0.01;

  requestAnimationFrame(update);
  
  animatePlaneVertexPositions(scenePlane, frameCounter);

  decayZBoost(scenePlane.geometry.attributes.position);

  rotateMesh(scenePlane, 0, 0, 0.0001);
  
  handleRaycasting();

  render();
}

function createScenePlane(){

  const planeGeometry = new THREE.PlaneGeometry(
    guiWorld.plane.width,
    guiWorld.plane.height, 
    guiWorld.plane.widthSegments, 
    guiWorld.plane.heightSegments);

  const material = new THREE.MeshPhongMaterial(
    {
    //color: 0x492395,
    side: THREE.DoubleSide,
    flatShading: THREE.FlatShading,
    vertexColors: true
  });     
    
  scenePlane = new THREE.Mesh(planeGeometry, material);

  randomziePlaneGeometry(scenePlane);

  scene.add(scenePlane);

  //scenePlane.position.set({x:0, y:0, z:0});
}

function randomziePlaneGeometry(planeMesh,
  newWidth = guiWorld.plane.width, 
  newHeight = guiWorld.plane.height,
  newWidthSegnments = guiWorld.plane.widthSegments,
  newHeightSegments = guiWorld.plane.heightSegments) {

  planeMesh.geometry.dispose();
  let newPlaneGeometry = new THREE.PlaneGeometry(newWidth, newHeight,
    newWidthSegnments, newHeightSegments);

  createVertexColorAttributeInPlaneGeometry(newPlaneGeometry);

  planeMesh.geometry = newPlaneGeometry;
  
  randomizePlaneVerticiesPosAndAddOriginalPosArrayAndOffsetArray(planeMesh);  
}

function createVertexColorAttributeInPlaneGeometry(planeGeometry) {
  //Create vertex color attribute in geometry
  const colors = [];
  for (let i = 0; i < planeGeometry.attributes.position.count; i++) {
    //const element = array[i];
    colors.push(defaultColor.x, defaultColor.y, defaultColor.z);
  }

  //console.log(colors);

  planeGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));  
}

function randomizePlaneVerticiesPosAndAddOriginalPosArrayAndOffsetArray(planeMesh) {

  planeMesh.geometry.attributes.position.originalPosArray = [];
  planeMesh.geometry.attributes.position.offsetArray = [];
  const { array, originalPosArray, offsetArray } = planeMesh.geometry.attributes.position;
  
  for (let i = 0; i < array.length; i ++) 
  {
    if(i % 3 === 0)
    {
      const x = array[i];
      const y = array[i + 1];
      const z = array[i + 2];

      //Randomize vertex positions
      array[i] = x + (Math.random() - 0.5) * 0.2;
      array[i + 1] = y + (Math.random() - 0.5) * 0.25;
      array[i + 2] = z + (Math.random() - 0.5) * 0.5;          
    
      //Save original position in attribute
      originalPosArray.push(array[i]);
      originalPosArray.push(array[i + 1]);
      originalPosArray.push(array[i + 2]);
      
    }
    //Create random offset for each vertex pos (from 0 to 2pi)
    offsetArray.push(Math.random() * Math.PI * 2);
  }

  planeMesh.geometry.attributes.position.zBoostArray = [];
  const { zBoostArray } = planeMesh.geometry.attributes.position;
  
  for (let i = 0; i < array.length; i += 3) {
      zBoostArray.push(0); // initializing with zero offset
  }
}

function rotateMesh(meshToRotate, xDelta, yDelta, zDelta) {
  meshToRotate.rotation.x += xDelta;
  meshToRotate.rotation.y += yDelta;
  meshToRotate.rotation.z += zDelta;
}  

function onPointerMove(event){

  pointer.x = (event.clientX / innerWidth) * 2 - 1;
  pointer.y = -((event.clientY / innerHeight) * 2 - 1);
}

function animatePlaneVertexPositions(scenePlane, frameCounter) {
    const { array, originalPosArray, offsetArray, zBoostArray } = scenePlane.geometry.attributes.position;

    for (let i = 0; i < array.length; i += 3) {
      
        array[i] = originalPosArray[i] 
        + Math.cos(frameCounter + offsetArray[i]) * guiWorld.vertexAnimation.deltaX;
        array[i + 1] = originalPosArray[i + 1] 
        + Math.cos(frameCounter + offsetArray[i + 1]) * guiWorld.vertexAnimation.deltaY;
        array[i + 2] = originalPosArray[i + 2] 
        + Math.cos(frameCounter + offsetArray[i+ 2]) * guiWorld.vertexAnimation.deltaZ 
        + zBoostArray[i/3]; // Add the z boost here
    }

    scenePlane.geometry.attributes.position.needsUpdate = true;
}

function handleRaycasting(){

  raycaster.setFromCamera(pointer, camera);
  
  const raycastHitInfo = raycaster.intersectObject(scenePlane);

  if(raycastHitInfo.length > 0) {
    
      setRaycastHitPlaneGeometryVertexColor(raycastHitInfo);
  };

};

function setRaycastHitPlaneGeometryVertexColor(raycastHitInfo) {

  if (raycastHitInfo[0].object.geometry.hasAttribute('color') === true) {

      const { color, position } = raycastHitInfo[0].object.geometry.attributes;

      setVerticesColor(color, raycastHitInfo[0].face, highlightColor);

      color.needsUpdate = true;

      const hoverColor = new THREE.Vector3(highlightColor.x, highlightColor.y, highlightColor.z);

      GSAP.to(hoverColor, {
          x: defaultColor.x,
          y: defaultColor.y,
          z: defaultColor.z,
          duration: 1.5,
          ease: 'slow',
          onUpdate: () => {
              setVerticesColor(color, raycastHitInfo[0].face, hoverColor);
              adjustVerticesZBoost(position, raycastHitInfo[0].face, hoverColor); // New function call
          }
      });

  };
};

function adjustVerticesZBoost(positionAttribute, face, targetColor) {
  const potentialBoost = targetColor.length() * 0.05; 
  const effectiveBoost = Math.min(potentialBoost, guiWorld.vertexAnimation.zBoostMax);
  const vertexIndices = [face.a, face.b, face.c];

  vertexIndices.forEach(index => {
      positionAttribute.zBoostArray[index] += effectiveBoost;
      if (positionAttribute.zBoostArray[index] > guiWorld.vertexAnimation.zBoostMax) {
          positionAttribute.zBoostArray[index] = guiWorld.vertexAnimation.zBoostMax;
      }
  });
}

function decayZBoost(positionAttribute) {
  const decayAmount = 0.05;  // Adjust this value to control the speed of the decay
  for (let i = 0; i < positionAttribute.zBoostArray.length; i++) {
      if (positionAttribute.zBoostArray[i] > 0) {
          positionAttribute.zBoostArray[i] -= decayAmount;
          if (positionAttribute.zBoostArray[i] < 0) positionAttribute.zBoostArray[i] = 0;
      }
  }
  positionAttribute.needsUpdate = true;
}

function setVerticesColor(colorAttribute, face, targetColor){
  colorAttribute.setXYZ(face.a, targetColor.x, targetColor.y, targetColor.z);
  colorAttribute.setXYZ(face.b, targetColor.x, targetColor.y, targetColor.z);
  colorAttribute.setXYZ(face.c, targetColor.x, targetColor.y, targetColor.z);

  colorAttribute.needsUpdate = true;
}

function render(){

  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function initGui(){
  gui = new DATGUI.GUI();
  
  gui.add(guiWorld.plane, 'width', 1, 150).onChange(() => { randomziePlaneGeometry(scenePlane) });
  gui.add(guiWorld.plane, 'height', 1, 150).onChange(() => { randomziePlaneGeometry(scenePlane) });
  gui.add(guiWorld.plane, 'widthSegments', 1, 100).onChange(() => { randomziePlaneGeometry(scenePlane) });
  gui.add(guiWorld.plane, 'heightSegments', 1, 100).onChange(() => { randomziePlaneGeometry(scenePlane) });

  gui.add(guiWorld.vertexAnimation, 'deltaX', 0, 0.5);
  gui.add(guiWorld.vertexAnimation, 'deltaY', 0,  0.5);
  gui.add(guiWorld.vertexAnimation, 'deltaZ', 0,  0.5);
}   

function initControls(){

  new OrbitControls(camera, renderer.domElement);
}
