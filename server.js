//if (pIndex(socket.id) == -1) return; //player is gone... ignore updates from long dead players

const express = require('express');
const socketIO = require('socket.io');
const path = require('path');
const PORT = process.env.PORT || 3000;

const server = express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))

const io = socketIO(server);

players = [];
waiters = []; //not table waiters... lobby waiters.
generators = [];
doors = [];
playersReady = 0;
var matchInProgress = false;

var doorSpeedConst = 3e4; //3e4;
var genSpeedConst = 5e4; //5e4;

function uptime() {
  return process.uptime() * 1000;
}

function Waiter (socket) {
  this.socket = socket;
  this.newMatch = function () {
    players.push(new Player(socket));
    var ids = [];
    var prefs = [];
    for (var i = players.length - 1; i >= 0; i--) {
      ids.splice(0,0,players[i].socket.id);
      prefs.splice(0,0,players[i].pref);
    }
    socket.emit("allPlayers",{id:socket.id,ids:ids,prefs:prefs});
    sendPlayers("newPlayer",socket.id);
  }
}

function Generator () {
  this.done = false;
  this.progress = 0;
  this.damaged = false;
  this.playerIds = []; //check if a disconnected player hit a gen without... unhitting
  this.startTime = undefined;
  this.playersHitting = 0;
}

function Door () {
  this.done = false;
  this.progress = 0;
  this.playerID = undefined
  this.startTime = undefined;
  this.playersHitting = 0;
  this.completion = 0;
}

function Player (socket) {
  this.socket = socket;
  this.pref = undefined;
  this.ready = false;
  this.health = "healthy";
  this.id = socket.id; //il probably forget the name's different between server and client
  this.pos = {x:0,y:-300,z:0};
  this.looking = {y:0};
  this.runnning = false;
  this.crouching = false;
  this.revive = {left: 0, last: undefined, reviving: undefined, gettingRevived: false};
  this.isKiller = false;
  this.untilHitFrames = undefined;
  this.gameMode = 0;
	this.changed = {crouching:false,running:false};

  this.hitCheck = function(playerI) {
    if (this.untilHitFrames != undefined) this.untilHitFrames--;
    if (this.isKiller &&  this.untilHitFrames === 0) {
      for (var i = players.length - 1; i >= 0; i--) {
        if (i == playerI) continue;
        if (dist2(this.pos.x,this.pos.z,players[i].pos.x,players[i].pos.z) < 3000 &&
        Math.abs(this.pos.y - players[i].pos.y) < 30 &&
        Math.abs(angleBetween(-this.pos.x + players[i].pos.x,-this.pos.z + players[i].pos.z,Math.sin(this.looking.y),Math.cos(this.looking.y))) > 3.14 - 0.325) {
          sendPlayers("hit", {to:players[i].id,from:players[playerI].id});
          if (players[i].health == "healthy") players[i].health = "injured";
          else if (players[i].health == "injured") players[i].health = "dying";
          else if (players[i].health == "dying") players[i].health = "healthy";
          players[playerI].socket.emit("nice hit", players[playerI].id); //you cold hearted killer! have some stun
          //check if this is the last hit for good (all others dying and a dying hit)
          var amountAlive = 0;
          var amountDying = 0; //i did it like this cause some players are gm 1 and still in player array
      		for (var i = players.length - 1; i >= 0; i--) {
      			if ((players[i].health == "injured" || players[i].health == "healthy") && !players[i].isKiller) amountAlive++;
            if (players[i].health == "dying") amountDying++;
      		}
      		if (amountAlive == 0) {
            dead += amountDying;
            sendPlayers("end game",[dead,escaped,initialPlayers]);
            setup();
            return true;
          }
        }
      }
    }
    if (this.untilHitFrames === 0) this.untilHitFrames = undefined;
  }
}

function pIndex(id) {
  for (var i = players.length - 1; i >= 0; i--) {
    if (players[i].socket.id == id) return i;
  }
  return -1;
}

function angleBetween(x1,y1,x2,y2) {
  var a2 = Math.atan2(y1, x1);
  var a1 = Math.atan2(y2, x2);
  var sign = a1 > a2 ? 1 : -1;
  var angle = a1 - a2;
  var K = -sign * Math.PI * 2;
  var angle = (Math.abs(K + angle) < Math.abs(angle))? K + angle : angle;
  return angle;
}

function dist2 (x,y,x2,y2) {
  return Math.pow((x2 - x),2) + Math.pow((y2 - y),2);
}

function gameStart () {
  matchInProgress = true;
  for (var i = players.length - 1; i >= 0; i--) {
    players[i].ready = false;
  }
  playersReady = 0;
  initialPlayers = players.length;
  gensLeft = players.length;
  doorSpeedConst = 3e4 + (players.length - 2) * 9000;
  sendPlayers("gameStart");
}

