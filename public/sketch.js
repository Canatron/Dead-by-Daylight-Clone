var camera, scene, renderer, controls, audio;

var objects = [];
var objectStats = [];

var raycaster;

var canvas = document.getElementById( 'layer2' );
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
c = canvas.getContext("2d");

var blocker = document.getElementById( 'blocker' );
var instructions = document.getElementById( 'instructions' );
var slider1 = document.getElementById("volume");
var slider2 = document.getElementById("brightness");
var slider3 = document.getElementById("quality");

textureCount = "lets begin...";
texturesToLoad = 6; //im reading this many here...
var textureGrassTop = new THREE.TextureLoader().load( "assets/textures/grass_top.png" , textureLoaded);
textureGrassTop.magFilter = THREE.NearestFilter;
textureGrassTop.wrapS = THREE.RepeatWrapping;
textureGrassTop.wrapT = THREE.RepeatWrapping;
var textureStoneBrick = new THREE.TextureLoader().load( "assets/textures/stonebrick.png" , textureLoaded);
textureStoneBrick.magFilter = THREE.NearestFilter;
textureStoneBrick.wrapS = THREE.RepeatWrapping;
textureStoneBrick.wrapT = THREE.RepeatWrapping;
var textureBrick = new THREE.TextureLoader().load( "assets/textures/brick.png" , textureLoaded);
textureBrick.magFilter = THREE.NearestFilter;
textureBrick.wrapS = THREE.RepeatWrapping;
textureBrick.wrapT = THREE.RepeatWrapping;
var textureBirchPlanks = new THREE.TextureLoader().load( "assets/textures/planks_birch.png" , textureLoaded);
textureBirchPlanks.magFilter = THREE.NearestFilter;
textureBirchPlanks.wrapS = THREE.RepeatWrapping;
textureBirchPlanks.wrapT = THREE.RepeatWrapping;
var textureIronBars = new THREE.TextureLoader().load( "assets/textures/iron_bars.png" , textureLoaded);
textureIronBars.magFilter = THREE.NearestFilter;
textureIronBars.wrapS = THREE.RepeatWrapping;
textureIronBars.wrapT = THREE.RepeatWrapping;
var textureMossyBrick = new THREE.TextureLoader().load( "assets/textures/stonebrick_mossy.png" , textureLoaded);
textureMossyBrick.magFilter = THREE.NearestFilter;
textureMossyBrick.wrapS = THREE.RepeatWrapping;
textureMossyBrick.wrapT = THREE.RepeatWrapping;

function textureLoaded (texture) {
  if (textureCount == "lets begin...") textureCount = 0;
  textureCount++;
}

var modelBuffer = [];
var modelPusher = [];
function loadModel(objDir,mtlDir,store) { //store: string name of variable you want to store 'mesh' in.
  new THREE.MTLLoader()
  .load( mtlDir, function ( materials ) {
    materials.preload();
    new THREE.OBJLoader()
    .setMaterials( materials )
    .load(objDir, function ( object ) {
      object.scale.multiplyScalar(3.5); //only for trees, weapons get overwritten
      modelBuffer.push({mesh:object,name:store});
    });
  } );
}
function cloneModel(to, from) {
  modelPusher.push({to:to,from:from});
}

var lowtree;
var lowtree2;
var mace;
var trees = [];
var lowtreeLoaded = false;
loadModel('assets/models/lowtree.obj','assets/models/lowtree.mtl',"lowtree");
loadModel('assets/models/lowtree2.obj','assets/models/lowtree2.mtl',"lowtree2");
loadModel('assets/models/mace.obj','assets/models/mace.mtl',"mace");
loadModel('assets/models/lightsaber.obj','assets/models/lightsaber.mtl',"lightsaber");
loadModel('assets/models/pekka sword.obj','assets/models/pekka sword.mtl',"pekkaSword");
loadModel('assets/models/super hammer.obj','assets/models/super hammer.mtl',"superHammer");

var havePointerLock = 'pointerLockElement' in document || 'mozPointerLockElement' in document || 'webkitPointerLockElement' in document;

if ( havePointerLock ) {

  var element = document.body;

  var pointerlockchange = function ( event ) {

    if ( document.pointerLockElement === element || document.mozPointerLockElement === element || document.webkitPointerLockElement === element ) {

      controlsEnabled = true;
      controls.enabled = true;

      blocker.style.display = 'none';

    } else {

      controls.enabled = false;

      blocker.style.display = 'block';

      instructions.style.display = '';

    }

  };

  var pointerlockerror = function ( event ) {

    instructions.style.display = '';

  };

  // Hook pointer lock state change events
  document.addEventListener( 'pointerlockchange', pointerlockchange, false );
  document.addEventListener( 'mozpointerlockchange', pointerlockchange, false );
  document.addEventListener( 'webkitpointerlockchange', pointerlockchange, false );

  document.addEventListener( 'pointerlockerror', pointerlockerror, false );
  document.addEventListener( 'mozpointerlockerror', pointerlockerror, false );
  document.addEventListener( 'webkitpointerlockerror', pointerlockerror, false );

  window.addEventListener( 'click', function ( event ) {

    instructions.style.display = 'none';

    // Ask the browser to lock the pointer
    element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;

    if (!disableMouseLock) {
      element.requestPointerLock();
    }

  }, false );

} else {

  instructions.innerHTML = 'Your browser doesn\'t seem to support Pointer Lock API';

}

var disableMouseLock = true; //pre game
var lobby = {
  screen: true,
  matchInProgress: false,
  stopWaiting: false,
  preference: undefined,
  ready: false
}
var killerNum = 0;
var survivorNum = 0;
var playersReady = 0;
var finalMessage = "";

var controlsEnabled = false;
var sensitivity = 1;
var mouseIsPressed = {left:false,right:false};
var deltaTime = 1 / 60;
var framesBehind = 1;
var oldTime;
var runFOV = 0;
var boostFOV = 0;
var indicatorMsg;

var moveForward = false;
var moveBackward = false;
var moveLeft = false;
var moveRight = false;
var spaceHeld = false;
var shiftHeld = false;
var fKey = false;
var frameCount = 0;
var near = 0.5;
var far = 1e6;
var delta;
var targetFPS = 60;
var prevTime = performance.now();
var vec3 = new THREE.Vector3();
var euler = new THREE.Euler();
var color = new THREE.Color();
var Xaxis = new THREE.Vector3(1,0,0);
var Yaxis = new THREE.Vector3(0,1,0);
var Zaxis = new THREE.Vector3(0,0,1);
var playerID;
var players = [];
var weaponNames = ["Mace","Hammer","Pekka","Lightsaber"];
var weaponNamesActual = ["mace","superHammer","pekkaSword","lightsaber"];
var weaponNameIndex = 0;

function Guest(id) {
  this.id = id;
  this.pref = undefined;
  this.ready = false;
  this.isGuest = true; 0
}

setup();
draw();

