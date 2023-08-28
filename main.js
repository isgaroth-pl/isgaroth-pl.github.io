//import './style.css'
console.log('starting app')

    import * as THREE from './libs/three.module.js';
    import { OrbitControls } from './libs/OrbitControls.js';
    import * as DATGUI from './libs/dat.gui.module.js';
    import STATS from './libs/stats.module.js';
    import GSAP from './libs/gsap-core.js';

    let scene, camera, raycaster, renderer;
    let gui, stats, container;
    let scenePlane, sceneFrontLight, sceneBackLight;
    let frameCounter = 0;
    const guiWorld = {
      plane: { width: 30, height: 30, widthSegments: 40, heightSegments: 40 },
      vertexAnimation: { deltaX: 0.04, deltaY: 0.04, deltaZ: 0.04 }
    };

    const pointer = new THREE.Vector2();
    const defaultColor = new THREE.Vector3(0, 0.19, 0.4);
    const highlightColor = new THREE.Vector3(0.1, 0.5, 1);

    start();
    update();

    function start(){

      console.log('starting')

      container = document.createElement( 'div' );
			document.body.appendChild( container );

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(75, (innerWidth / innerHeight), 0.1, 1000);
      raycaster = new THREE.Raycaster();
      renderer = new THREE.WebGLRenderer();

      renderer.setSize(innerWidth, innerHeight);
      container.appendChild(renderer.domElement);

      initGui();
      initStats();
      initControls();      
      
      camera.position.z = 8;

      createScenePlane();
      createSceneLight(sceneFrontLight, 0.3, 1);
      createSceneLight(sceneBackLight, 0.3, -1);
      
      addEventListener('mousemove', onPointerMove);
    }

    //#region Init Functions
    function initStats(){

      stats = new STATS();
      container.appendChild( stats.dom );
    }

    function initGui(){
      gui = new DATGUI.GUI();
      
      gui.add(guiWorld.plane, 'width', 1, 50).onChange(() => { randomziePlaneGeometry(scenePlane) });
      gui.add(guiWorld.plane, 'height', 1, 50).onChange(() => { randomziePlaneGeometry(scenePlane) });
      gui.add(guiWorld.plane, 'widthSegments', 1, 100).onChange(() => { randomziePlaneGeometry(scenePlane) });
      gui.add(guiWorld.plane, 'heightSegments', 1, 100).onChange(() => { randomziePlaneGeometry(scenePlane) });

      gui.add(guiWorld.vertexAnimation, 'deltaX', 0, 0.5);
      gui.add(guiWorld.vertexAnimation, 'deltaY', 0,  0.5);
      gui.add(guiWorld.vertexAnimation, 'deltaZ', 0,  0.5);
    }    

    function initControls(){

      new OrbitControls(camera, renderer.domElement);
    }

    //#region scene plane creation
    function createScenePlane(){

      const planeGeometry = new THREE.PlaneGeometry(guiWorld.plane.width,
         guiWorld.plane.height, guiWorld.plane.widthSegments, guiWorld.plane.heightSegments);
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
    }
    //#endregion

    function createSceneLight(light, lightYPoz, lightZPos)
    {
      light = new THREE.DirectionalLight(0x404040, 3);
      light.position.set(0, lightYPoz, lightZPos);
      scene.add(light);
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
    //#endregion

    function update()
    {
      frameCounter += 0.01;

      requestAnimationFrame(update);
      
      animatePlaneVertexPositions(scenePlane, frameCounter);
      //rotateMesh(scenePlane, 0, 0.005, 0);
      
      handleRaycasting();

      render();

      stats.update();
    }

    //#region  Update Functions
    function animatePlaneVertexPositions(scenePlane, frameCounter){

      const { array, originalPosArray, offsetArray } = scenePlane.geometry.attributes.position;

      for (let i = 0; i < array.length; i += 3) {
        
        array[i] = originalPosArray[i] 
        + Math.cos(frameCounter + offsetArray[i]) * guiWorld.vertexAnimation.deltaX;
        array[i + 1] = originalPosArray[i + 1] 
        + Math.cos(frameCounter + offsetArray[i + 1]) * guiWorld.vertexAnimation.deltaY;
        array[i + 2] = originalPosArray[i + 2] 
        + Math.cos(frameCounter + offsetArray[i+ 2]) * guiWorld.vertexAnimation.deltaZ;
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
    
    function setRaycastHitPlaneGeometryVertexColor(raycastHitInfo){

      if(raycastHitInfo[0].object.geometry.hasAttribute('color') === true){

        const { color } = raycastHitInfo[0].object.geometry.attributes;
        
        setVerticesColor(color, raycastHitInfo[0].face, highlightColor);

        color.needsUpdate = true;

        const hoverColor = new THREE.Vector3(highlightColor.x, highlightColor.y, highlightColor.z);

        GSAP.to(hoverColor, {
          x: defaultColor.x,
          y: defaultColor.y,
          z: defaultColor.z,
          duration: 1.5,
          ease: 'slow',
          onUpdate: () => { setVerticesColor(color, raycastHitInfo[0].face, hoverColor) }
        });
        
      };
    };

    function setVerticesColor(colorAttribute, face, targetColor){
      colorAttribute.setXYZ(face.a, targetColor.x, targetColor.y, targetColor.z);
      colorAttribute.setXYZ(face.b, targetColor.x, targetColor.y, targetColor.z);
      colorAttribute.setXYZ(face.c, targetColor.x, targetColor.y, targetColor.z);

      colorAttribute.needsUpdate = true;
    }

    function render(){

      renderer.render(scene, camera);
    }
    //#endregion
