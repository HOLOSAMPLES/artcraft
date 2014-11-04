﻿if (!Detector.webgl) {
    Detector.addGetWebGLMessage();
    document.getElementById('container').innerHTML = "";
}


//scene
var TO_RADIANS = Math.PI / 180;
var container, stats;
var camera, scene, renderer;
var chisel;
var ambientLight, spotLight, pointLight;
var intersectionPoint, intersectNormal;
var group;
var SHADOW_MAP_WIDTH = 1024 * 2;
var SHADOW_MAP_HEIGHT = 1024 * 2;
var SCREEN_WIDTH = 1000;
var SCREEN_HEIGHT = 1000;
var properties;
var segmentFactors;
var lastChangedSegment = null;
var MaterialLibrary = {};
var cylinderMaterial;
var _rotateSwitch, _rotateSpeed = 0;
var _mouseDown;

var chipsList = [];
var chipsPool = new ObjectPool();

var cuttingList = [];
var cuttingPool = new ObjectPool();

var dustTexture;
var dustList = [];
var dustPool = new ObjectPool();

var chipsGeometry;
var metalGeometry;

var cylinder;
var activeMaterialType = "wood";
var mouse2d = new THREE.Vector3();
var _hasReleasedMouse = true;
var menuObjects = {};                   
var menuContiner;
var activeMenuItemId;
var isCrome;

//start engine and loading
$(document).ready(function () {
    mainInit();
});

function mainInit() {
    console.log("main init");
    isCrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
    var info = "";

    if (!isCrome) info += "Select a material, hold SPACE to speed up and left-click to start working. Consider switching to Chrome to hear the sound-effects while turning.";
    else info = "Turn up the volume, select a material, hold SPACE to speed up and left-click to start working.";

    info += "<br>Created by Einar Öberg (@inear) with three.js.";

    $("#info").html(info);

    properties = {

    };

    LIBRARY.Shaders.loadedSignal.add(onShadersLoaded);
    initShaderLoading();


    $(window).keydown(function (event) {
        if (event.which == 32) {
            //event.preventDefault();
            _rotateSwitch = true;
        }
    });

    $(window).keyup(function (event) {

        if (event.which == 32) {
           // event.preventDefault();
            _rotateSwitch = false;
        }
    });

    $("#container").mousedown(function (event) {
       // event.preventDefault();
        _mouseDown = true;
        lastChangedSegment = 0;

    });

    $("#container").mouseup(function (event) {
     //   event.preventDefault();
        _mouseDown = false;
        lastChangedSegment = null;
        _hasReleasedMouse = true;
    });

    $("#container").click(function (event) {
     //   event.preventDefault();


        if (activeMenuItemId)
            changeMaterial(activeMenuItemId);
    });
}

function onShadersLoaded() {

    chipsPool.createObject = createChips;
    cuttingPool.createObject = createCutting;
    dustPool.createObject = createDust;

    //initSounds();
    initEngine();
    initObjects();
    initMenu();

    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('mousemove', onDocumentMouseMove, false);
    onWindowResize();

}



function initEngine() {
    projector = new THREE.Projector();
    container = document.getElementById('container');
    scene = new THREE.Scene();

    camera = new LeiaCamera();//3
    camera.setLens(70, 43.25);
    camera.position.copy(_camPosition);//6
    camera.lookAt(_tarPosition);//7
    scene.add(camera);//8

    group = new THREE.Object3D();

    var dirLight = new THREE.DirectionalLight();
    dirLight.intensity = 0.8;
    dirLight.position.x = camera.position.x + 400;
    dirLight.position.y = camera.position.y + 200;
    dirLight.position.z = camera.position.z - 400;

    dirLight.lookAt(scene.position);

    dirLight.shadowCameraLeft = -900;
    dirLight.shadowCameraRight = 700;
    dirLight.shadowCameraTop = 450;
    dirLight.shadowCameraBottom = -480;
    dirLight.castShadow = true;
    scene.add(dirLight);


    var dirLight = new THREE.DirectionalLight();
    dirLight.intensity = 0.3;
    dirLight.position.x = camera.position.x - 400;
    dirLight.position.y = camera.position.y + 2400;
    dirLight.position.z = camera.position.z - 1200;
    dirLight.lookAt(scene.position);
    scene.add(dirLight);

    var dirLight = new THREE.DirectionalLight();
    dirLight.intensity = 0.3;
    dirLight.position.x = camera.position.x - 400;
    dirLight.position.y = camera.position.y - 2400;
    dirLight.position.z = camera.position.z - 200;
    dirLight.lookAt(scene.position);
    scene.add(dirLight);

    renderer = new LeiaWebGLRenderer({
        antialias: true,
        renderMode: _renderMode,
        shaderMode: _nShaderMode,
        devicePixelRatio: 1
    });//1
    renderer.Leia_setSize(SCREEN_WIDTH, SCREEN_HEIGHT);//2

    renderer.autoClear = true;
    renderer.sortObjects = false;

    renderer.shadowCameraNear = 3;
    renderer.shadowCameraFar = 4000;
    renderer.shadowCameraFov = 50;

    renderer.shadowMapBias = 0.039;
    renderer.shadowMapDarkness = 0.5;

    renderer.shadowMapEnabled = true;
    renderer.shadowMapSoft = true;

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    scene.rotation.y = 45 * TO_RADIANS;
}