function setup() {

  camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, near, far );

  var audioLoader = new THREE.AudioLoader();
  listener = new THREE.AudioListener();
  camera.add( listener );

  slider1.oninput = function() {
    if (finalMessage == "") listener.setMasterVolume(this.value / 100);
  }
  slider2.oninput = function() {
    light.intensity = this.value / 100;
    ambientLight.intensity = 0.025 + this.value / 400;
  }
  slider3.oninput = function() {
    renderer.setPixelRatio(this.value / 30);
  }

//stone sounds local
stoneSoundsPositional = [];
stoneSoundsPositionalNum = [0,0,0,0];
stoneSounds = [];
stoneSoundsNum = [0,0,0,0]; //handles listener order
audioLoader.load('assets/sounds/sneaker 2.mp3', function( buffer ) {
  for (var i = 0; i < 3; i++) {
    stoneSounds.push(new THREE.Audio( listener ).setBuffer(buffer));
  }
  for (var i = 0; i < 4; i++) {
    stoneSoundsPositional.push(new THREE.PositionalAudio( listener ).setBuffer(buffer));
    stoneSoundsPositional[stoneSoundsPositional.length - 1].setDistanceModel("linear");
  }
});
audioLoader.load('assets/sounds/sneaker 3.mp3', function( buffer ) {
  for (var i = 0; i < 3; i++) {
    stoneSounds.push(new THREE.Audio( listener ).setBuffer(buffer));
  }
  for (var i = 0; i < 4; i++) {
    stoneSoundsPositional.push(new THREE.PositionalAudio( listener ).setBuffer(buffer));
    stoneSoundsPositional[stoneSoundsPositional.length - 1].setDistanceModel("linear");
  }
});
audioLoader.load('assets/sounds/sneaker 4.mp3', function( buffer ) {
  for (var i = 0; i < 3; i++) {
    stoneSounds.push(new THREE.Audio( listener ).setBuffer(buffer));
  }
  for (var i = 0; i < 4; i++) {
    stoneSoundsPositional.push(new THREE.PositionalAudio( listener ).setBuffer(buffer));
    stoneSoundsPositional[stoneSoundsPositional.length - 1].setDistanceModel("linear");
  }
});
audioLoader.load('assets/sounds/sneaker 5.mp3', function( buffer ) {
  for (var i = 0; i < 3; i++) {
    stoneSounds.push(new THREE.Audio( listener ).setBuffer(buffer));
  }
  for (var i = 0; i < 4; i++) {
    stoneSoundsPositional.push(new THREE.PositionalAudio( listener ).setBuffer(buffer));
    stoneSoundsPositional[stoneSoundsPositional.length - 1].setDistanceModel("linear");
  }
});
//grass sounds local
grassSounds = [];
grassSoundsNum = [0,0,0,0]; //handles listener order
grassSoundsPositional = [];
grassSoundsPositionalNum = [0,0,0,0];
audioLoader.load('assets/sounds/grass step A.mp3', function( buffer ) {
  for (var i = 0; i < 3; i++) {
    grassSounds.push(new THREE.Audio( listener ).setBuffer(buffer));
  }
  for (var i = 0; i < 4; i++) { //4 is probably enough.......
    grassSoundsPositional.push(new THREE.PositionalAudio( listener ).setBuffer(buffer));
    grassSoundsPositional[grassSoundsPositional.length - 1].setDistanceModel("linear");
  }
});
audioLoader.load('assets/sounds/grass step B.mp3', function( buffer ) {
  for (var i = 0; i < 3; i++) {
    grassSounds.push(new THREE.Audio( listener ).setBuffer(buffer));
  }
  for (var i = 0; i < 4; i++) {
    grassSoundsPositional.push(new THREE.PositionalAudio( listener ).setBuffer(buffer));
    grassSoundsPositional[grassSoundsPositional.length - 1].setDistanceModel("linear");
  }
});
audioLoader.load('assets/sounds/grass step C.mp3', function( buffer ) {
  for (var i = 0; i < 3; i++) {
    grassSounds.push(new THREE.Audio( listener ).setBuffer(buffer));
  }
  for (var i = 0; i < 4; i++) {
    grassSoundsPositional.push(new THREE.PositionalAudio( listener ).setBuffer(buffer));
    grassSoundsPositional[grassSoundsPositional.length - 1].setDistanceModel("linear");
  }
});
audioLoader.load('assets/sounds/grass step D.mp3', function( buffer ) {
  for (var i = 0; i < 3; i++) {
    grassSounds.push(new THREE.Audio( listener ).setBuffer(buffer));
  }
  for (var i = 0; i < 4; i++) {
    grassSoundsPositional.push(new THREE.PositionalAudio( listener ).setBuffer(buffer));
    grassSoundsPositional[grassSoundsPositional.length - 1].setDistanceModel("linear");
  }
});
genDoneSound = undefined;
audioLoader.load('assets/sounds/gen done.mp3', function( buffer ) {
  genDoneSound = new THREE.PositionalAudio( listener ).setBuffer(buffer);
  genDoneSound.setDistanceModel("linear");
  genDoneSound.setMaxDistance(500);
});
genFailSound = undefined;
audioLoader.load('assets/sounds/gen fail.mp3', function( buffer ) {
  genFailSound = new THREE.PositionalAudio( listener ).setBuffer(buffer);
  genFailSound.setDistanceModel("linear");
  genFailSound.setMaxDistance(750);
});
genDamageSound = undefined;
audioLoader.load('assets/sounds/gen damage.mp3', function( buffer ) {
  genDamageSound = new THREE.PositionalAudio( listener ).setBuffer(buffer);
  genDamageSound.setDistanceModel("linear");
  genDamageSound.setMaxDistance(400);
});
//killer terror range audio

jojoOffset = 0;
jojoLastTime = undefined;
ambientJojo = undefined;
activeJojo = undefined;
activerJojo = undefined;
activestJojo = undefined;
audioLoader.load('assets/sounds/giorno third.mp3', function( buffer ) { //7.05s
  activestJojo = new THREE.PositionalAudio( listener ).setBuffer(buffer);
  activestJojo.setDistanceModel("linear");
  activestJojo.setMaxDistance(2000000);
});
audioLoader.load('assets/sounds/giorno second.mp3', function( buffer ) { //7.13s
  activerJojo = new THREE.PositionalAudio( listener ).setBuffer(buffer);
  activerJojo.setDistanceModel("linear");
  activerJojo.setMaxDistance(2000000);
});
audioLoader.load('assets/sounds/giorno first.mp3', function( buffer ) { //7.15s
  ambientJojo = new THREE.Audio( listener ).setBuffer(buffer);
  ambientJojo.setPlaybackRate(0.1);
  activeJojo = new THREE.PositionalAudio( listener ).setBuffer(buffer);
  activeJojo.setDistanceModel("linear");
  activeJojo.setMaxDistance(2000000);
});

scene = new THREE.Scene();
scene.background = new THREE.Color(0x000040); //make sky black when killer gets strong? or something...
scene.fog = new THREE.Fog(0x000040,10);