function sendPlayers (message, data) {
  for (var i = 0; i < players.length; i++) {
   io.to(players[i].id).emit(message,data);
  }
}

function setup() {
  matchInProgress = false;
  for (var i = 0; i < waiters.length; i++) {
   io.to(waiters[i].socket.id).emit('stop waiting');
  }
  generators = [];
  for (var i = 0; i < 9; i++) {
    generators.push(new Generator());
  }
  doors = [];
  for (var i = 0; i < 2; i++) {
    doors.push(new Door());
  }
  players = [];
  dead = 0;
  escaped = 0;
}

io.on('connection', function(socket) {
  if (!matchInProgress) {
  players.push(new Player(socket));
  var ids = [];
  var prefs = [];
  for (var i = players.length - 1; i >= 0; i--) {
    ids.splice(0,0,players[i].socket.id);
    prefs.splice(0,0,players[i].pref);
  }
  socket.emit("allPlayers",{id:socket.id,ids:ids,prefs:prefs,ready:playersReady});
  sendPlayers("newPlayer",socket.id);
  } else {
    waiters.push(new Waiter(socket));
    socket.emit("wait pls",socket.id);
  }

  socket.on('s', function(data) {
    if (pIndex(socket.id) == -1) return;
    players[pIndex(socket.id)].pos = {x:data.s[0],y:data.s[1],z:data.s[2]};
    players[pIndex(socket.id)].looking.y = data.s[3];
    if (data.r != undefined) players[pIndex(socket.id)].running = data.r;
    if (data.c != undefined) players[pIndex(socket.id)].crouching = data.c;
  });

  socket.on("pref", function(data) {
    if (pIndex(socket.id) == -1) return;
    if (players[pIndex(socket.id)].ready) {
      playersReady--;
      sendPlayers("readiness",playersReady);
    }
    players[pIndex(socket.id)].ready = false;
    players[pIndex(socket.id)].pref = data;
    players[pIndex(socket.id)].isKiller = data == "killer";
    sendPlayers("prefBack", {pref:data, id:socket.id});
  });

  socket.on("wI", function(data) {
    if (pIndex(socket.id) == -1) return;
    sendPlayers("wI", data);
  });

  socket.on("gen damage start", function(genI){
    if (pIndex(socket.id) == -1) return;
    generators[genI].damaged = true;
    generators[genI].playersHitting = 0;
    generators[genI].playerIds = [];
    generators[genI].startTime = undefined;
    sendPlayers("gen damage start", genI);
  });

  socket.on("gen stun anim", function(genI) {
    if (pIndex(socket.id) == -1) return;
    sendPlayers("gen stun anim", socket.id);
  });

  socket.on("ready", function(data) {
    var index = pIndex(socket.id);
    if (data && players[index].ready == false) playersReady++;
    else if (data == false && players[index].ready) playersReady--;
    players[index].ready = data;
    sendPlayers("readiness",playersReady);

    //start a new game (unlike setup(), before player data is collected)
    if (players.length > 1 && playersReady == players.length && !matchInProgress) {
      gameStart();
    }
  });

  socket.on("never forget me", function(data) { //no "end game" here cause if the last person is dying its ALREADY over.
    if (pIndex(socket.id) == -1) return;
    dead++;
    players[data].gameMode = 1;
    players[data].health = "dead";
    sendPlayers("he dead", data);
  });

  socket.on("fuck all of yalls", function(data) {
    if (pIndex(socket.id) == -1) return;
    escaped++;
    players[data].gameMode = 1;
    players[data].health = "escaped";
    if (dead + escaped == initialPlayers - 1) {
    sendPlayers("end game",[dead,escaped,initialPlayers]);
    setup();
    } else {
      var amountAlive = 0;
      var amountDying = 0;
      for (var i = players.length - 1; i >= 0; i--) {
        if ((players[i].health == "injured" || players[i].health == "healthy") && !players[i].isKiller) amountAlive++;
        if (players[i].health == "dying") amountDying++;
      }
      if (amountAlive == 0) {
        dead += amountDying;
        sendPlayers("end game",[dead,escaped,initialPlayers]);
        setup();
      } else {
        sendPlayers("escaped", data);
      }
    }
  });

  socket.on("attack", function() {
    if (pIndex(socket.id) == -1) return;
    sendPlayers("attack",socket.id);
  });

  socket.on("attack release", function() { //message is sent, but untilHitFrames is still 0, but assigning to correct player
    if (pIndex(socket.id) == -1) return;
    sendPlayers("attack release",socket.id);
    players[pIndex(socket.id)].untilHitFrames = 4;
  });


  socket.on("revive start", function(data) { //from and to (ids)
    if (pIndex(socket.id) == -1) return;
    players[pIndex(data.to)].revive.gettingRevived = data.from;
    players[pIndex(data.from)].revive.reviving = data.to;
    sendPlayers("revive start", data);
  });

  socket.on("revive end", function(data) {
    if (pIndex(socket.id) == -1) return;
    players[pIndex(data.to)].revive.gettingRevived = undefined;
    players[pIndex(data.from)].revive.reviving = undefined;
    players[pIndex(data.to)].revive.last = undefined;
    players[pIndex(data.to)].health = "injured";
    sendPlayers("revive end", data);
  });

  socket.on("gen start", function(genI) {
    if (pIndex(socket.id) == -1) return;
    if (generators.length) {
    generators[genI].damaged = false;
    generators[genI].startTime = uptime();
    sendPlayers("gen start", genI);
    generators[genI].playerIds.push(socket.id);
    generators[genI].playersHitting++;
    }
  });

  socket.on("door start", function(doorI) {
    if (pIndex(socket.id) == -1) return;
    sendPlayers("door start", doorI);
    doors[doorI].playerID = socket.id;
    doors[doorI].playersHitting = 1;
  });

  socket.on("door end", function(doorI) {
    if (pIndex(socket.id) == -1) return;
    sendPlayers("door end", {doorI:doorI,progress:doors[doorI].progress});
    doors[doorI].playerID = undefined;
    doors[doorI].playersHitting = 0;
    doors[doorI].startTime = undefined;
  });

  socket.on("gen skill check", function(data) {
    if (pIndex(socket.id) == -1) return;
    if (generators.length) {
    sendPlayers("gen skill check", {genI:data.genI,val:data.val});
    generators[data.genI].progress += data.val;
    }
  });

  socket.on("gen end", function(genI) {
    if (pIndex(socket.id) == -1) return;
    if (generators.length) {
    sendPlayers("gen end", {id:socket.id, genI:genI});
    generators[genI].playersHitting--;
    generators[genI].playerIds.splice(generators[genI].playerIds.indexOf(socket.id),1);
    if (generators[genI].playersHitting == 0) generators[genI].startTime = undefined;
    }
  });

  socket.on('disconnect', function() {
    //deal with waiters first... no need to finnick with code below which assumes youre a player...
    for (var i = waiters.length - 1; i >= 0; i--) {
       if (waiters[i].socket.id == socket.id) {
        waiters.splice(i,1);
        return;
      }
    }
    if (pIndex(socket.id) == -1) return; //clearly the game was reset....
    var pI = pIndex(socket.id);
    //carry out matchInProgress implications of disconnect
    if (matchInProgress) {
      if (players[pI].gameMode == 0) { //not a spectator
        if (!players[pI].isKiller) dead++;
        if (players[pI].pref == "killer") { //killer left? end game
          sendPlayers("end game",[-1,0,0]);
          setup();
          return;
        }
        else if (dead + escaped == initialPlayers - 1) {
          sendPlayers("end game",[dead,escaped,initialPlayers]); //last survivor left? end game
          setup();
          return;
        } else {
          //last non-dying survivor left? end game
          var amountAlive = 0;
          var amountDying = 0;
          for (var i = players.length - 1; i >= 0; i--) {
            if (pI == i) continue; //the discon could be not dying... hes not removed from players[] until the very end so consider him
            if ((players[i].health == "injured" || players[i].health == "healthy") && !players[i].isKiller) amountAlive++;
            if (players[i].health == "dying") amountDying++;
          }
          if (amountAlive == 0) {
            dead += amountDying;
            sendPlayers("end game",[dead,escaped,initialPlayers]);
            setup();
            return;
          }
        }
      }
      //in match revive leave loose ends clean up
      if (players[pI].revive.reviving) {
        if (pIndex(players[pI].revive.reviving) > -1) { //for if the player being revived already left
          players[pIndex(players[pI].revive.reviving)].revive.gettingRevived = undefined;
          players[pIndex(players[pI].revive.reviving)].revive.last = undefined;
          sendPlayers("revive end", {from:socket.id,to:players[pI].revive.reviving, progress:players[pIndex(players[pI].revive.reviving)].revive.left});
        }
        players[pI].revive.reviving = undefined; //who cares they leaving anyways... WELL I CARE
      }
      //in match generator leave loose ends clean up
      for (var i = generators.length - 1; i >= 0; i--) {
        if (generators[i].playerIds.length > 0) {
          if (generators[i].playerIds.indexOf(socket.id) > -1) {
            console.log("stopped " + socket.id + " from hitting gen " + i);
            sendPlayers("gen end", {id:socket.id, genI:i});
            generators[i].playersHitting--;
            generators[i].playerIds.splice(generators[i].playerIds.indexOf(socket.id),1);
            if (generators[i].playersHitting == 0) generators[i].startTime = undefined;
          }
        }
      }
      for (var i = 0; i < doors.length; i++) {
        if (doors[i].playerID == socket.id) {
          sendPlayers("door end", {doorI:i,progress:doors[i].progress});
          doors[i].playerID = undefined;
          doors[i].playersHitting = 0;
          doors[i].startTime = undefined;
        }
      }
    }
    //carry out !matchInProgress implications of disconnecting
    var forceStart = false;
    if (playersReady == players.length - 1 && players[pI].ready == false) { //does this disconnect allow for a LEGAL game start?
      var allPrefs = true;
      var killers = 0;
      for (var i = 0; i < players.length; i++) {
        if (i == pI) continue;
        if (players[i].pref == undefined) allPrefs = false;
        if (players[i].pref == "killer") killers++;
      }
      if (players.length - 1 >= 2 && allPrefs && killers == 1) forceStart = true;
    }
    if (players[pI].ready) playersReady--;

    players.splice(pI,1);
    sendPlayers("leave", socket.id);
    if (forceStart) gameStart();
  });
});