function initMenu() {

    menuContiner = new THREE.Object3D();
    menuContiner.position.set(-600, -400, 0);
    scene.add(menuContiner);

    var cubeGeo = new THREE.SphereGeometry(100, 100, 100);
    cubeGeo.computeTangents();

    var metalMenu = menuObjects["metal"] = new THREE.Mesh(cubeGeo, MaterialLibrary.metalMenu);
    metalMenu.receiveShadow = false;
    menuContiner.add(metalMenu);


    var woodMenu = menuObjects["wood"] = new THREE.Mesh(cubeGeo, MaterialLibrary.woodMenu);
    woodMenu.receiveShadow = false;
    menuContiner.add(woodMenu);
    woodMenu.position.set(200, 0, 0);

    var stoneMenu = menuObjects["stone"] = new THREE.Mesh(cubeGeo, MaterialLibrary.stoneMenu);
    stoneMenu.receiveShadow = false;
    menuContiner.add(stoneMenu);
    stoneMenu.position.set(400, 0, 0);


}

function initObjects() {

   // dustTexture = THREE.ImageUtils.loadTexture("textures/dust.png", THREE.RGBAFormat);
    dustTexture = THREE.ImageUtils.loadTexture("resource/dust.png");
    scene.add(group);

    var woodUniforms = {
        DiffuseColour1: { type: "c", value: new THREE.Color(0xdbc6a9) },
        DiffuseColour2: { type: "c", value: new THREE.Color(0xc4ae87) },
        GrainCentre: { type: "v3", value: new THREE.Vector3(10, 5, 100) },
        GrainMult: { type: "f", value: 10 }

    };

    var finalWoodUniform = THREE.UniformsUtils.merge([THREE.ShaderLib["phong"].uniforms, woodUniforms]);

    var tex = THREE.ImageUtils.loadTexture("resource/treebark2.jpg");
    tex.mapping = THREE.UVMapping;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    finalWoodUniform.map.value = tex;
    //map: THREE.ImageUtils.loadTexture('https://holodevuserresource.s3.amazonaws.com/wood.jpg')
    console.log(tex);
    var params = {
        uniforms: finalWoodUniform,
        vertexShader: LIBRARY.Shaders.Wood.vertex,
        fragmentShader: LIBRARY.Shaders.Wood.fragment,
        lights: true
    };

    MaterialLibrary.wood = new THREE.ShaderMaterial(params);
    MaterialLibrary.woodMenu = new THREE.ShaderMaterial(params);

    var metalUniforms = {
        DiffuseColour1: { type: "c", value: new THREE.Color(0xeeeeee) },
        DiffuseColour2: { type: "c", value: new THREE.Color(0x777777) }
    };

    var finalMetalUniform = THREE.UniformsUtils.merge([THREE.ShaderLib["phong"].uniforms, metalUniforms]);
    params = {
        uniforms: finalMetalUniform,
        vertexShader: LIBRARY.Shaders.Metal.vertex,
        fragmentShader: LIBRARY.Shaders.Metal.fragment,
        lights: true
    };

    MaterialLibrary.metal = new THREE.ShaderMaterial(params);
    MaterialLibrary.metalMenu = new THREE.ShaderMaterial(params);

    var stoneUniforms = {
        DiffuseColour1: { type: "c", value: new THREE.Color(0x999999) },
        DiffuseColour2: { type: "c", value: new THREE.Color(0x222222) }
    };

    var finalStoneUniform = THREE.UniformsUtils.merge([THREE.ShaderLib["phong"].uniforms, stoneUniforms]);

    params = {
        uniforms: finalStoneUniform,
        vertexShader: LIBRARY.Shaders.Stone.vertex,
        fragmentShader: LIBRARY.Shaders.Stone.fragment,
        lights: true
    };

    MaterialLibrary.stone = new THREE.ShaderMaterial(params);
    MaterialLibrary.stoneMenu = new THREE.ShaderMaterial(params);


    var chiselMaterial = new THREE.MeshPhongMaterial({ color: 0x888888, ambient: 0x000000, specular: 0xffffff, shininess: 5, metal: true });

    cylinderMaterial = MaterialLibrary[activeMaterialType];


    cylinder = new Cylinder(cylinderMaterial, 200);
    cylinder.rotation.y = 90 * TO_RADIANS;

    cylinder.build();
    cylinder.receiveShadow = true;
    cylinder.castShadow = false;
    cylinder.geometry.dynamic = true;
    cylinder.geometry.computeFaceNormals();
    cylinder.geometry.computeVertexNormals();

    group.position.x = cylinder.totalLinks * cylinder.linkDist * -.5;

    segmentFactors = [];
    for (var i = 0; i < cylinder.totalLinks; i++) {
        segmentFactors.push(1);
    }

    group.add(cylinder);

    loader = new THREE.BinaryLoader(true);
    loader.load("resource/chisel_1.js", function (geo) { chiselLoaded(geo); });
}