//map generator
//t { t = 2 (floor:grass), t = 3 (grid:brick)

// LIGHTS
ambientLight = new THREE.AmbientLight(0xffffff, 0.05);
scene.add(ambientLight);

light = new THREE.DirectionalLight(0xffffff, 0.1);
light.position.set(-100,120,-50);
light.castShadow = true;
light.shadow.mapSize.width = 1000;
light.shadow.mapSize.height = 1000;
light.shadow.camera = new THREE.OrthographicCamera( -2000, 1800, 1500, -1400, -2000, 2000 ); //map dimension roughly... but accounting for rotation
light.shadow.needsUpdate = true;
light.shadow.autoUpdate = false;
scene.add(light);

pointLight = new THREE.PointLight(0xffffff, 1.5, 400);

playerCount = 1;
generators = [];
doors = [];
doorMeshes = [];
doors = [];

controls = new THREE.PointerLockControls( camera );
scene.add( controls.getObject() );

var onKeyDown = function ( event ) {
  if (event.repeat) return; //fires on hold down multiple times...
  key = event.keyCode;
  if (key == 38 || key == 87) moveForward = true;
  if (key == 37 || key == 65) moveLeft = true;
  if (key == 40 || key == 83) moveBackward = true;
  if (key == 39 || key == 68) moveRight = true;
  if (key == 67) {
    if (player.gamemode == 0) {
      player.crouching = !player.crouching;
      if (player.crouching) shiftHeld = false;
    }
    else player.crouching = true;
  }
  if (key == 32) spaceHeld = true;
  if (key == 16) {
    shiftHeld = true;
    player.crouching = false;
  }
  if (key == 70) {
    if (player.gamemode == 1 && player.spectating.num != undefined) {
      player.pos.copy(players[player.spectating.num].pos);
      player.spectating = {id:undefined,num:undefined}
    }
    else if (player.gamemode == 0) fKey = !fKey; //f key held
  }
  //if (key == 81) addTree();// spawnPoints.push({x:player.pos.x,z:player.pos.z,y:player.pos.y});
};

var onKeyUp = function ( event ) {
  key = event.keyCode;
  if (key == 38 || key == 87) moveForward = false;
  if (key == 37 || key == 65) moveLeft = false;
  if (key == 40 || key == 83) moveBackward = false;
  if (key == 39 || key == 68) moveRight = false;
  if (key == 67) {
    if (player.gamemode == 1) player.crouching = false;
  }
  if (key == 32) spaceHeld = false;
  if (key == 16) shiftHeld = false;
};

document.addEventListener( 'keydown', onKeyDown, false );
document.addEventListener( 'keyup', onKeyUp, false );

raycaster = new THREE.Raycaster( new THREE.Vector3(), new THREE.Vector3( 0, - 1, 0 ), 0, 1000 );

renderer = new THREE.WebGLRenderer( { antialias: true } );
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

window.addEventListener( 'resize', onWindowResize, false );
stats = new Stats();
stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom);

}

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  renderer.setSize( window.innerWidth, window.innerHeight );

}

window.addEventListener("mousedown", function(event){
  if (event.button == 0) mouseIsPressed.left = true;
  else if (event.button == 2) mouseIsPressed.right = true;
  if (lobby.screen) {
    if ((mouse.x > canvas.width / 2 - canvas.width / 14 && mouse.x < canvas.width / 2 + canvas.width / 14) &&
    (mouse.y > canvas.height / 1.2 - canvas.height / 14 - 10 && mouse.y < canvas.height / 1.2 + canvas.height / 14 - 10)) { //start button
      if ((lobby.screen && players.length > 1 && lobby.preference != undefined && killerNum == 1) || (lobby.ready)) lobby.ready = !lobby.ready;
      socket.emit("ready",lobby.ready);
    }
    if ((mouse.x > canvas.width / 4 - canvas.width / 10 && mouse.x < canvas.width / 4 + canvas.width / 10 ) &&
    (mouse.y > canvas.height / 2 - canvas.height / 10 && mouse.y < canvas.height / 2 + canvas.height / 10)) { //killer button
      if (lobby.screen && lobby.preference != "killer") {
        lobby.preference = "killer";
        socket.emit("pref","killer");
        lobby.ready = false;
      }
    }
    if ((mouse.x > canvas.width / 4 - 70 && mouse.x < canvas.width / 4 + 70 ) &&
    (mouse.y > canvas.height / 2 + canvas.height / 7 + 10 && mouse.y < canvas.height / 2 + canvas.height / 7 + 10 + canvas.height / 20)) {
      weaponNameIndex++;
      if (weaponNameIndex == weaponNames.length) weaponNameIndex = 0;
    }
    if ((mouse.x > canvas.width / 4 * 3 - canvas.width / 10 && mouse.x < canvas.width / 4  * 3 + canvas.width / 10 ) &&
    (mouse.y > canvas.height / 2 - canvas.height / 10 && mouse.y < canvas.height / 2 + canvas.height / 10)) { //survivor button
      if (lobby.screen && lobby.preference != "survivor") {
        lobby.preference = "survivor";
        socket.emit("pref","survivor");
        lobby.ready = false;
      }
    }
  } else if (lobby.matchInProgress) {
    if (player.gamemode == 1) { //spectate clickin
      var survivorIds = []; //make array of survivor ids
      var allPlayerIds = []; //and all players to find playerNum
      for (var i = 0; i < players.length; i++) {
        if (players[i].gamemode == 0 && !players[i].isKiller) survivorIds.push(players[i].id);
        allPlayerIds.push(players[i].id);
      }
      if (player.spectating.num != undefined) { //choose one
        var viewIndex = survivorIds.indexOf(player.spectating.id); //must use ids just incase of discons from survivors between clicks
        if (mouseIsPressed.left) viewIndex++;
        else if (mouseIsPressed.right) viewIndex--;
        if (viewIndex < 0) viewIndex = survivorIds.length - 1;
        else if (viewIndex >= survivorIds.length) viewIndex = 0;
        player.spectating.id = survivorIds[viewIndex];
        player.spectating.num = allPlayerIds.indexOf(player.spectating.id);
      } else {
        for (var i = 0; i < players.length; i++) {
          if (players[i].gamemode == 0 && !players[i].isKiller) player.spectating.num = i;
        }
      }
    } else {
      if (player.isKiller) if (player.weapon.weaponFrame == 0 && player.vaulting == false) {
        player.weapon.weaponFrame = 1; //initiate increment / animation
        socket.emit("attack");
      }
    }
  }
});

window.addEventListener("mouseup", function(event){
  if (event.button == 0) mouseIsPressed.left = false;
  else if (event.button == 2) mouseIsPressed.right = false;
});

window.addEventListener( 'mousemove', onMouseMove, false );

mouse = {x:0,y:0};

function onMouseMove( event ) {
  mouse.x = event.clientX;
  mouse.y = event.clientY;
}

