socket = io({transports: ['websocket'], upgrade: false, reconnection: false});
socketDisconnected = false;

socket.on('disconnect', function () {
  socketDisconnected = true;
  listener.setMasterVolume(0);
});

socket.on("wait pls", function() {
  lobby.matchInProgress = true;
  lobby.message = "Match already in progress... please wait...";
});

socket.on('stop waiting', function() {
  lobby.stopWaiting = true;
  lobby.message = "<<< The Match ended! Refresh and join the lobby before it starts again! >>>";
});

socket.on('allPlayers', function(data) {
  playerID = data.id;
  for (var i = 0; i <= data.ids.length - 1; i++) {
    players.push(new Guest(data.ids[i]));
    if (data.ids[i] == data.id) player = players[i];
  }
  playersReady = data.ready;
  for (var i = data.prefs.length - 1; i >= 0; i--) {
    if (data.prefs[i] == "killer") killerNum++;
    else if (data.prefs[i] == "survivor") survivorNum++;
    players[i].pref = data.prefs[i];
  }
  lobby.matchInProgress = false;
});

socket.on('readiness', function(data){
  playersReady = data;
});

socket.on('gameStart', function(data) {
  if (lobby.stopWaiting) {
    lobby.message = "You missed the new lobby.... wait for the NEXT one... dumby...";
    return; //you missed the lobby.....
  }
  if (lobby.preference == "killer") {
    if (weaponNameIndex != 0) socket.emit("wI",weaponNameIndex);
  }
  joinGame();
});

socket.on("wI", function(data){
  for (var i = 0; i < players.length; i++) {
    if (players[i].isKiller) players[i].switchWeapon(weaponNamesActual[data]);
  }
});

socket.on('newPlayer', function(id) {
  if (finalMessage != "") {
    finalMessage += " (Someone joined the lobby!)"; //only if someone refreshed from CURRENT game... not if there are waiters
  } else {
    if (playerID != id) {
      if (!lobby.matchInProgress) players.push(new Guest(id));
    }
  }
});

socket.on("prefBack", function(data){
  var oldPref = players[pIndex(data.id)].pref;
  players[pIndex(data.id)].pref = data.pref;
  if (players[pIndex(data.id)].pref == "killer") killerNum++;
  else if (players[pIndex(data.id)].pref == "survivor") survivorNum++;
  if (oldPref != undefined) {
    if (oldPref == "killer") killerNum--;
    else if (oldPref  == "survivor") survivorNum--;
  }
});

socket.on("s", function(data){ //in game data
  for (var i = 0; i <= data.length - 1; i++) {
    if (i != pIndex(playerID)) {
      players[i].oldPos.set(players[i].pos.x,players[i].pos.y,players[i].pos.z);
      players[i].pos.set(data[i].s[0],data[i].s[1],data[i].s[2]);
      players[i].looking.y = data[i].s[3];
      if (data[i].r != undefined) players[i].running = data[i].r;
      if (data[i].c != undefined) players[i].crouching = data[i].c;
    }
  }
});

socket.on("attack", function(id) {
  if (player.id != pIndex(id)) players[pIndex(id)].weapon.weaponFrame = 1; //begin charge up
});

socket.on("attack release", function(id) { //used to set twice if killer... with lag lunge glitched may happen
  if (player.id != pIndex(id)) if (id != playerID) players[pIndex(id)].weapon.weaponFrame = 12; //stop charging/lunging... and swing
});

socket.on("hit", function(data) {
  players[pIndex(data.to)].gotHit(pIndex(data.to));
  players[pIndex(data.from)].weapon.hitStunFrames = 1;
});

socket.on("revive done", function(data) {
  players[pIndex(data.to)].gotHit(pIndex(data.to),"injured");
  players[pIndex(data.to)].dyingTime.last = undefined;
  players[pIndex(data.to)].revive = {left: 0, last: undefined, reviving: undefined, gettingRevived: undefined};
  players[pIndex(data.from)].revive = {left: 0, last: undefined, reviving: undefined, gettingRevived: undefined};
});

socket.on("revive start", function(data) {
  players[pIndex(data.to)].revive.gettingRevived = data.from;
  players[pIndex(data.from)].revive.reviving = data.to;
});

socket.on("revive end", function(data) {
  players[pIndex(data.to)].revive.gettingRevived = undefined;
  players[pIndex(data.from)].revive.reviving = undefined;
  players[pIndex(data.to)].revive.left = data.progress; //so tab offs stay updated.
});

socket.on("gen start", function(data){
  generators[data].playersHitting++;
  if (generators[data].damaged) generators[data].damaged = false;
});

socket.on("gen checkup", function(data) {
  for (var i = generators.length - 1; i >= 0; i--) {
    if (!generators[i].done) generators[i].progress = data[i];
  }
});

socket.on("gen skill check", function(data) {
  generators[data.genI].progress += data.val;
  if (data.val == -0.1) {
    var genMesh = generators[data.genI].mesh;
    genFailSound.panner.setPosition(genMesh.position.x,genMesh.position.y,genMesh.position.z);
    genFailSound.play();
  }
});