function changeMaterial(type) {
    activeMaterialType = type;

    var tween = new TWEEN.Tween(cylinder.position)
        .to({ x: 2200 }, 500)

        .easing(TWEEN.Easing.Sinusoidal.EaseOut)
        .onUpdate(function () {
        })
        .onComplete(function () {

            cylinderMaterial = MaterialLibrary[type];
            cylinder.material = cylinderMaterial;
            cylinder.position.x = -2000;
            for (j = 0; j < cylinder.ring.length; j++) {
                segmentFactors[j] = 1;
                for (k = 0; k < cylinder.ring[j].length; k++) {
                    cylinder.ring[j][k].x = cylinder.ringOrigin[j][k].x;
                    cylinder.ring[j][k].y = cylinder.ringOrigin[j][k].y;
                }
            }
            cylinder.geometry.verticesNeedUpdate = true;
        });

    var tweenBack = new TWEEN.Tween(cylinder.position)
    .to({ x: 0 }, 500)
    .easing(TWEEN.Easing.Sinusoidal.EaseOut)
    .onUpdate(function () {
    });
    tween.chain(tweenBack);
    tween.start();

}

function spawnParticle(spawnX) {

    if (activeMaterialType == "metal")
        spawnCutting(spawnX);
    else if (activeMaterialType == "wood")
        spawnChips(spawnX);
    else if (activeMaterialType == "stone")
        spawnDust(spawnX);
}

//called from object pool
function createChips() {

    var chips = new THREE.Mesh(chipsGeometry, MaterialLibrary.wood);
    chips.receiveShadow = false;
    chips.doubleSided = false;
    chips.castShadow = false;

    chips.geometry.computeFaceNormals();

    return chips;
}

function spawnChips(spawnX) {

    spawnDelay++;

    if (spawnDelay < 3) {
        return;
    }

    spawnDelay = 0;

    var chipsMesh = chipsPool.getObject();
    chipsList.push(chipsMesh);
    chipsMesh.velocity = new THREE.Vector3(Math.random() * 15 - 7, 15, 15);

    chipsMesh.scale.x = 5 + Math.random() * 4;
    chipsMesh.scale.y = 5 + Math.random() * 1;
    chipsMesh.scale.z = 5 + Math.random() * 2;


    chipsMesh.rotationVelocity = new THREE.Vector3(Math.random() * 0.1, Math.random() * 0.1, Math.random() * 0.1);
    chipsMesh.rotation = new THREE.Euler(Math.PI * .5, Math.PI, Math.random() * Math.PI, THREE.Euler.DefaultOrder);

    chipsMesh.position = intersectionPoint.clone();
    chipsMesh.position.x = spawnX;
    scene.add(chipsMesh);
}

function updateChips() {

    var i = 0, max = chipsList.length;
    var chips;


    for (i = max - 1; i >= 0; i--) {
        chips = chipsList[i];
        chips.position.add(chips.velocity);
        chips.rotation.x += chips.rotationVelocity.x;
        chips.rotation.y += chips.rotationVelocity.y;
        chips.rotation.z += chips.rotationVelocity.z;

        if (chips.position.y > 400) {
            scene.remove(chips);
            chipsList.splice(i, 1);
        }
    }
}

