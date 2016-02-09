/**
 * Created by h139418 on 05.11.2015.
 */
var renderer = new THREE.WebGLRenderer();
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000000 );
var controls = new THREE.FlyControls(camera);
var dLight = new THREE.DirectionalLight(0xf0f0f0, 0.5);
var aLight = new THREE.AmbientLight(0xffffff);



window.onload = function() {

    init();

    test();

    render();

};

function render() {
    requestAnimationFrame( render );

    //TODO - animation

    renderer.render( scene, camera );
}

function init(){

    //Initialize WebGL
    renderer.setSize( window.outerWidth, window.innerHeight );
    window.addEventListener( 'resize', onWindowResize(renderer), false );
    document.body.appendChild( renderer.domElement );

    //Lights
    scene.add(dLight);
    scene.add(aLight);

    //Controls
    controls.movementSpeed = 1000;
    controls.rollSpeed = Math.PI / 4;
    controls.autoForward = false;
    controls.dragToLook = true;
}

function test(){

}