function dist2 (x,y,x2,y2) {
  return Math.pow((x2 - x),2) + Math.pow((y2 - y),2);
}

function dist3 (x,y,z,x2,y2,z2) { //more accuratly... dist3d_Sq
  return Math.pow((x2 - x),2) + Math.pow((y2 - y),2) + Math.pow((z2 - z),2);
}

function skillCheckResponse(msg) {
  this.frame = 120;
  this.message = msg;

  this.show = function() {
    c.fillText(this.message,canvas.width / 2,canvas.height / 1.8 - 3 + this.frame / 6);
    this.frame--;
    if (this.frame == 0) return true;
  }
}

function Timer(maxTime) {
  this.prev = undefined;
  this.time = 0;
  this.maxTime = maxTime

  this.update = function() {
    if (this.prev == undefined) this.prev = performance.now();
    this.time += performance.now() - this.prev;
    this.prev -= performance.now();
  }
}

var trees = [];
var treeSpots = [];

function addTree() {
  if (lowtree != undefined && lowtree2 != undefined) {
    if (Math.random() > 0.2) var meshy = lowtree2.clone();
    else var meshy = lowtree.clone();
    meshy.position.set(player.pos.x,player.pos.y - 20,player.pos.z);
    meshy.scale.set(50,50,50);
    //meshy.castShadow = true;
    scene.add(meshy);
    trees.push(meshy);
  }
  treeSpots.push([player.pos.x,player.pos.y - 20,player.pos.z]);
}

