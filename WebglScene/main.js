/**
 * Created by Christer Steinfinsbø on 13.10.2015.
 *
 *
 */
"use strict";

var cameraObject = new THREE.Object3D();
cameraObject.name = "CameraObject";
var container, stats;
var renderer = new THREE.WebGLRenderer( { antialias: true } );
var scene = new THREE.Scene();
var cameraAircraft = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 50, 100000 );
var cameraCircle = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 50, 100000 );
var activeCamera = cameraAircraft;
cameraObject.add(cameraAircraft);
scene.add(cameraCircle);
cameraCircle.translateZ(150);
cameraCircle.translateY(40);
cameraAircraft.translateZ(150);
cameraAircraft.translateY(40);
scene.add(cameraObject);
var controls = new THREE.FlyControls(cameraObject);
var clock = new THREE.Clock();
var water;
var ellipse;
var dLight = new THREE.DirectionalLight(0xf0f0f0, 0.8);
//var sLight = new THREE.SpotLight(0xf0f0f0);
//cameraObject.add(sLight);

var terrainData, terrainMesh, terrainTexture;

var worldWidth = 512, worldDepth = 512,
    worldHalfWidth = worldWidth / 2, worldHalfDepth = worldDepth / 2;

var modelsArray;

var particle, particles, particleSystem, particleCount;

var composer, effectBloom;

var spriteGroup;

window.onload = function(){

    container = document.createElement('div');
    document.body.appendChild(container);

    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    container.appendChild( stats.domElement );

    //Initialize WebGL
    renderer.setSize( window.outerWidth, window.innerHeight );
    window.addEventListener( 'resize', onWindowResize(renderer), false );
    document.body.appendChild( renderer.domElement );


    // "Enable shadowmaps"
    renderer.shadowMapEnabled = true;
    renderer.shadowMapSoft = false;
    renderer.shadowMapType = THREE.PCFSoftShadowMap;

    //Controls
    controls.movementSpeed = 1000;
    controls.rollSpeed = Math.PI / 4;
    controls.autoForward = false;
    controls.dragToLook = true;

    // Lights
    dLight.position.set( -100, 1500, 0 );
    dLight.castShadow = true;
    dLight.shadowCameraLeft = -5000;
    dLight.shadowCameraRight = 5000;
    dLight.shadowCameraTop = 5000;
    dLight.shadowCameraBottom = -5000;
    dLight.shadowCameraFar = 2000;
    dLight.shadowCameraNear = 100;
    dLight.shadowMapWidth = 4096;
    dLight.shadowMapHeight = 4096;
    scene.add(dLight);

    var aLight = new THREE.AmbientLight(0x1f1f1f);
    scene.add(aLight);


    //Fog
    scene.fog = new THREE.FogExp2(0x77aacc, 0.0001);

    createCurve();

    generateTerrain();
    generateOcean();
    generateSkybox();


    var mapHeight = THREE.ImageUtils.loadTexture( "img/NormalMap.png" );

    mapHeight.anisotropy = 4;
    mapHeight.repeat.set( 0.998, 0.998 );
    mapHeight.offset.set( 0.001, 0.001 );
    mapHeight.wrapS = mapHeight.wrapT = THREE.RepeatWrapping;
    mapHeight.format = THREE.RGBFormat;

    var material = new THREE.MeshPhongMaterial( {
        map: THREE.ImageUtils.loadTexture("img/stoneText.jpg"),
        specular: 0x222222,
        shininess: 25,
        bumpMap: mapHeight,
        bumpScale: 20
    } );
    var sphere = new THREE.Mesh(
        new THREE.SphereGeometry(10,50,50),
        material
    );
    //scene.add(sphere);


    //Models

    var stonesModels = [
        'models/Stone/stoneHigh.obj',
        'models/Stone/stoneMidHigh.obj',
        'models/Stone/stoneMid.obj',
        'models/Stone/stoneLowMid.obj',
        'models/Stone/stoneLow.obj'
    ];
    generateModels(stonesModels, '', 1, material);


    var box = new THREE.Mesh(
        new THREE.BoxGeometry(10,10,10,10,10,10),
        new THREE.MeshBasicMaterial({color: 0x9999ff})
    );
    var clone = box.clone();
    clone.position.y = -100;
    scene.add(box);
    scene.add(clone);


    // ParticleSystem
    generateParticles();



    generateAircraft();

    bloomEffect();

    // Animation loop
    function render() {
        //var delta = clock.getDelta();
        requestAnimationFrame( render );
        stats.update();
        updateParticles();

        water.material.uniforms.time.value += 1.0 / 60.0;
        water.render();
        if(activeCamera === cameraCircle){cameraCircle.update()};
        controls.update(clock.getDelta());
        scene.updateMatrixWorld();
        scene.traverse(function (object) {
            if(object instanceof THREE.LOD){
                object.update(activeCamera);
            }
        });

        /*
        for(var i = 0; i < spriteGroup; i++){
            spriteGroup.children[i].material.rotation += 0.01;
        }
        */

        //renderer.clear();
        //composer.render(0.01);
        renderer.render( scene, activeCamera );
    }
    render();

};