frameCount = 0;

setup();
setInterval( function() {
  frameCount++;
  if (matchInProgress) {
    var info = [];
    for (var i = players.length - 1; i >= 0; i--) {
      var statSend = {s:[players[i].pos.x,players[i].pos.y,players[i].pos.z,players[i].looking.y]};
      if (players[i].changed.crouching != players[i].crouching) {
        statSend.c = players[i].crouching;
        players[i].changed.crouching = players[i].crouching;
      }
      if (players[i].changed.running != players[i].running) {
        statSend.r = players[i].running;
        players[i].changed.running = players[i].running;
      }
      info.splice(0,0,statSend);
    }
    for (var i = players.length - 1; i >= 0; i--) { //s for stats... but i wanna save 4 bytes.
       io.to(players[i].id).emit('s', info);
    }
  }
  var genProg = [];
  for (var i = generators.length - 1; i >= 0; i--) { //hitting gens
    if (generators[i].damaged) {
      if (generators[i].startTime) generators[i].progress -= ((uptime() - generators[i].startTime) / genSpeedConst) / 4;
      generators[i].startTime = uptime();
      if (generators[i].progress <= 0) {
        generators[i].progress = 0;
        generators[i].damaged = false;
        generators[i].startTime = undefined;
      }
    }
    if (generators[i].playersHitting > 0 && !generators[i].done) {
        if (generators[i].startTime) generators[i].progress += (uptime() - generators[i].startTime) / genSpeedConst * generators[i].playersHitting;
        generators[i].startTime = uptime();
      if (generators[i].progress > 1) {
        sendPlayers("gen done", i);
        generators[i].done = true;
        gensLeft--;
        if (gensLeft < 0 && gensLeft >= -3) doorSpeedConst -= 5000;
      }
    }
    if (frameCount % 180 == 0) genProg.splice(0,0,generators[i].progress); //for the cheaters who tabbed out mid game D:<
  }
  if (generators.length) if (frameCount % 180 == 0) sendPlayers("gen checkup", genProg);

  for (var i = doors.length - 1; i >= 0; i--) {
    if (doors[i].playersHitting == 1) {
      if (doors[i].startTime != undefined) doors[i].progress += (uptime() - doors[i].startTime) / doorSpeedConst;
      doors[i].startTime = uptime();
      if (doors[i].progress * 3 > 1 && doors[i].completion == 0) {
        sendPlayers("door completion", {doorI:i, num: 1});
        doors[i].completion++;
      } if (doors[i].progress * 3 > 2 && doors[i].completion == 1) {
        sendPlayers("door completion", {doorI:i, num: 2});
        doors[i].completion++;
      } if (doors[i].progress >= 1 && doors[i].completion == 2) {
        sendPlayers("door completion", {doorI:i, num: 3});
        doors[i].completion++;
      }
    }
    if (doors[i].playersHitting == 0) {
      if (doors[i].progress > 0 && doors[i].progress < 0.33 || doors[i].progress >= 0.34 && doors[i].progress < 0.66 || doors[i].progress >= 0.67 &&
       doors[i].progress < 1) doors[i].progress = Math.floor(doors[i].progress * 3) / 3;
    }
  }

  for (var i = players.length - 1; i >= 0; i--) { //revives
    if (players[i].revive.gettingRevived) {
      if (players[i].revive.last) players[i].revive.left += (uptime() - players[i].revive.last);
      players[i].revive.last = uptime();
      if (players[i].revive.left > 10e3) {
        sendPlayers("revive done", {to:players[i].id, from:players[i].revive.gettingRevived});
        players[i].revive = {left: 0, last: undefined, reviving: undefined, gettingRevived: false};
      }
    }
  }

  for (var i = players.length - 1; i >= 0; i--) {
    if (players[i].hitCheck(i)) break; //if last survivor fatal hit, leave loop as all players were destroyed already...
  }
},1000 / 60);