//called from object pool
function createCutting() {

    var cutting = new THREE.Mesh(metalGeometry, MaterialLibrary.metal);
    cutting.receiveShadow = false;
    cutting.doubleSided = false;
    cutting.castShadow = false;

    cutting.geometry.computeFaceNormals();

    return cutting;
}

var spawnDelay = 0;
function spawnCutting(spawnX) {

    spawnDelay++;

    if (spawnDelay < 15) {
        return;
    }

    spawnDelay = 0;

    var cuttingMesh = cuttingPool.getObject();
    cuttingList.push(cuttingMesh);
    cuttingMesh.velocity = new THREE.Vector3(Math.random() * 15 - 7, 5, 5);


    cuttingMesh.scale.x = 0+ Math.random()*1;
    cuttingMesh.scale.y = 0+ Math.random()*1;
    cuttingMesh.scale.z = 0;

    cuttingMesh.rotationVelocity = new THREE.Vector3(Math.random() * 0.5, Math.random() * 0.0, Math.random() * 0.0);
    cuttingMesh.rotation = new THREE.Euler(Math.PI * .5, -Math.PI * Math.random(), Math.PI * .5, THREE.Euler.DefaultOrder);
    cuttingMesh.position.x = spawnX;

    scene.add(cuttingMesh);
}

function updateCuttings() {

    var i = 0, max = cuttingList.length;
    var cutting;

    for (i = max - 1; i >= 0; i--) {
        cutting = cuttingList[i];
        cutting.rotation.x += cutting.rotationVelocity.x;
        cutting.rotation.y += cutting.rotationVelocity.y;
        cutting.rotation.z += cutting.rotationVelocity.z;

        if (cutting.scale.z < 3 && intersectionPoint) {
            cutting.scale.x = cutting.scale.y = cutting.scale.z += .2;
            cutting.position = intersectionPoint.clone();
            cutting.position.z += 20;
        }
        else {
            cutting.position.add(cutting.velocity);
        }


        if (cutting.position.y > 400) {
            scene.remove(cutting);
            cuttingList.splice(i, 1);
        }
    }
}

//called from object pool
function createDust() {
    var s_mat = new THREE.SpriteMaterial({ map: dustTexture, fog: true, transparent: true });
    var s = new THREE.Sprite(s_mat);
    return s;
}

function spawnDust(spawnX) {

    /* spawnDelay++
 
     if( spawnDelay < 15 ) {
         return;
     }
 
     spawnDelay = 0;
 */
    var dustSprite = dustPool.getObject();
    dustList.push(dustSprite);
    dustSprite.velocity = new THREE.Vector3(Math.random() * 7 - 3, -15, 15);
    dustSprite.position = intersectionPoint.clone();
    dustSprite.scale.x = 3+ Math.random()*1;
    dustSprite.scale.y = 3+ Math.random()*1;
    dustSprite.scale.z = 3;
    dustSprite.opacity = 1;
    dustSprite.rotationVelocity = new THREE.Vector3(Math.random()*0.5,Math.random()*0.0,Math.random()*0.0);
    dustSprite.rotation = new THREE.Euler(Math.PI * .5, -Math.PI * Math.random(), Math.PI * .5, THREE.Euler.DefaultOrder);
    dustSprite.position.x = spawnX;
    dustSprite.position.z = 200;

    scene.add(dustSprite);
}

function updateDusts() {

    var i = 0, max = dustList.length;
    var dust;


    for (i = max - 1; i >= 0; i--) {
        dust = dustList[i];

        dust.opacity -= 0.02;

        dust.scale.x = dust.scale.y = dust.scale.z += 2;
        dust.position.add(dust.velocity);

        dust.rotation.x += dust.rotationVelocity.x;
        dust.rotation.y += dust.rotationVelocity.y;
        dust.rotation.z += dust.rotationVelocity.z;

        if (dust.opacity < 0) {
            scene.remove(dust);
          //  dustPool.returnObject(dust.poolId);
            dustList.splice(i, 1);
        }
    }
}


function chiselLoaded(geo) {

    var chiselMaterial = new THREE.MeshPhongMaterial({ color: 0x888888, ambient: 0x000000, specular: 0xffffff, shininess: 5, metal: true });

    chisel = new THREE.Mesh(geo, chiselMaterial);
    chisel.receiveShadow = true;
    chisel.castShadow = false;
    chisel.position.z = 100;
    chisel.position.x = 0;
    chisel.rotation.y = 180 * TO_RADIANS;
    chisel.scale.x = chisel.scale.y = chisel.scale.z = 5;
    scene.add(chisel);

    loader = new THREE.BinaryLoader(true);
    loader.load("resource/chips.js", function (geo) { chipsLoaded(geo); });

}