function onWindowResize(renderer){
    return function updateWindow(){
        var width = window.innerWidth;
        var height = window.innerHeight;

        if ((width / height) < 1.77) {
            width = height * 1.77;
        }
        else {
            height = width / 1.77;
        }
        renderer.setSize(width, height);

        //composer.reset();
    }
}

function generateSkybox(){
    var path = "img/SkyBox/";
    var format = '.jpg';
    var urls = [
        path + 'right' + format, path + 'left' + format,
        path + 'top' + format, path + 'bottom' + format,
        path + 'front' + format, path + 'back' + format
    ];

    var shader = THREE.ShaderLib[ "cube" ];
    shader.uniforms[ "tCube" ].value = THREE.ImageUtils.loadTextureCube( urls );

    var material = new THREE.ShaderMaterial( {

            fragmentShader: shader.fragmentShader,
            vertexShader: shader.vertexShader,
            uniforms: shader.uniforms,
            depthWrite: false,
            side: THREE.BackSide


        } );

        scene.add(new THREE.Mesh( new THREE.BoxGeometry( 100000, 100000, 100000 ), material ));
}

function generateTerrain(){
    var heightMapImage = new Image();

    heightMapImage.onload = function() {

        terrainData = getPixelValues(heightMapImage, 'r');
        worldWidth = heightMapImage.width;
        worldDepth = heightMapImage.height;
        worldHalfWidth = Math.floor(worldWidth / 2);
        worldHalfDepth = Math.floor(worldDepth / 2);


        // Not required to use the generated texture
        terrainTexture = new THREE.CanvasTexture(generateTexture(terrainData, worldWidth, worldDepth));
        terrainTexture.wrapS = THREE.ClampToEdgeWrapping;
        terrainTexture.wrapT = THREE.ClampToEdgeWrapping;

        //
        // Generate terrain geometry and mesh
        //

        var heightMapGeometry = new HeightMapBufferGeometry(terrainData, worldWidth, worldDepth);
        // We scale the geometry to avoid scaling the node, since scales propagate.
        heightMapGeometry.scale(50 * worldWidth, 1000, 50 * worldDepth);

        terrainMesh = new HeightMapMesh(heightMapGeometry, new THREE.MeshPhongMaterial({map: terrainTexture}));
        terrainMesh.name = "terrain";
        terrainMesh.castShadow = true;
        terrainMesh.receiveShadow = true;
        terrainMesh.translateY(-50);
        scene.add(terrainMesh);

        generateBillboard();
        generateModels('models/untitled.obj', 'models/untitled.mtl', 100, undefined);

    };
    heightMapImage.src = "img/firstheightmap.jpg";
}

function generateBillboard(){
    //Billboard
    spriteGroup = new THREE.Group();
    var map = THREE.ImageUtils.loadTexture( "img/Wild-Grass-Sprite.png" );
    var material = new THREE.SpriteMaterial( { map: map, color: 0xffffff, fog: true } );
    var sprite = new THREE.Sprite( material );
    sprite.scale.set(10,10,10);
    //sprite.position.y = terrainMesh.getHeightAtPoint(new THREE.Vector3(sprite.position.x,0,sprite.position.z));
    //sprite.translateZ(10);
    for(var i = 0; i < 2000; i ++){
        var temp = sprite.clone();
        var placed = false;
        do{
        temp.position.x = 5000 - Math.random() * 10000;
        temp.position.z = 5000 - Math.random() * 10000;
        var point = terrainMesh.getHeightAtPoint(new THREE.Vector3(temp.position.x, 0, temp.position.z));
        if ( point > 50){
            temp.position.y = point;
            placed = true;
        }
        temp.translateZ(10);
        temp.position.y = terrainMesh.getHeightAtPoint(new THREE.Vector3(temp.position.x,0,temp.position.z));
        }while(!placed);
        spriteGroup.add(temp);
        //scene.add(temp);
    }
    scene.add(spriteGroup);
}