socket.on("gen end", function(data) {
  generators[data.genI].playersHitting--;
  if (generators[data.genI].playersHitting == 0) generators[data.genI].startTime = undefined;
});

socket.on("gen damage start", function(genI) {
  generators[genI].damaged = true;
  for (var i = players.length - 1; i >= 0; i--) {
    if (players[i].repair.genNum == genI) {
      if (players[i].id == playerID) {
        players[i].repair.genNum = undefined;
        player.repair.frame = 180 + Math.floor((Math.random() - 0.5) * 30);
        player.repair.sweetSpot = 52 - Math.floor(Math.random() * 22);
        player.repair.skillCheckFrame = 0;
      }
    }
  }
  generators[genI].playersHitting = 0;
  generators[genI].startTime = undefined;
  var genMesh = generators[genI].mesh;
  genDamageSound.panner.setPosition(genMesh.position.x,genMesh.position.y,genMesh.position.z);
  genDamageSound.play();
});

socket.on("gen stun anim", function(id) {
  if (player.id != id) players[pIndex(id)].weapon.genStunFrames = 1;
});

socket.on("gen done", function(data) {
  generators[data].progress = 1;
  generators[data].done = true;
  generators[data].mesh.material.color.setRGB(-100,100,0); //glowing green
  scene.add(generators[data].light);
  gensLeft--;
  if (gensLeft < 0 && gensLeft >= -3) doorSpeedConst -= 5000;
  var genMesh = generators[data].mesh;
  genDoneSound.panner.setPosition(genMesh.position.x,genMesh.position.y,genMesh.position.z);
  genDoneSound.play();
});

socket.on("door start", function(doorI){
  doors[doorI].playersHitting = 1;
});

socket.on("door end", function(data) {
  doors[data.doorI].playersHitting = 0;
  doors[data.doorI].progress = data.progress;
});

socket.on("door completion", function(data) {
  doors[data.doorI].completion = data.num;
  if (data.num == 1) doors[data.doorI].lightbulbs[2 - Number(doors[data.doorI].p[0] < 0)].material.color.setHex(0x00ff00);
  if (data.num == 2) doors[data.doorI].lightbulbs[0].material.color.setHex(0x00ff00);
  if (data.num == 3) {
    doors[data.doorI].lightbulbs[1 + Number(doors[data.doorI].p[0] < 0)].material.color.setHex(0x00ff00);
    doors[data.doorI].done = true;
  }
});

socket.on("he dead", function(id) {
  players[id].end("bad");
});

socket.on("escaped", function(id) {
  players[id].end("good");
});

socket.on("end game", function(data) {
  disableMouseLock = true;
  //kill all sounds
  listener.setMasterVolume(0);
  if (data[0] == -1) finalMessage = "The killer ghosted on yall (disconnected)";
  else if (data[1] == 0 && data[2] > 2) finalMessage = "Everyone died.";
  else if (data[1] == 0 && data[0] == 1) finalMessage = "He died a lonely death.";
  else if (data[1] == 1 && data[0] == 0) finalMessage = "He escaped by himself.";
  else if (data[1] > 0 && data[0] > 0) finalMessage = data[1] + " out of " + (data[0] + data[1]) + " made it out.";
  else if (data[1] > 0 && data[0] == 0) finalMessage = "The \"killer\" clearly needs a new name...";
  else finalMessage = "if you see this the game has no idea how the match ended (this is a bug!)";
});

socket.on('leave', function(id) {
  if (players.length == 0) return; //if end game hit first and already cleared all players
  var index = pIndex(id);
  if (players[index] != undefined) if (players[index].pref != undefined) {
    if (players[index].pref == "survivor") survivorNum--;
    else if (players[index].pref == "killer") killerNum--;
  }
  if (players[index].isGuest == undefined) {
    scene.remove(players[index].mesh.body);
    players[index].mesh.body.geometry.dispose();
    players[index].mesh.body.material.dispose();
    scene.remove(players[index].mesh.head);
    players[index].mesh.head.geometry.dispose();
    players[index].mesh.head.material.dispose();
    if (players[index].isKiller) {
      scene.remove(players[index].weapon.mesh);
      players[index].weapon.mesh.children[0].geometry.dispose();
      players[index].weapon.mesh.children[0].material.dispose();
    }
  }
  players.splice(index,1);
});

function joinGame() { //leave lobby screen and join game;
  if (finalMessage != "") return; //dont let restart for confusion sake...
  for (var i = players.length - 1; i >= 0; i--) {
    players[i] = new Player(players[i].id, players[i].pref == "killer");
    if (playerID == players[i].id) player = players[i];
  }
  lobby.screen = false;
  lobby.matchInProgress = true;
  finalMessage = "";
  disableMouseLock = false;
  gensLeft = players.length;
  doorSpeedConst = 3e4 + (players.length - 2) * 9000;
}

function pIndex(id) {
  for (var i = players.length - 1; i >= 0; i--) {
    if (players[i].id == id) return i;
  }
}