function chipsLoaded(geo) {

    chipsGeometry = geo;

    loader = new THREE.BinaryLoader(true);
    loader.load("resource/metal.js", function (geo) { metalLoaded(geo); });
}

function metalLoaded(geo) {

    metalGeometry = geo;
    initStartState();

}

function initStartState() {
    render();
    animate();
}

//game loop
function animate() {
    requestAnimationFrame(animate);
    render();
}

var time = 0;
var changedSegment = 0;
var changeDirection = 1;

function render() {

    checkCollisions();
    updateChips();
    updateCuttings();
    updateDusts();

    if (intersectionPoint) {
        chisel.position.x += (intersectionPoint.x - chisel.position.x) / 3;
        chisel.position.y += (intersectionPoint.y - chisel.position.y) / 3;
        chisel.position.z += (intersectionPoint.z - chisel.position.z) / 3;

        chisel.lookAt(new THREE.Vector3(intersectionPoint.x, 0, 0));

    }
    else if (!_mouseDown) {
        chisel.position.x += (0 - chisel.position.x) / 3;
        chisel.position.z += (100 - chisel.position.z) / 3;
        chisel.lookAt(new THREE.Vector3(chisel.position.x, 0, 0));
    }

    var pX, pY, pZ;
    var j;
    var newValue, currentSegment, segmentSteps;
    var cylinderWidth = cylinder.totalLinks * cylinder.linkDist;
    var pressure = 0.01;
    var relativeX;

    if (_mouseDown && _rotateSpeed > 0.1 && intersectionPoint != null) {

        relativeX = (intersectionPoint.x + cylinderWidth * .5) / cylinderWidth;

        currentSegment = Math.floor(relativeX * segmentFactors.length);

        if (_hasReleasedMouse) {
            lastChangedSegment = currentSegment;
            _hasReleasedMouse = false;
        }

        segmentSteps = currentSegment - lastChangedSegment;

        if (Math.abs(segmentSteps) > 0) {

            changedSegment = segmentSteps;

            while (segmentSteps != 0) {

                segmentSteps += (segmentSteps > 0) ? -1 : 1;

                changedSegment = currentSegment - segmentSteps;


                if (changedSegment > 0 && changedSegment < cylinder.totalLinks) {
                    if (segmentFactors[changedSegment] > 0.2) {
                        spawnParticle(cylinder.linkDist * cylinder.totalLinks * -.5 + changedSegment * cylinder.linkDist);
                    }
                    setRing(changedSegment, pressure);

                    if (changedSegment > 1) setRing(changedSegment - 1, pressure * 0.75);
                    if (changedSegment < cylinder.totalLinks - 1) setRing(changedSegment + 1, pressure * 0.75);

                    if (changedSegment > 2) setRing(changedSegment - 2, pressure * 0.5);
                    if (changedSegment < cylinder.totalLinks - 2) setRing(changedSegment + 2, pressure * 0.5);

                }
            }
        }
        else {

            changedSegment = currentSegment;

            if (changedSegment > 0 && changedSegment < cylinder.totalLinks) {
                if (segmentFactors[changedSegment] > 0.2) {
                    spawnParticle(cylinder.linkDist * cylinder.totalLinks * -.5 + changedSegment * cylinder.linkDist);
                }
                setRing(changedSegment, pressure);

                if (changedSegment > 1) setRing(changedSegment - 1, pressure * 0.7);
                if (changedSegment < cylinder.totalLinks - 1) setRing(changedSegment + 1, pressure * 0.7);

                if (changedSegment > 2) setRing(changedSegment - 2, pressure * 0.5);
                if (changedSegment < cylinder.totalLinks - 2) setRing(changedSegment + 2, pressure * 0.5);

            }
        }
        cylinder.geometry.verticesNeedUpdate = true;

        lastChangedSegment = currentSegment;
    }



    if (_rotateSwitch) {
        if (_rotateSpeed < 0.4) {
            _rotateSpeed += 0.05;
        }
    }
    else {
        _rotateSpeed *= 0.95;
    }

    group.rotation.x += _rotateSpeed;
    renderer.setClearColor(new THREE.Color().setRGB(1.0, 1.0, 1.0));
    renderer.Leia_render(scene, camera, undefined, undefined, _holoScreenScale, _camFov, _messageFlag);//4
    TWEEN.update();
}