function generateWater(){
    var geometry2 = new THREE.PlaneGeometry(100000,100000,255,255);
    var texture2 = THREE.ImageUtils.loadTexture( 'img/Water/water2_d.png' );
    texture2.wrapS = THREE.RepeatWrapping;
    texture2.wrapT = THREE.RepeatWrapping;
    texture2.repeat.set(100,100);
    var bumpMap = THREE.ImageUtils.loadTexture( 'img/bmp.jpg');
    bumpMap.anisotropy = 4;
    bumpMap.repeat.set(100,100);
    bumpMap.offset.set( 0.001, 0.001 );
    bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
    bumpMap.format = THREE.RGBFormat;
    var url = [ 'img/sand.jpg','img/sand.jpg',
        'img/sand.jpg', 'img/sand.jpg',
        'img/sand.jpg', 'img/sand.jpg'];
    var sandText = THREE.ImageUtils.loadTextureCube(url, THREE.CubeRefractionMapping);
    var material2 = new THREE.MeshPhongMaterial( {
        map: texture2,
        envMap: sandText,
        shininess: 24,
        specular: 0x222222,
        bumpMap: bumpMap,
        bumpScale: 100,
        refractionRatio: 0.1

    } );

    var plane2 = new THREE.Mesh( geometry2, material2 );
    plane2.rotateX(-Math.PI/2);
    plane2.translateZ(50);

    scene.add(plane2);
}

function generateModels(obj, mat, count, material){

    var onProgress = function ( xhr ) {
        if ( xhr.lengthComputable ) {
            var percentComplete = xhr.loaded / xhr.total * 100;
            console.log( Math.round(percentComplete, 2) + '% downloaded' );
        }
    };

    var onError = function ( xhr ) {
    };


    THREE.Loader.Handlers.add( /\.dds$/i, new THREE.DDSLoader() );



    if(material === undefined){
        var loader = new THREE.OBJMTLLoader();
        var group = new THREE.Object3D();
        loader.load( obj, mat, function ( object ) {
        var temp;
        object.scale.x = object.scale.y = object.scale.z = 10;
            object.traverse(function (child) {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                }
            });

        for (var i = 0; i < count; i++) {
            temp = object.clone();
            var placed = false;
            do{
                temp.position.x = 5000 - Math.random() * 10000;
                temp.position.z = 5000 - Math.random() * 10000;
                var point = terrainMesh.getHeightAtPoint(new THREE.Vector3(temp.position.x, 0, temp.position.z));
                if (point < 500 && point > 50){
                    temp.position.y = point;
                    placed = true;
                }
            }while(!placed);
            group.add(temp);

            //scene.add(temp);
        }
        //object.position.y = terrainMesh.getHeightAtPoint(new THREE.Vector3(i,0,i));
        scene.add(group);
        //scene.add( object );

        }, onProgress, onError );
    }else{
        var manager = new THREE.LoadingManager();
        manager.onLoad = function (item, loaded, total){
            console.log(item);
            for(var i = 0; i < meshes.length; i++){
                lod.addLevel(meshes[i], nm[i]);
            }
            //lod.scale.set(200,200,200);

            lod.position.x = 0;
            lod.position.z = 0;
            lod.position.y = 100; //terrainMesh.getHeightAtPoint(new THREE.Vector3(object.position.x, 0, object.position.z));


            lod.updateMatrix();
            lod.matrixAutoUpdate = false;
            lod.castShadow = true;
            scene.add( lod );
        }
        var loader = new THREE.OBJMTLLoader(manager);
        var nm = [1000, 1500, 2000, 2500, 3000];
        var meshes = [];
        var lod;
        lod = new THREE.LOD();
        for(var i = 0; i < obj.length; i++){
            loader.load( obj[i],mat,function( object) {
                    object.scale.set(200,200,200);
                    object.traverse(function (child) {
                        if (child instanceof THREE.Mesh) {
                            child.material = material;
                            child.castShadow = true;
                        }
                    });
                    meshes.push(object);

                    object.updateMatrix();
                    object.matrixAutoUpdate = false;
                }, onProgress, onError );



        }





    }
}