function draw() {
  lastFrameTime = performance.now();
  //HUD
  c.clearRect(0, 0, canvas.width, canvas.height);
  c.textAlign = "left";
  c.font = "20px Helvetica";

  if (disableMouseLock) blocker.style.display = 'none';

  if (!lobby.screen) {
    if (textureCount == undefined) {
      c.fillStyle = "rgba(255,255,255,0.1)";
      if (gensLeft > 0) c.fillText("Generators left: " + gensLeft, 5, canvas.height - 5, canvas.width / 5);
      else if (!(doors[0].done || doors[1].done)) c.fillText("Open the doors!", 5, canvas.height - 5, canvas.width / 5);
      else c.fillText("A door is open!", 5, canvas.height - 5, canvas.width / 5);
      var survivorCounter = 0;
      for (var i2 = 0; i2 < players.length; i2++) {
        if (players[i2].isKiller == false) {
          survivorCounter++;
          if (players[i2].id == playerID) {
            c.fillStyle = "rgba(50,50,50,0.2)";
            c.fillRect(0, canvas.height - 35 - survivorCounter * 25, canvas.width / 6 , 25);
            c.fillStyle = "rgba(255,255,255,0.1)";
          }
          c.fillText("Survivor " + (players.length - survivorCounter) + ": " + players[i2].health, 5, canvas.height - 15 - survivorCounter * 25, canvas.width / 5);
        }
      }
      c.fillStyle = "#ffffff";
      for (var i = generators.length - 1; i >= 0; i--) {
        if (dist2(generators[i].p[0],generators[i].p[2],player.pos.x,player.pos.z) < 23 ** 2 && Math.abs(generators[i].p[1] - player.pos.y) <= 40 && generators[i].progress < 1) {
          c.fillStyle = "rgba(30,30,30,0.5)";
          c.fillRect(canvas.width / 2 - canvas.width / 10, canvas.height / 1.5, canvas.width / 5,  canvas.height / 20);
          if (player.repair.genNum == i) {
            c.textAlign = "center";
            c.fillStyle = "rgba(100,100,100,0.5)";
            c.fillRect(canvas.width / 2 - canvas.width / 10, canvas.height / 1.5, canvas.width / 5 * generators[i].progress,  canvas.height / 20);
            c.fillStyle = "rgba(30,30,30,0.5)";
            c.fillStyle = "rgba(255,255,255,1)";
            c.fillText((generators[i].progress * 100).toFixed(1) + "%",
            canvas.width / 2 + 2, canvas.height / 1.5 + 25, canvas.width / 5.15);
          } else {
            c.fillStyle = "rgba(255,255,255,1)";
            if (player.isKiller) {
              if (gensLeft <= 0) c.fillText("Doors are Powered.", canvas.width / 2 - canvas.width / 10 + 2, canvas.height / 1.5 + 25, canvas.width / 5.15);
              else if (gensLeft == -3) c.fillText("The gens are fully overcharged.", canvas.width / 2 - canvas.width / 10 + 2, canvas.height / 1.5 + 25, canvas.width / 5.15);
              else if (player.weapon.genStunFrames == 0 && generators[i].damaged == false && generators[i].progress <= 0) c.fillText("This generator is already at 0% repair", canvas.width / 2 - canvas.width / 10 + 2, canvas.height / 1.5 + 25, canvas.width / 5.15);
              else if (player.weapon.genStunFrames == 0 && generators[i].damaged == false) c.fillText("Press Space to damage generator (" + Math.floor(generators[i].progress * 100) + "%)", canvas.width / 2 - canvas.width / 10 + 2, canvas.height / 1.5 + 25, canvas.width / 5.15);
              else if (player.weapon.genStunFrames > 0) c.fillText("Damaging generator... ",
              canvas.width / 2 - canvas.width / 10 + 2, canvas.height / 1.5 + 25, canvas.width / 5.15);
              else if (generators[i].damaged) c.fillText("This generator is losing progress (" + Math.floor(generators[i].progress * 100) + "%)", canvas.width / 2 - canvas.width / 10 + 2, canvas.height / 1.5 + 25, canvas.width / 5.15);
            } else {
              if (gensLeft > 0 && player.health != "dying" && !generators[i].damaged) c.fillText("Press Space to repair generator (" + Math.floor(generators[i].progress * 100) + "%)",
              canvas.width / 2 - canvas.width / 10 + 2, canvas.height / 1.5 + 25, canvas.width / 5.15);
              else if (player.health != "dying" && gensLeft <= 0 && gensLeft >= -2) c.fillText("Doors are Powered! Overcharge? (extra: " + gensLeft*-1 + ")",
              canvas.width / 2 - canvas.width / 10 + 2, canvas.height / 1.5 + 25, canvas.width / 5.15);
              else if (player.health != "dying" && gensLeft == -3) c.fillText("Doors at maximum overcharge!",
              canvas.width / 2 - canvas.width / 10 + 2, canvas.height / 1.5 + 25, canvas.width / 5.15);
              else if (player.health != "dying" && generators[i].damaged) c.fillText("This generator is losing progress (" + Math.floor(generators[i].progress * 100) + "%)",
              canvas.width / 2 - canvas.width / 10 + 2, canvas.height / 1.5 + 25, canvas.width / 5.15);
              else if (player.health == "dying") c.fillText("Hard to repair when you're dying",
              canvas.width / 2 - canvas.width / 10 + 2, canvas.height / 1.5 + 25, canvas.width / 5.15);
            }
          }
        }
      }

      for (var i = doors.length - 1; i >= 0; i--) { //doorUI
        if (dist2(doors[i].p[0],doors[i].p[2],player.pos.x,player.pos.z) < 23 ** 2 && Math.abs(doors[i].p[1] - player.pos.y) <= 40) {
          c.fillStyle = "rgba(30,30,30,0.5)";
          c.fillRect(canvas.width / 2 - canvas.width / 10, canvas.height / 1.5, canvas.width / 5,  canvas.height / 20);
          if (player.switch.num == i) {
            c.textAlign = "center";
            c.fillStyle = "rgba(100,100,100,0.5)";
            c.fillRect(canvas.width / 2 - canvas.width / 10, canvas.height / 1.5, canvas.width / 5 * doors[i].progress,  canvas.height / 20);
            c.fillStyle = "rgba(30,30,30,0.5)";
            c.fillStyle = "rgba(255,255,255,1)";
            c.fillText((doors[i].progress * 100).toFixed(1) + "%",
            canvas.width / 2 + 2, canvas.height / 1.5 + 25, canvas.width / 5.15);
          } else {
            c.fillStyle = "rgba(255,255,255,1)";
            var someoneIsDying = false;
            for (var i2 = players.length - 1; i2 >= 0; i2--) {
              if (players[i2].health == "dying" && players[i2].id != playerID) someoneIsDying = true; //if someone is dying and it aint you
            }
            if (player.isKiller) c.fillText("You are too dumb to damage this",
            canvas.width / 2 - canvas.width / 10 + 2, canvas.height / 1.5 + 25, canvas.width / 5.15);
            else if (doors[i].done && someoneIsDying) c.fillText("Someone is dying, will you run?",
            canvas.width / 2 - canvas.width / 10 + 2, canvas.height / 1.5 + 25, canvas.width / 5.15);
            else if (doors[i].done) c.fillText("The door is open! Escape!",
            canvas.width / 2 - canvas.width / 10 + 2, canvas.height / 1.5 + 25, canvas.width / 5.15);
            else if (gensLeft == 1 && player.health != "dying") c.fillText("You need 1 more generator!",
            canvas.width / 2 - canvas.width / 10 + 2, canvas.height / 1.5 + 25, canvas.width / 5.15);
            else if (gensLeft > 0 && player.health != "dying") c.fillText("You need " + gensLeft + " more generators!",
            canvas.width / 2 - canvas.width / 10 + 2, canvas.height / 1.5 + 25, canvas.width / 5.15);
            else if (player.health != "dying" && doors[i].playersHitting == 0) c.fillText("Press Space to Activate Door",
            canvas.width / 2 - canvas.width / 10 + 2, canvas.height / 1.5 + 25, canvas.width / 5.15);
            else if (player.health != "dying" && doors[i].playersHitting > 0) c.fillText("Only 1 survivor can open a door",
            canvas.width / 2 - canvas.width / 10 + 2, canvas.height / 1.5 + 25, canvas.width / 5.15);
            else if (player.health == "dying") c.fillText("You are dying for fucks sake",
            canvas.width / 2 - canvas.width / 10 + 2, canvas.height / 1.5 + 25, canvas.width / 5.15);
          }
        }
      }
      c.textAlign = "center";
      if (player.health == "dying") {
        c.fillStyle = "rgba(30,30,30,0.5)";
        c.fillRect(canvas.width / 2 - canvas.width / 8, canvas.height / 1.8, canvas.width / 4,  canvas.height / 20);
        c.fillRect(canvas.width / 2 - canvas.width / 8, canvas.height / 1.8 +  canvas.height / 20, canvas.width / 4,  canvas.height / 20);
        c.fillStyle = "rgba(100,100,100,0.5)";
        c.fillRect(canvas.width / 2 - canvas.width / 8, canvas.height / 1.8, canvas.width / 4 * player.dyingTime.left / 120e3,  canvas.height / 20);
        c.fillRect(canvas.width / 2 - canvas.width / 8, canvas.height / 1.8 +  canvas.height / 20, canvas.width / 4 * player.revive.left / 10e3,
          canvas.height / 20);
          c.fillStyle = "rgba(255,255,255,1)";
          c.fillText((player.dyingTime.left / 1e3).toFixed(1) + " seconds left until death.",
          canvas.width / 2 + 2, canvas.height / 1.8 + 25, canvas.width / 4.15);
          c.fillStyle = "#ffffff";
          if (!player.revive.gettingRevived) c.fillText("Wait for a survivor to revive you!",
          canvas.width / 2 + 2, canvas.height / 1.8 + 25 + canvas.height / 20, canvas.width / 4.15);
          else c.fillText("You are being revived!", canvas.width / 2 + 2, canvas.height / 1.8 + 25 + canvas.height / 20, canvas.width / 4.15);
        }
        if (player.health != "dying" && player.repair.gunNum == undefined && player.switch.num == undefined) {
          for (var i = players.length - 1; i >= 0; i--) {
            if (dist2(player.pos.x,player.pos.z,players[i].pos.x,players[i].pos.z) < 30 ** 2) {
              if (player.isKiller) {
                if (players[i].health == "dying" ) {
                  c.fillText("No hooks. Wait till they bleed out.", canvas.width / 2 + 2, canvas.height / 1.8 + 25 + canvas.height / 20, canvas.width / 4.15);
                }
              } else {
                if (players[i].health == "dying" && (players[i].revive.gettingRevived && player.revive.reviving != players[i].id)) {
                  c.fillText("This survivor is already being revived!", canvas.width / 2 + 2, canvas.height / 1.8 + 25 + canvas.height / 20, canvas.width / 4.15);
                } else if (players[i].health == "dying" && !spaceHeld) c.fillText("Hold Space to pick up this Survivor", canvas.width / 2 + 2, canvas.height / 1.8 + 25 + canvas.height / 20, canvas.width / 4.15);
                else if (players[i].health == "dying" && spaceHeld) {
                  c.fillText("Reviving... (" + (10 - players[i].revive.left / 1e3).toFixed(1) + "s)", canvas.width / 2 + 2, canvas.height / 1.8 + 25 + canvas.height / 20, canvas.width / 4.15);
                }
              }
            }
          }
        }
        alreadyDisplayed = false;
      }
      if (player.repair.frame == 0) {
        c.fillStyle = "rgba(100,100,100,0.5)";
        c.fillRect(canvas.width / 2 - 60, canvas.height / 1.8, 120,  12);
        c.fillStyle = "rgba(180,180,180,1)";
        c.fillRect(canvas.width / 2 - 60 + (player.repair.sweetSpot - 10) * 2, canvas.height / 1.8, 20,  12);
        c.fillStyle = "rgba(255,255,255,1)";
        c.fillRect(canvas.width / 2 - 60 + (player.repair.sweetSpot - 3) * 2, canvas.height / 1.8, 6,  12);
        c.fillStyle = "rgba(0,0,0,1)";
        c.fillRect(canvas.width / 2 - 60 + player.repair.skillCheckFrame * 2, canvas.height / 1.8 - 3, 3,  18);
      }

      if (player.boostFrames > 30) { //injured red flash
        c.fillStyle = "rgba(255,0,0," + (player.boostFrames - 30) / 60 + ")";
        c.fillRect(0, 0, canvas.width, canvas.height);
      }

      if (player.gamemode == 1) {
        c.textAlign = "center";
        c.fillStyle = "rgba(255,255,255,1)";
        if (player.spectating.num == undefined) c.fillText("Spectating... (free camera)",canvas.width / 2, canvas.height / 1.3 + 25);
        else c.fillText("Spectating: a survivor",canvas.width / 2, canvas.height / 1.3 + 25);
        c.fillText("[Left click] - previous survivor", canvas.width / 2 - 150, canvas.height / 1.3 + 60);
        c.fillText("[Right click] - next survivor", canvas.width / 2 + 150, canvas.height / 1.3 + 60);
        c.fillText("[f key] - free camera", canvas.width / 2 + 150, canvas.height / 1.3 + 90);
      }

      if (finalMessage != "") {
        c.textAlign = "center";
        c.fillStyle = "rgba(0,0,0,1)";
        c.fillRect(0, 0, canvas.width, canvas.height);
        c.fillStyle = "rgba(255,255,255,1)";
        c.fillText(finalMessage,
          canvas.width / 2, canvas.height / 2);
          c.fillStyle = "rgba(255,255,255,0.5)";
          c.fillText("refresh for next game...",
          canvas.width / 2, canvas.height / 1.2);
        }

        c.textAlign = "center";

      } else {
        c.save();
        c.fillStyle = "rgba(0,0,0,0.0)";
        c.fillRect(0,0,canvas.width,canvas.height);
        c.textAlign = "center";
        c.font = "20px Helvetica";
        c.fillStyle = "#ffffff";
        if (!lobby.matchInProgress) {
          c.fillText("Players Waiting for Match: " + players.length, canvas.width / 2, canvas.height / 5 + 30,canvas.width / 5 * 3);
          c.fillText("Players Ready: (" + playersReady + "/" + players.length + ")", canvas.width / 2, canvas.height / 5 + 50,canvas.width / 5 * 3);
        } else c.fillText(lobby.message,canvas.width / 2, canvas.height / 5 + 50,canvas.width / 5 * 3);
        c.font = "50px Helvetica";
        c.fillText("Fead By Faylight",canvas.width / 2, canvas.height / 5,canvas.width / 5 * 3);
        c.rect(canvas.width / 2, canvas.height / 5,canvas.width / 5 * 3,42);
        c.fillText("Hunter",canvas.width / 4, canvas.height / 2);
        c.fillText("Survivor",canvas.width / 4 * 3, canvas.height / 2);
        c.fillStyle = "rgba(255,255,255,0.2)";
        if (lobby.preference == "killer") {
          c.fillRect(canvas.width / 4 - canvas.width / 10,canvas.height / 2 - canvas.height / 10,canvas.width / 5,canvas.height / 5);
          c.font = "15px Helvetica";
          c.fillStyle = "#ffffff";
          c.fillText("Weapon Aesthetic?",canvas.width / 4, canvas.height / 2 + canvas.height / 7);
          c.fillStyle = "rgba(255,255,255,0.2)";
          c.fillRect(canvas.width / 4 - 70,canvas.height / 2 + canvas.height / 7 + 10,140,canvas.height / 20);
          c.fillStyle = "#ffffff";
          c.fillText(weaponNames[weaponNameIndex], canvas.width / 4, canvas.height / 2 + canvas.height / 7 + canvas.height / 40 + 15);
        } else if (lobby.preference == "survivor") c.fillRect(canvas.width / 4 * 3 - canvas.width / 10,canvas.height / 2 - canvas.height / 10,
          canvas.width / 5,canvas.height / 5);
          c.font = "10px Helvetica";
          c.fillStyle = "rgba(255,255,255,0.2)";
          c.fillText("Aka: The random guy with a mace",canvas.width / 4, canvas.height / 2 + 15);
          c.fillText("Please don't sue me",canvas.width / 2, canvas.height / 5 - 60);
          c.fillStyle = "#ffffff";
          c.fillText("Amount: " + killerNum, canvas.width / 4, canvas.height / 2 + 30);
          c.fillText("Amount: " + survivorNum, canvas.width / 4 * 3, canvas.height / 2 + 30);
          if (players.length > 1) {
            c.font = "40px Helvetica";
            if (lobby.ready) c.fillStyle = "#00ff00";
            else if ((mouse.x > canvas.width / 2 - canvas.width / 14 && mouse.x < canvas.width / 2 + canvas.width / 14) &&
            (mouse.y > canvas.height / 1.2 - canvas.height / 14 - 10 && mouse.y < canvas.height / 1.2 + canvas.height / 14 - 10)) {
              c.fillStyle = "#5f5f5f"
            } else c.fillStyle = "#3f3f3f"
            c.fillRect(canvas.width / 2 - canvas.width / 14, canvas.height / 1.2 - canvas.height / 14 - 10, canvas.width / 7, canvas.height / 7);
            c.fillStyle = "#ffffff"
            c.font = "15px Helvetica";
            if (lobby.preference == undefined) {
              c.fillText("Pick a type before readying up!",canvas.width / 2, canvas.height / 1.2 + 60);
            }
            if (killerNum > 1) c.fillText("Hey, Room! Only ONE Killer!",canvas.width / 2, canvas.height / 1.2 + 80);
            else if (killerNum == 0) c.fillText("Hey, Room! No fun without a killer!",canvas.width / 2, canvas.height / 1.2 + 80);
            c.font = "40px Helvetica";
            c.fillText("Start",canvas.width / 2, canvas.height / 1.2);
          }
          c.restore();
        }
        if (socketDisconnected) { //socket.disconnected returns true on connecting, thanks socket.io...
          c.textAlign = "center";
          c.fillStyle = "rgba(0,0,0,1)";
          c.fillRect(0, 0, canvas.width, canvas.height);
          c.fillStyle = "rgba(255,255,255,1)";
          c.fillText("Your connection to the server straight-up ENDED. Server probably crashed...",
          canvas.width / 2, canvas.height / 2);
          c.fillStyle = "rgba(255,255,255,0.5)";
          c.fillText("refresh to reconnect to server...",
          canvas.width / 2, canvas.height / 1.2);
        }

        if (!lobby.screen) {

          if (oldTime != null) {
            deltaTime = (performance.now() - oldTime) / 1000;
            framesBehind += deltaTime * 60;
          }
          for (var q = modelBuffer.length - 1; q >= 0; q--) {
            window[modelBuffer[0].name] = modelBuffer[0].mesh;
            modelBuffer.splice(0,1);
          }
          for (var i = modelPusher.length - 1; i >= 0; i--) {
            if (window[modelPusher[i].from] != undefined) {
              modelPusher[i].to.ref = window[modelPusher[i].from];
              modelPusher.splice(i,1);
            }
          }

          oldTime = performance.now();
          frameCount++;
          stats.end();
          stats.begin();

          if (lowtree2 != undefined && lowtree != undefined && lowtreeLoaded == false) {
            for (var i = treeJSON.length - 1; i >= 0; i--) {
              if (Math.random() > 0.2) var meshy = lowtree2.clone();
              else var meshy = lowtree.clone();
              meshy.position.set(treeJSON[i][0],treeJSON[i][1] - 60,treeJSON[i][2]);
              meshy.scale.set(50,50,50);
              scene.add(meshy);
              trees[i] = meshy;
              trees[i].children[0].castShadow = true;
              trees[i].children[1].castShadow = true;
            }
            lowtreeLoaded = true;
          }

          if (textureCount == texturesToLoad) { //map generation
            for (var i = 0; i < mapJSON.objects.length; i++) {
              var object = mapJSON.objects[i];
              var largestAxes = [];
              if (Math.max(object.s[0] * object.s[1],object.s[0] * object.s[2],object.s[1] * object.s[2]) == object.s[0] * object.s[1]) largestAxes = [0,1];
              else if (Math.max(object.s[0] * object.s[1],object.s[0] * object.s[2],object.s[1] * object.s[2]) == object.s[0] * object.s[2]) largestAxes = [0,2];
              else largestAxes = [2,1]; ///[1,2] before... FIXED TEXTURE SCALING

              object.color = 0xffffff;
              if (object.t == 2) {
                object.color = 0x00af00;
                object.texture = textureGrassTop.clone();
              }
              else if (object.t == 3) object.texture = textureBrick.clone();
              else if (object.t == 1) object.texture = textureStoneBrick.clone();
              else if (object.t == 4) object.texture = textureBirchPlanks.clone();
              else if (object.t == 7) object.texture = textureIronBars.clone();
              else if (object.t == 6) object.texture = textureMossyBrick.clone();
              if (object.ci == 0) { //red for gen
                generators.push(object);
                object.casingMesh = new THREE.Mesh(new THREE.BoxBufferGeometry(16 + 2,18 + 2,24 + 2),new THREE.MeshLambertMaterial({color:0x404040}));
                object.progress = 0;
                object.done = false;
                object.lastFrameTime = undefined;
                object.playersHitting = 0;
                object.damaged = false;
                object.light = pointLight.clone();
                object.light.position.set(object.p[0],object.p[1],object.p[2]);
                object.light.position.y += 10;
                object.casingMesh.position.set(object.p[0],object.p[1] + object.s[2] / 2 - 15,object.p[2])
                if (object.r != undefined) object.casingMesh.rotation.set(object.r[0],object.r[1],object.r[2])
                scene.add(object.casingMesh);
                var material = new THREE.MeshLambertMaterial({color:0xff0000});
              } else if (object.ci == 1) { //green for door switch
                doors.push(object);
                var lightbulbGeometry = new THREE.BoxBufferGeometry(10,6,2.5);
                var lightbulbMaterial = new THREE.MeshBasicMaterial({color:0xff0000});
                object.progress = 0;
                object.done = false;
                object.startTime = undefined;
                object.playersHitting = 0;
                object.completion = 0;
                object.lightbulbs = [
                  new THREE.Mesh(lightbulbGeometry.clone(),lightbulbMaterial.clone()),
                  new THREE.Mesh(lightbulbGeometry.clone(),lightbulbMaterial.clone()),
                  new THREE.Mesh(lightbulbGeometry.clone(),lightbulbMaterial.clone())
                ];
                for (var i2 = object.lightbulbs.length - 1; i2 >= 0; i2--) {
                  object.lightbulbs[i2].position.set(object.p[0],object.p[1],object.p[2]);
                  object.lightbulbs[i2].position.y += object.s[1] / 2;
                  scene.add(object.lightbulbs[i2])
                }
                object.lightbulbs[1].position.z += 5;
                object.lightbulbs[2].position.z -= 5;
                var material = new THREE.MeshLambertMaterial({color:0x040404});
              } else {
                object.texture.needsUpdate = true;
                object.texture.repeat.set(object.s[largestAxes[0]] / 25,object.s[largestAxes[1]] / 25);
                var material = new THREE.MeshLambertMaterial({color:object.color, map:object.texture});
              }
              var currentMesh = new THREE.Mesh(new THREE.BoxBufferGeometry(object.s[0],object.s[1],object.s[2]),material);
              if (object.t == 7) {
                material.transparent = true;
                doorMeshes.push(currentMesh);
              }
              if (object.t == 2) currentMesh.receiveShadow = true;
              else {
                currentMesh.receiveShadow = true;
                currentMesh.castShadow = true;
              }
              currentMesh.position.set(object.p[0],object.p[1] + object.s[1] / 2,object.p[2]);
              if (object.r != undefined) currentMesh.rotation.set(object.r[0],object.r[1],object.r[2]);
              currentMesh.t = object.t;
              map.objects.push(currentMesh);
              scene.add(currentMesh);
              if (object.ci == 0) {
                object.mesh = map.objects[map.objects.length - 1];
              } else if (object.ci == 1) {
                object.mesh = doorMeshes[doorMeshes.length - 1];
              }
            }
            textureCount = undefined; //stop this from re-running
          }

          if (player.running && runFOV < 10) runFOV += 1;
          else if (!player.running && runFOV > 0) runFOV -= 1;
          if (player.boostFrames > 0 && boostFOV < 20) boostFOV += 2;
          else if (player.boostFrames <= 0 && boostFOV > 0) boostFOV -= 2;
          camera.fov = player.fov + runFOV + boostFOV;
          camera.near = near;
          camera.far = far;
          camera.updateProjectionMatrix();
          player.lookDir = camera.getWorldDirection(new THREE.Vector3(0,0,-1));
          for (var i = trees.length - 1; i >= 0; i--) {
            if (dist2(player.pos.x,player.pos.z,trees[i].position.x,trees[i].position.z) < 20 ** 2) {
              var displace = new THREE.Vector3(-trees[i].position.x + player.pos.x,0, -trees[i].position.z + player.pos.z);
              var howFar = 20 - displace.length();
              displace.normalize();
              displace.multiplyScalar(howFar);
              player.pos.add(displace);
              player.runVel.multiplyScalar(0.55);
            }
          }
          if (player.gamemode == 0) {
            for (var i = vaultJSON.length - 1; i >= 0; i--) {
              if (dist2(vaultJSON[i][0],vaultJSON[i][2],player.pos.x,player.pos.z) < 15 ** 2 && spaceHeld
              && player.health != "dying" && Math.abs(vaultJSON[i][1] - player.pos.y) < 40) {
                if (player.vaulting.length == 0) {
                  if (player.isKiller) {
                    if (player.weapon.weaponLungeTime.lungeTime <= 0) player.vaulting = [i,vaultJSON[i][3]]; //will vault during first 10 frames of attack...
                  } else player.vaulting = [i,vaultJSON[i][3]];
                }
              }
            }
            for (var i = generators.length - 1; i >= 0; i--) { //genStart
              if (!player.isKiller && player.repair.genNum == undefined && dist2(generators[i].p[0],generators[i].p[2],player.pos.x,player.pos.z) < 23 ** 2 && Math.abs(generators[i].p[1] - player.pos.y) <= 40 && spaceHeld
              && player.health != "dying" && generators[i].done == false && gensLeft > -3) { //overcharging...
                player.repair.genNum = i;
                socket.emit("gen start", i);
              } else if (player.isKiller && dist2(generators[i].p[0],generators[i].p[2],player.pos.x,player.pos.z) < 23 ** 2 && Math.abs(generators[i].p[1] - player.pos.y) <= 40 && spaceHeld && !generators[i].damaged && gensLeft > -3 && generators[i].done == false && generators[i].progress > 0 && player.weapon.genStunFrames == 0) {
                player.weapon.genStunFrames = 1;
                socket.emit("gen stun anim");
                player.weapon.genStun = i;
              }
            }
            for (var i = players.length - 1; i >= 0; i--) {
              if (players[i].revive.gettingRevived) {
                if (players[i].revive.last) players[i].revive.left += (performance.now() - players[i].revive.last);
              }
              players[i].revive.last = performance.now();
            }

            var genI = player.repair.genNum;
            if (genI != undefined) {
              if (!(dist2(generators[genI].p[0],generators[genI].p[2],player.pos.x,player.pos.z) < 23 ** 2 && Math.abs(generators[genI].p[1] - player.pos.y) <= 40 && generators[genI].done == false)) { //reset stats
                player.repair.genNum =  undefined;
                player.repair.frame = 180 + Math.floor((Math.random() - 0.5) * 30);
                player.repair.sweetSpot = 52 - Math.floor(Math.random() * 22);
                player.repair.skillCheckFrame = 0;
                socket.emit("gen end", genI);
              }
            }

            for (var i = generators.length - 1; i >= 0; i--) { //genRepair
              if (generators[i].damaged) {
                if (generators[i].startTime) generators[i].progress -= ((performance.now() - generators[i].startTime) / 5e4) / 4;
                generators[i].startTime = performance.now();
                if (generators[i].progress <= 0) {
                  generators[i].progress = 0;
                  generators[i].damaged = false;
                  generators[i].startTime = undefined;
                }
              }
              if (generators[i].playersHitting > 0 && generators[i].done == false) {
                if (generators[i].startTime) generators[i].progress += (performance.now() - generators[i].startTime) / 5e4 * generators[i].playersHitting;
                generators[i].startTime = performance.now();
              }
              if (!generators[i].done && !generators[i].damaged) generators[i].mesh.material.color.setRGB(1 - generators[i].progress,generators[i].progress,0);
              else if (!generators[i].done && generators[i].damaged) generators[i].mesh.material.color.setRGB(0.77,0.168,1);
            }

            for (var i = doors.length - 1; i >= 0; i--) { //doorStart
              if (doors[i].progress > 1 && doors[i].mesh.position.y < 220) doors[i].mesh.position.y += 1; //open the gaaaates
              if (player.switch.num == undefined && dist2(doors[i].p[0],doors[i].p[2],player.pos.x,player.pos.z) < 23 ** 2 && spaceHeld && doors[i].progress < 1 && player.health != "dying" && gensLeft <= 0 && doors[i].playersHitting == 0 && player.isKiller == false) {
                socket.emit("door start", i);
                player.switch.num = i;
              } else if (player.switch.num == i && !(dist2(doors[i].p[0],doors[i].p[2],player.pos.x,player.pos.z) < 23 ** 2 && doors[i].progress < 1)) {
                socket.emit("door end", i);
                player.switch.num = undefined;
                doors[i].startTime = undefined;
              }
              if (doors[i].playersHitting == 0) {
                if (doors[i].progress > 0 && doors[i].progress < 0.33 || doors[i].progress >= 0.34 && doors[i].progress < 0.66 || doors[i].progress >= 0.67 && doors[i].progress < 1) doors[i].progress = Math.floor(doors[i].progress * 3) / 3;
              }
            }

            if (player.switch.num != undefined) {
              var switchI = player.switch.num;
              if (doors[switchI].startTime != undefined) doors[switchI].progress += (performance.now() - doors[switchI].startTime) / doorSpeedConst;
              doors[switchI].startTime = performance.now();
            }
          }


          player.move();
          if (player.gamemode == 0) {
            player.collide();
            player.update();
            player.interact();
          }
          for (var i = players.length - 1; i >= 0; i--) {
            players[i].show(i);
            if (players[i] != player) players[i].stepSoundCheck();
            if (players[i].isKiller) players[i].calcTerror();
          }
          //visual data set-ing
          if ((fKey || player.spectating.num != undefined) && !player.isKiller) {
            var playerInQuestion;
            if (player.spectating.num != undefined) playerInQuestion = players[player.spectating.num];
            else playerInQuestion = player;
            zoomOutVec = vec3.set(0,0,1);
            zoomOutVec.applyAxisAngle(Xaxis, player.looking.x);
            zoomOutVec.applyAxisAngle(Yaxis, player.looking.y);
            raycaster.set(player.pos,zoomOutVec);
            raycaster.far = 60;
            var intersections = raycaster.intersectObjects( map.objects );
            if (intersections.length > 0) zoomOutVec.setLength(intersections[0].distance - 1);
            else zoomOutVec.setLength(60);
            if (player.spectating.num != undefined) zoomOutVec.add(playerInQuestion.pos);
            else zoomOutVec.add(playerInQuestion.pos);
            controls.getObject().position.copy(zoomOutVec);
            if (playerInQuestion == player) {
              scene.add(player.mesh.body);
              scene.add(player.mesh.head);
            }
          } else {
            scene.remove(player.mesh.body);
            scene.remove(player.mesh.head);
            controls.getObject().position.copy(player.pos);
          }
          renderer.render( scene, camera );
        }
      });
      var statSend = {s:[player.pos.x,player.pos.y,player.pos.z,player.looking.y % (Math.PI * 2)]}
      //check player stats if changed to send
      if (player.changed.crouching != player.crouching) {
        statSend.c = player.crouching;
        player.changed.crouching = player.crouching;
      }
      if (player.changed.running != player.running) {
        statSend.r = player.running;
        player.changed.running = player.running;
      }
      if (lobby.matchInProgress) socket.emit("s", statSend);
      showCount = 0;
      player.renderDistCalc();
    }
    requestAnimationFrame( draw );
  }

  //frameIntervalID = setInterval(draw, 1000/targetFPS);
  function setFps(target) {
    clearInterval(frameIntervalID);
    frameIntervalID = setInterval(draw, 1000/target);
  }