function setRing(changedSegment, pressure) {
    var newValue = segmentFactors[changedSegment];
    if (newValue < pressure) return;

    pressure *= newValue;


    newValue -= pressure;

    if (newValue < 0.2) newValue = 0.2;



    for (j = 0; j < _branchSegments; j++) {
        cylinder.ring[changedSegment][j].x = cylinder.ringOrigin[changedSegment][j].x * newValue ;
        cylinder.ring[changedSegment][j].y = cylinder.ringOrigin[changedSegment][j].y * newValue ;
    }

    segmentFactors[changedSegment] = newValue;
}


function checkCollisions() {

    var vector = mouse2d.clone();
    projector.unprojectVector(vector, camera);
    var r = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());
    //check cylinder collision
    var c = r.intersectObject(cylinder);

    if (c.length > 0 && c[0].point) {
        intersectionPoint = c[0].point;
        intersectNormal = c[0].face.normal;
    }
    else {
        intersectionPoint = null;
        intersectNormal = null;
        $("body").css("cursor", "default");
    }

    var foundMenuItem = false;

    //check menu
    for (var id in menuObjects) {

        var c = r.intersectObject(menuObjects[id]);

        if (c.length > 0 && c[0].point) {
            $("body").css("cursor", "pointer");
            menuOver(id);
            foundMenuItem = true;
        }
        else {
            menuOut(id);
        }
    }

    if (foundMenuItem)
        $("body").css("cursor", "pointer");
    else {
        $("body").css("cursor", "default");
        activeMenuItemId = null;
    }

}

function menuOver(id) {

    activeMenuItemId = id;

    menuObjects[id].position.z = 20;

    var tween = new TWEEN.Tween(menuObjects[id].position)
        .to({ z: 20 }, 500)
        .easing(TWEEN.Easing.Sinusoidal.EaseInOut)
        .onUpdate(function () {
            menuObjects[id].rotation.y += 0.005;
        }).start();

}

function menuOut(id) {

    menuObjects[id].position.z = 0;
}

function onDocumentMouseMove(event) {
  //  event.preventDefault();
    mouse2d.x = ((event.clientX - $("#container").offset().left) / SCREEN_WIDTH) * 2 - 1;
    mouse2d.y = -(((event.clientY) - $("#container").offset().top) / SCREEN_HEIGHT) * 2 + 1;
}

function onWindowResize() {

    SCREEN_WIDTH = window.innerWidth;
    SCREEN_HEIGHT = window.innerHeight;

    //renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
    renderer.Leia_setSize(SCREEN_WIDTH, SCREEN_HEIGHT);//5

    camera.aspect = SCREEN_WIDTH / SCREEN_HEIGHT;
    camera.updateProjectionMatrix();

    var leftPos = window.innerWidth * .5 - SCREEN_WIDTH * .5;
    var topPos = window.innerHeight * .5 - SCREEN_HEIGHT * .5;

    if (leftPos < 200) leftPos = 200;
    if (topPos < -100) topPos = -100;

    $("#container").css({ left: 0, top: 0 });
}

function setMode(mode) {
    renderer.setRenderMode(mode);
}
function setResolution(width, height) {
    var windowW = width;
    var windowH = height;
    renderer.Leia_setSize(windowW, windowH);//5
}

document.onkeydown = function (event) {
    if (event && event.keyCode == 73) {

        var strValue = document.body.style.marginTop;
        var data = parseInt(strValue);
        if (strValue == "") {
            data = 0;
        }
        data = data - 1;
        document.body.style.marginTop = data + "px";
    }
    if (event && event.keyCode == 74) {
        var strValue = document.body.style.marginLeft;
        var data = parseInt(strValue);
        if (strValue == "") {
            data = 0;
        }
        data = data - 1;
        document.body.style.marginLeft = data + "px";
    }
    if (event && event.keyCode == 75) {
        var strValue = document.body.style.marginTop;
        var data = parseInt(strValue);
        if (strValue == "") {
            data = 0;
        }
        data = data + 1;
        document.body.style.marginTop = data + "px";
    }
    if (event && event.keyCode == 76) {
        var strValue = document.body.style.marginLeft;
        var data = parseInt(strValue);
        if (strValue == "") {
            data = 0;
        }
        data = data + 1;
        document.body.style.marginLeft = data + "px";
    }

};