function getPixelValues(domImage, pixelComponents) {
    "use strict";
    var canvas = document.createElement('canvas');
    canvas.width = domImage.width;
    canvas.height = domImage.height;

    var context2d = canvas.getContext('2d');
    context2d.drawImage(domImage, 0, 0, domImage.width, domImage.height);

    var imageData = context2d.getImageData(0, 0, domImage.width, domImage.height);

    var componentExtractor = [];

    if (pixelComponents === undefined) {
        pixelComponents = 'rgba';
    }

    if (pixelComponents === 'r') { // Could extend this to other kinds of component extractors (eg. 'g', 'b','rb')
        componentExtractor = [0];
    } else if (pixelComponents === 'rg') {
        componentExtractor = [0,1];
    } else if (pixelComponents === 'rgb') {
        componentExtractor = [0,1,2];
    }else if (pixelComponents === 'rgba') {
        componentExtractor = [0,1,2,3];
        // return imageData.data;
    } else {
        console.error("unknown color component type");
        return [];
    }

    var imageSize = imageData.height * imageData.width;
    console.log(imageSize, imageData.data.length, imageData.data.length/4);
    var numComponents = componentExtractor.length;

    var pixelData = new Uint8ClampedArray(imageSize * numComponents);

    for (var i= 0, i4 = 0; i < imageSize; i++, i4 += 4) {
        for (var componentIdx = 0; componentIdx < numComponents; componentIdx++) {
            pixelData[i*numComponents + componentIdx] = imageData.data[i4 + componentExtractor[componentIdx]];
        }
    }

    return pixelData;
}
function generateOcean(){
    var waterNormals = new THREE.ImageUtils.loadTexture( 'img/waternormals.jpg' );
    waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;

    water = new THREE.Water( renderer, activeCamera, scene, {
        textureWidth: 512,
        textureHeight: 512,
        waterNormals: waterNormals,
        alpha: 	1.0,
        sunDirection: dLight.position.clone().normalize(),
        sunColor: 0xffffff,
        waterColor: 0x001e0f,
        distortionScale: 50.0,
        fog:true,
        polygonOffset: true,
        depthTest: true,
        depthWrite: false,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 0.1
    } );

    var mirrorMesh = new THREE.Mesh(
        new THREE.PlaneBufferGeometry( 100000, 100000 ),
        water.material
    );

    mirrorMesh.add( water );
    mirrorMesh.rotation.x = - Math.PI * 0.5;
    scene.add( mirrorMesh );
}


function generateTexture( data, width, height ) {

    var canvas, canvasScaled, context, image, imageData,
        level, diff, vector3, sun, shade;

    vector3 = new THREE.Vector3( 0, 0, 0 );

    sun = new THREE.Vector3( 1, 1, 1 );
    sun.normalize();

    canvas = document.createElement( 'canvas' );
    canvas.width = width;
    canvas.height = height;

    context = canvas.getContext( '2d' );
    context.fillStyle = '#000';
    context.fillRect( 0, 0, width, height );

    image = context.getImageData( 0, 0, canvas.width, canvas.height );
    imageData = image.data;

    for ( var i = 0, j = 0, l = imageData.length; i < l; i += 4, j ++ ) {

        vector3.x = data[ j - 2 ] - data[ j + 2 ];
        vector3.y = 2;
        vector3.z = data[ j - width * 2 ] - data[ j + width * 2 ];
        vector3.normalize();

        shade = vector3.dot( sun );

        imageData[ i ] = ( 96 + shade * 128 ) * ( 0.5 + data[ j ] * 0.007 );
        imageData[ i + 1 ] = ( 32 + shade * 96 ) * ( 0.5 + data[ j ] * 0.007 );
        imageData[ i + 2 ] = ( shade * 96 ) * ( 0.5 + data[ j ] * 0.007 );
    }

    context.putImageData( image, 0, 0 );

    // Scaled 4x

    canvasScaled = document.createElement( 'canvas' );
    canvasScaled.width = width * 4;
    canvasScaled.height = height * 4;

    context = canvasScaled.getContext( '2d' );
    context.scale( 4, 4 );
    context.drawImage( canvas, 0, 0 );

    image = context.getImageData( 0, 0, canvasScaled.width, canvasScaled.height );
    imageData = image.data;

    for ( var i = 0, l = imageData.length; i < l; i += 4 ) {

        var v = ~~ ( Math.random() * 5 );

        imageData[ i ] += v;
        imageData[ i + 1 ] += v;
        imageData[ i + 2 ] += v;

    }

    context.putImageData( image, 0, 0 );

    return canvasScaled;

}

function generateAircraft(){
    var onProgress = function ( xhr ) {
        if ( xhr.lengthComputable ) {
            var percentComplete = xhr.loaded / xhr.total * 100;
            console.log( Math.round(percentComplete, 2) + '% downloaded' );
        }
    };

    var onError = function ( xhr ) {
    };
    var loader = new THREE.OBJMTLLoader();
    loader.load( 'models/fa-22_raptor/FA-22_Raptor.obj', 'models/fa-22_raptor/FA-22_Raptor.mtl', function ( object ) {

        object.scale.x = object.scale.y = object.scale.z = 10;

        modelsArray = object;
        //object.position.y = terrainMesh.getHeightAtPoint(new THREE.Vector3(i,0,i));
        modelsArray.rotateX(-Math.PI/2);
        modelsArray.traverse(function (child) {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true;
            }
        });
        cameraObject.add( modelsArray );

    }, onProgress, onError );
}




function createCurve(){

    ellipse = new THREE.EllipseCurve(
        0,  0,            // ax, aY
        5000, 5000,           // xRadius, yRadius
        0,  2 * Math.PI,  // aStartAngle, aEndAngle
        false,            // aClockwise
        0                 // aRotation
    );



}

var cameraIndex = 0;
cameraCircle.update = function(){
    var test = ellipse.getPointAt(cameraIndex);
    test = new THREE.Vector3(test.x, 1500, test.y);

    cameraCircle.position.copy(test);
    cameraCircle.lookAt(new THREE.Vector3(0,0,0));
    cameraIndex = (cameraIndex+0.0005)% 1;
};

window.addEventListener("keydown", function(e){
    /*
     keyCode: 8
     keyIdentifier: "U+0008"
     */
    if(e.keyCode == 77){
        toggelCamera();
        water.camera = activeCamera;
    }
});

function toggelCamera(){
    if(activeCamera === cameraCircle){
        activeCamera = cameraAircraft;
    }else{
        activeCamera = cameraCircle;
    }
}

function generateParticles(){
    // create the particle variables
    particles = new THREE.Geometry();
    particleCount = 10000;
    var pMaterial = new THREE.ParticleBasicMaterial({
            color: 0xFFFFFF,
            size: 10,
            opacity: 0.5,
            map: THREE.ImageUtils.loadTexture(
                "img/waterdrop1.png"
            ),
            blending: THREE.AdditiveBlending,
            transparent: true,
        });
    // now create the individual particles
    for(var p = 0; p < particleCount; p++) {

        // create a particle with random
        var pX = Math.random() * (10000 - (-10000)) + (-10000),
            pY = 5000,
            pZ = Math.random() * (10000 - (-10000)) + (-10000);
        particle = new THREE.Vector3(pX,pY,pZ);


        // create a velocity vector
        particle.velocity = new THREE.Vector3(
            0,				// x
            Math.random() * (50 - 10) + 50,	// y
            0);				// z

        particles.vertices.push(particle);
        // add it to the geometry
        //scene.add(particle);
    }

    // create the particle system
    particleSystem = new THREE.ParticleSystem(
        particles,
        pMaterial);

    particleSystem.sortParticles = true;
    particleSystem.name = "particleSystem";
    // add it to the scene
    scene.add(particleSystem);
}

function updateParticles(){
    var vertices = particleSystem.geometry.vertices;
    vertices.forEach(function(v){
        v.y -= v.velocity.y;

        if(v.y <= -200){
            v.y = 5000;
        }
    });
    particleSystem.geometry.verticesNeedUpdate = true;
}

function bloomEffect(){

    var renderModel = new THREE.RenderPass(scene, activeCamera);
    effectBloom = new THREE.BloomPass(1.25);
    var effectCopy = new THREE.ShaderPass(THREE.CopyShader);
    effectCopy.renderToScreen = true;

    composer = new THREE.EffectComposer(renderer);

    composer.addPass(renderModel);
    composer.addPass(effectBloom);
    composer.addPass(effectCopy);
}