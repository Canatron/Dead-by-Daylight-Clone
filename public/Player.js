function Player(id, isKiller) {
	if (isKiller == undefined) isKiller = false;
	this.id = id;
	this.isKiller = isKiller;
	this.mesh = {rotation: {y:0}};
	this.mesh.body = new THREE.Mesh(new THREE.BoxBufferGeometry(11 + Number(this.isKiller) * 1.5,24 + Number(this.isKiller) * 6,11 + Number(this.isKiller) * 1.5),new THREE.MeshLambertMaterial({color:0xffffff}));
	this.mesh.head = new THREE.Mesh(new THREE.BoxBufferGeometry(11 + Number(this.isKiller) * 1.5,11 + Number(this.isKiller) * 1.5,11 + Number(this.isKiller) * 1.5),new THREE.MeshLambertMaterial({color:0xffffff}));
	this.mesh.head.material.transparent = true;
	this.mesh.body.material.transparent = true;
	this.mesh.head.receiveShadow = true;
	this.mesh.body.receiveShadow = true;
	if (id != playerID) {
		scene.add(this.mesh.body);
		scene.add(this.mesh.head);
	}
	var spawnI = Math.floor(Math.random() * spawnPoints.length);
	if (!isKiller) this.pos = new THREE.Vector3(spawnPoints[spawnI].x,spawnPoints[spawnI].y + 10,spawnPoints[spawnI].z);
	else this.pos = new THREE.Vector3(0,30,0);
	this.oldPos = this.pos.clone();
	this.originalPos = this.pos.clone();
	this.looking = new THREE.Vector3(0,0,0);
	this.lookDir = camera.getWorldDirection(new THREE.Vector3( 0, 0, - 1 ));
	this.dir = new THREE.Vector2(0,0);
	this.vel = new THREE.Vector3(0,0,0);
	this.runVel = new THREE.Vector2(0,0);
	this.lastMoveTime = undefined;
  	if (this.isKiller) this.weapon = new Gun("mace");
  	this.health = "healthy";
	this.speed = 1.5 * (1 + Number(this.isKiller) * 0.15);
	this.currentSpeed = 0;
	this.speedMax = this.speed;
	this.acceleration = 0.2;
	this.friction = 0.8;
	this.airFriction = 0.90;
	this.grounded = true;
	this.height = 20 + Number(this.isKiller) * 5;
	this.vaulting = [];
	this.vaultInitialPos = this.pos.clone();
	this.vaultingTimeMax = (40 + Number(this.isKiller) * 50) * 16.666;
	this.vaultingLastTime = undefined;
	this.vaultingTime = 0;
	this.running = false; //1.6x speed
	this.crouching = false;
	this.fov = 75;
	this.power = 1;
	this.boostFrames = 0;
	this.dyingTime = {left: 120e3, last: undefined};
	this.revive = {left: 10e3, last: undefined, reviving: undefined, gettingRevived: undefined};
	this.repair = {
		genNum: undefined,
		frame: 180 + Math.floor((Math.random() - 0.5) * 30), //hitting the gen, determines frequency of skill check
		sweetSpot: 52 - Math.floor(Math.random() * 22), //what frame is great zone
		skillCheckFrame: 0
	};
	this.switch = {
		num: undefined,
	};
	this.stepDist = 45;
	this.totalStepDist = 0;
	this.steppingOn = 2; //grass 2 default
	this.changed = {crouching:false,running:false};

	this.gamemode = 0;
	this.spectating = {id:undefined,num:undefined};

	this.gotHit = function(playerI, state) {
		if (this.health == "healthy") this.health = "injured";
		else if (this.health == "injured") this.health = "dying";
		else if (this.health == "dying") this.health = "healthy";
		if (state) this.health = state; //for revive or insta dying/kills
		this.boostFrames = 70;

		if (this.repair.genNum != undefined) {
			socket.emit("gen end", this.repair.genNum);
			generators[this.repair.genNum].startTime = undefined;
			this.repair.genNum =  undefined;
			this.repair.frame = 180 + Math.floor((Math.random() - 0.5) * 30);
			this.repair.sweetSpot = 52 - Math.floor(Math.random() * 22);
			this.repair.skillCheckFrame = 0;
		} else if (this.switch.num != undefined) {
			socket.emit("door end", this.switch.num);
			doors[this.switch.num].startTime = undefined;
			this.switch.num =  undefined;
		}

		if (this.health == "healthy" && pIndex(playerID) != playerI) {
			this.mesh.body.rotation.set(0,0,0);
			this.mesh.head.rotation.set(0,0,0);
			this.mesh.head.material.color.setRGB(1,1,1);
			this.mesh.body.material.color.setRGB(1,1,1);
		}
		else if (this.health == "injured" && pIndex(playerID) != playerI) {
			this.mesh.body.rotation.set(0,0,0);
			this.mesh.head.rotation.set(0,0,0);
			this.mesh.head.material.color.setRGB(1,0.5,0.5);
			this.mesh.body.material.color.setRGB(1,0.5,0.5);
		}
		else if (this.health == "dying") {
			this.revive = {left: 0, last: undefined};
			this.dyingTime.last = performance.now();
			if (pIndex(playerID) != playerI) {
			this.mesh.body.rotation.set(0,0,0); //should fix death crawl weirdness...
			this.mesh.head.rotation.set(0,0,0);
			this.mesh.head.material.color.setRGB(1,0.3,0.3);
			this.mesh.body.material.color.setRGB(1,0.3,0.3);
			this.mesh.body.rotation.x = Math.PI / 2;
			this.mesh.head.rotation.x = Math.PI / 2;
			}
		}
	}

	this.move = function(playerI) {

		this.looking.copy(controls.looking());
		if (this.grounded) {
		this.vel.x *= this.friction;
		this.vel.z *= this.friction;
		this.runVel.x *= this.friction;
		this.runVel.y *= this.friction;
		} else {
		this.vel.x *= this.airFriction;
		this.vel.z *= this.airFriction;
		this.runVel.x *= this.airFriction;
		this.runVel.y *= this.airFriction;
		}
		if (shiftHeld) this.running = true;
		else this.running = false;
		this.speed = this.speedMax * (1 + Number(this.gamemode == 1) * 0.5);
		controls.sensitivity = sensitivity;
		if (this.running) this.speed *= 0.8;
		if (this.boostFrames > 0) {
			this.speed *= 1.6;
			this.boostFrames--;
		}
		if (this.health == "dying") {
			this.running = false; //no running while in dying state
			this.crouching = false;
			this.speed *= 0.2; //move very slowly
		}
		if (this.crouching) {
			//if (this.running && this.gamemode == 0) this.crouching = false;
			if (this.crouching) this.speed *= 0.6;
		}
		if (this.isKiller) {
			if (this.weapon.weaponFrame == 11 && this.weapon.weaponLungeTime.lungeTime > 0) { //it gets decremented by the time we get here
				this.speed *= 1.5;
			} else if (this.weapon.weaponLungeTime.lungeTime > 0) {
				if (this.weapon.weaponLungeTime.lungeTime > 600) this.weapon.weaponLungeTime.lungeTime = 600;
				this.speed *= 0.3;
				if (this.weapon.weaponLungeTime.lastFrameTime) this.weapon.weaponLungeTime.lungeTime -= performance.now() - this.weapon.weaponLungeTime.lastFrameTime;
				this.weapon.weaponLungeTime.lastFrameTime = performance.now();
				if (this.weapon.weaponLungeTime.lungeTime < 0) {
					this.weapon.weaponLungeTime.lungeTime = 0;
					this.weapon.weaponLungeTime.lastFrameTime = undefined;
				}
			}
			if (this.weapon.hitStunFrames > 0 || this.weapon.genStunFrames) {
				this.speed *= 0;
				this.running = false;
			}
		}
		if (this.vaulting.length > 0) {
			if (this.vaultingTime == 0) {
				this.vaultInitialPos.copy(this.pos);
				if (this.running) this.vaultingTimeMax = (40 + Number(this.isKiller) * 50) * 16.66;
				else if (this.crouching) this.vaultingTimeMax = (60 + Number(this.isKiller) * 70) * 16.66;
				else this.vaultingTimeMax = (50 + Number(this.isKiller) * 60) * 16.66;
			}
			if (this.vaultingLastTime == undefined) this.vaultingLastTime = performance.now();
			this.vaultingTime += performance.now() - this.vaultingLastTime;
			this.vaultingLastTime = performance.now();
			this.runVel.multiplyScalar(0.9);
			vec3.set(vaultJSON[this.vaulting[1]][0],0,vaultJSON[this.vaulting[1]][2]);
			this.oldPos.copy(this.pos); //so you dont glitch back from vaulting
			this.pos.x = (this.vaultInitialPos.x + (vec3.x-this.vaultInitialPos.x) * (this.vaultingTime/this.vaultingTimeMax));
			this.pos.z = (this.vaultInitialPos.z + (vec3.z-this.vaultInitialPos.z) * (this.vaultingTime/this.vaultingTimeMax));
			this.pos.y = this.vaultInitialPos.y + Math.sin(this.vaultingTime / this.vaultingTimeMax * Math.PI) * (15);
			if (this.vaultingTime > this.vaultingTimeMax) {
				this.vaulting = [];
				this.vaultingTime = 0;
				this.vaultingLastTime = undefined;
			}
		} else {//not currently vaulting? let them control movement
		if (this.gamemode == 0 && textureCount == undefined) this.vel.y += -0.15 * this.power; // gravity
		this.dir.y = Number( moveForward ) - Number( moveBackward );
		this.dir.x = Number( moveLeft ) - Number( moveRight );
		this.dir.normalize(); // this ensures consistent movements in all directions
		this.dir.rotateAround(new THREE.Vector2(0,0),-this.looking.y); //direction of movement changed by this direction facing
		this.runVel.x += -this.dir.x * this.speed * (Number(this.running) + 1) * this.acceleration;
		this.runVel.y += -this.dir.y * this.speed * (Number(this.running) + 1) * this.acceleration;
		var len = this.runVel.length();
		if (len > this.speed * (Number(this.running) + 1)) {
			this.runVel.x /= len / (this.speed * (Number(this.running) + 1));
			this.runVel.y /= len / (this.speed * (Number(this.running) + 1));
		}
		if (spaceHeld) {
			if (this.gamemode == 1) this.pos.y += this.speed;
		}
		if (this.health != "dying") {
		if (this.crouching) {
			if (this.height > 15 + Number(this.isKiller) * 5) {
				this.height -= 0.5;
				this.pos.y -= 0.5;
			}
		} else {
			if (this.height < 20 + Number(this.isKiller) * 5) {
				this.height += 0.25;
				this.pos.y += 0.25;
			}
		}
		} else this.height = 10;
		}
		if (this.crouching && this.gamemode == 1) this.pos.y += -this.speed;
		if (this.vel.y < -25 * this.power) this.vel.y = -25 * this.power; //constrain and add to pos
		if (this.lastMoveTime == undefined) this.lastMoveTime = performance.now() - 16.666; //variable time for run speed is nessesary
		var prevPos = new THREE.Vector2(this.pos.x,this.pos.z);
		this.pos.x += (this.runVel.x * (performance.now() - this.lastMoveTime) / 16.666) + this.vel.x;
		this.pos.y += this.vel.y;
		this.pos.z += (this.runVel.y * (performance.now() - this.lastMoveTime) / 16.666) + this.vel.z;
		//for step distance calculation (for grass sound)
		var travelled = prevPos.set(this.pos.x - prevPos.x,this.pos.z - prevPos.y).length();
		this.stepDist -= travelled;
		this.totalStepDist += travelled; //for walk loops
		if (this.stepDist < 0) {
			this.stepDist += 45;
			if (this.steppingOn == 2) {
				var grassSoundType = Math.floor(Math.random() * 4);
				var theSound = grassSounds[grassSoundType * 3 + grassSoundsNum[grassSoundType]];
				if (this.crouching) theSound.setVolume(0.07);
				else if (this.running) theSound.setVolume(1);
				else theSound.setVolume(0.3);
				theSound.play();
				if (grassSoundsNum[grassSoundType] == 2) grassSoundsNum[grassSoundType] = 0;
				grassSoundsNum[grassSoundType]++;
			} else if (this.steppingOn == 1 || this.steppingOn == 3 || this.steppingOn == 4) {
				var stoneSoundType = Math.floor(Math.random() * 4);
				var theSound = stoneSounds[stoneSoundType * 3 + stoneSoundsNum[stoneSoundType]];
				if (this.crouching) theSound.setVolume(0.07);
				else if (this.running) theSound.setVolume(1);
				else theSound.setVolume(0.3);
				theSound.play();
				if (stoneSoundsNum[stoneSoundType] == 2) stoneSoundsNum[stoneSoundType] = 0;
				stoneSoundsNum[stoneSoundType]++;
			}
		}
		this.lastMoveTime = performance.now();
		var tempVec = new THREE.Vector3(this.vel.x,this.vel.y,this.vel.z);
		tempVec.x += this.runVel.x;
		tempVec.z += this.runVel.y;
		this.currentSpeed = tempVec.length();
		//this.mesh.position.copy(this.pos);

		//killer freedom restriction
		if (this.isKiller) {
			if (this.pos.x > 1760) this.pos.x = 1760;
			else if (this.pos.x < -1160) this.pos.x = -1160;
		}
	}

	this.switchWeapon = function(name) {
		scene.remove(this.weapon.mesh);
		this.weapon = new Gun(name);
	}

	this.stepSoundCheck = function() {
		if (this.gamemode == 1) return;
		//for step distance calculation (for grass sound)
		this.stepDist -= Math.sqrt(dist2(this.oldPos.x,this.oldPos.z,this.pos.x,this.pos.z));
		if (this.stepDist < 0) {
			this.stepDist += 45;
			raycaster.set(this.pos,new THREE.Vector3(0,-1,0));
			raycaster.far = 10;
			raycaster.ray.origin.y -= this.height; //feet collide not head
			var intersections = raycaster.intersectObjects( map.objects );
			if (intersections.length > 0) this.steppingOn = intersections[0].object.t;

			if (this.steppingOn == 2) {
				var grassSoundsPositionalType = Math.floor(Math.random() * 4);
				var theSound = grassSoundsPositional[grassSoundsPositionalType * 4 + grassSoundsPositionalNum[grassSoundsPositionalType]];
				if (this.crouching) {
					theSound.setVolume(0.07);
					theSound.setMaxDistance(150); //200
				} else if (this.running) {
					theSound.setVolume(1);
					theSound.setMaxDistance(400); //750
				} else {
					theSound.setVolume(0.3);
					theSound.setMaxDistance(250); //450
				}
				theSound.panner.setPosition(this.mesh.body.position.x,this.mesh.body.position.y,this.mesh.body.position.z);
				theSound.play();
				if (grassSoundsPositionalNum[grassSoundsPositionalType] == 3) grassSoundsPositionalNum[grassSoundsPositionalType] = 0;
				grassSoundsPositionalNum[grassSoundsPositionalType]++;
			} else if (this.steppingOn == 1 || this.steppingOn == 3 || this.steppingOn == 4) {
				var stoneSoundsPositionalType = Math.floor(Math.random() * 4);
				var theSound = stoneSoundsPositional[stoneSoundsPositionalType * 4 + stoneSoundsPositionalNum[stoneSoundsPositionalType]];
				if (this.crouching) {
					theSound.setVolume(0.07);
					theSound.setMaxDistance(150);
				} else if (this.running) {
					theSound.setVolume(1);
					theSound.setMaxDistance(400);
				} else {
					theSound.setVolume(0.3);
					theSound.setMaxDistance(250);
				}
				theSound.panner.setPosition(this.mesh.body.position.x,this.mesh.body.position.y,this.mesh.body.position.z);
				theSound.play();
				if (stoneSoundsPositionalNum[stoneSoundsPositionalType] == 3) stoneSoundsPositionalNum[stoneSoundsPositionalType] = 0;
				stoneSoundsPositionalNum[stoneSoundsPositionalType]++;
			}
		}
	}

	this.collide = function() {
		if (this.vaulting.length == 0) {
			var isGrounded = false;
			raycaster.set(this.pos,new THREE.Vector3(0,-1,0));
			raycaster.far = 10;
			raycaster.ray.origin.y -= this.height; //feet collide not head
			var intersections = raycaster.intersectObjects( map.objects );
			var onBox = intersections.length > 0;
			if (onBox) {
				isGrounded = true;
				this.steppingOn = intersections[0].object.t;
				var distToTop = 10 - intersections[0].distance;
				this.pos.y += distToTop;
				this.vel.y = 0;
			}

			var lookVec = vec3;
			lookVec.set(Math.cos(this.looking.y),0,Math.sin(this.looking.y));

			for (var i = 4; i > 0; i--) {
				raycaster.set(this.pos,lookVec);
				raycaster.far = 10;
				raycaster.ray.origin.y -= this.height / 1.1; //leg area collision sideways like.
				var intersections = raycaster.intersectObjects( map.objects );
				if (intersections.length > 0) {
					var cow = intersections[0];
					var distToTop = 10 - cow.distance;
					var theNormal = cow.face.normal;
					euler.set(cow.object.rotation.x,cow.object.rotation.y,cow.object.rotation.z);
					theNormal.applyEuler(euler);
					this.pos.add(theNormal.multiplyScalar(distToTop));
				}
				lookVec.applyAxisAngle(Yaxis, Math.PI / 2);
			}
			//this.oldPos.copy(this.pos);
			for (var i = 1; i > 0; i--) { //continous collision. phasing possible with multiple walls...
				vec3.copy(this.oldPos);
				var deltaPos = this.pos.clone();
				deltaPos.sub(this.oldPos);
				var deltaDist = deltaPos.length() + 0.01;
				raycaster.set(vec3,deltaPos.normalize());
				raycaster.far = deltaDist;
				raycaster.ray.origin.y -= this.height / 1.2; //leg area collision sideways like.
				var intersections = raycaster.intersectObjects( map.objects );
				if (intersections.length > 0) {
					cow = intersections[0];
					var distToTop = deltaDist - cow.distance;
					var theNormal = cow.face.normal;
					euler.set(cow.object.rotation.x,cow.object.rotation.y,cow.object.rotation.z);
					theNormal.applyEuler(euler);
					this.pos.add(theNormal.multiplyScalar(distToTop));
					intersections.splice(0,1);
				}
				this.oldPos.copy(this.pos);
			}
		}
	}

	this.update = function() {
		if (this.dyingTime.left < 0 && this.gamemode == 0) {
			socket.emit("never forget me", pIndex(playerID));
			this.gamemode = 1;
			listener.setMasterVolume(0);
			this.vel.set(0,0,0);
		}
		if ((this.pos.x > 1770 || this.pos.x < -1250) && this.gamemode == 0 && !this.isKiller) {
			socket.emit("fuck all of yalls", pIndex(playerID));
			this.gamemode = 1;
			listener.setMasterVolume(0);
			this.vel.set(0,0,0);
		}

		if (this.repair.genNum != undefined) {
			if (this.repair.frame > 0) this.repair.frame--;
			if (this.repair.frame == 0) {
				this.repair.skillCheckFrame++;
				if (spaceHeld) { //did you do well?
					var outcome = -0.1;
					if (this.repair.skillCheckFrame > this.repair.sweetSpot - 3 && this.repair.skillCheckFrame <= this.repair.sweetSpot) {
						outcome = 0.05;
						indicatorMsg = new skillCheckResponse("Great Check! +5%");
					} else if (this.repair.skillCheckFrame > this.repair.sweetSpot - 10 && this.repair.skillCheckFrame <= this.repair.sweetSpot) {
						outcome = 0.025;
						indicatorMsg = new skillCheckResponse("Good Check. +2.5%");
					} else {
						outcome = -0.1;
						if (this.repair.skillCheckFrame == 1) indicatorMsg = new skillCheckResponse("Don't HOLD space! Press space when prompted!");
						else indicatorMsg = new skillCheckResponse("Bad Check. -10%");
					}
					socket.emit("gen skill check", {genI:this.repair.genNum,val: outcome});
				}
				if (spaceHeld || this.repair.skillCheckFrame > 60) { //try or wait too long, then reset
					if (this.repair.skillCheckFrame > 60) {
						socket.emit("gen skill check", {genI:this.repair.genNum,val: -0.1});
						indicatorMsg = new skillCheckResponse("Missed Check. -10%");
					}
					this.repair.frame = 180 + Math.floor((Math.random() - 0.5) * 30);
					this.repair.sweetSpot = 52 - Math.floor(Math.random() * 22), //what last frame is great zone
					this.repair.skillCheckFrame = 0;
				}
			}
		}

		if (indicatorMsg != undefined) {
			if (indicatorMsg.show()) indicatorMsg = undefined;
		}

		if (this.health == "dying") {
			if (this.dyingTime.last == undefined) this.dyingTime.last = performance.now() - 16.666;
			this.dyingTime.left -= performance.now() - this.dyingTime.last;
			this.dyingTime.last = performance.now();
		}
	}

	this.interact = function() { //survivors with other survivors
		if (!player.isKiller) {
			if (player.health != "dying" && player.repair.gunNum == undefined && player.switch.num == undefined) {
				for (var i = players.length - 1; i >= 0; i--) {
					if (i != pIndex(playerID)) {
						if (dist2(player.pos.x,player.pos.z,players[i].pos.x,players[i].pos.z) < 30 ** 2) {
							if (players[i].health == "dying") {
								if (spaceHeld && this.revive.reviving == undefined && players[i].revive.gettingRevived == undefined) {
									socket.emit("revive start", {from:playerID,to:players[i].id});
									this.revive.reviving = players[i].id;
								} else if (!spaceHeld && this.revive.reviving == players[i].id && players[i].revive.gettingRevived == playerID) {
									socket.emit("revive end", {from:playerID,to:players[i].id,progress:players[i].revive.left})
								}
							}
						} else { //if player was reviving but then they run out of range mid revive.
							if (players[i].revive.gettingRevived == playerID && this.revive.reviving == players[i].id) {
								socket.emit("revive end", {from:playerID,to:players[i].id,progress:players[i].revive.left});
							}
						}
					}
				}
			}
		}
	}

	this.end = function(result) {
		if (this.isGuest == undefined) {
		if (this.id != playerID) {
		scene.remove(this.mesh.body);
		this.mesh.body.geometry.dispose();
		this.mesh.body.material.dispose();
		scene.remove(this.mesh.head);
		this.mesh.head.geometry.dispose();
		this.mesh.head.material.dispose();
		}
		if (result == "good") this.health = "escaped";
		else this.health = "dead";
		this.gamemode = 1;
		}
	}

	this.show = function(playerI) {
		if (this.gamemode == 1) return;
		if (this.isKiller) this.weapon.showGun(playerI);
		if (players[playerI].id != playerID || fKey) {

			this.mesh.head.position.copy(this.pos);
			this.mesh.head.position.y = (this.pos.y + 1 + 1.9 * Number(this.isKiller));
			this.mesh.body.position.copy(this.pos);
			this.mesh.body.position.y = (this.pos.y - 30 - 5 * Number(this.isKiller)) + 12 + 3 * Number(this.isKiller);
			if (this.health != "dying") this.mesh.head.rotation.y = this.looking.y;

			if (this.health == "dying") {
				this.mesh.body.rotation.z = this.looking.y * -1;
				this.mesh.head.rotation.z = this.looking.y * -1;
				this.mesh.body.position.y = this.pos.y - 15;
				this.mesh.head.position.set(Math.sin(this.looking.y) * -19 + this.pos.x,this.pos.y - 15,Math.cos(this.looking.y) * -19 + this.pos.z);
			}

			if (this.crouching) {
				this.mesh.body.material.opacity = 0.3;// when they crouch they actually just sink into the ground haha
				this.mesh.head.material.opacity = 0.3;
			} else {
				this.mesh.body.material.opacity = 1;
				this.mesh.head.material.opacity = 1;
			}
		}
	}
	this.calcTerror = function() {
		if (player.isKiller || this.gameMode == 1) return;
		/*if (ambientJojo != undefined && activeJojo != undefined) { old jojo thing
			var terrorRangeSq = dist3(this.pos.x,this.pos.y,this.pos.z,player.pos.x,player.pos.y,player.pos.z);
			if (terrorRangeSq < 1140000) {
				if (terrorRangeSq < 1110) activeJojo.setPlaybackRate(6);
				else if (terrorRangeSq < 6800) activeJojo.setPlaybackRate(5);
				else if (terrorRangeSq < 27000) activeJojo.setPlaybackRate(4);
				else if (terrorRangeSq < 72000) activeJojo.setPlaybackRate(3);
				else if (terrorRangeSq < 143000) activeJojo.setPlaybackRate(2);
				else if (terrorRangeSq < 356000) activeJojo.setPlaybackRate(1);
				else activeJojo.setPlaybackRate(0.3);
				if (ambientJojo.isPlaying) ambientJojo.stop();
				this.mesh.body.add(activeJojo);
				if (!activeJojo.isPlaying) activeJojo.play();
			} else {
				if (activeJojo.isPlaying) activeJojo.stop();
				if (!ambientJojo.isPlaying)	ambientJojo.play();
			}
		}*/
//dont worry... adding soundbuffers dont CLONE (max 3 children on killer body...)

		var killer;
		for (var i = 0; i < players.length; i++) {
			if (players[i].isKiller) killer = players[i];
		}

		if (ambientJojo != undefined && activeJojo != undefined && activerJojo != undefined && activestJojo != undefined) {
			var terrorRangeSq = dist3(this.pos.x,this.pos.y,this.pos.z,player.pos.x,player.pos.y,player.pos.z);
			var jojoDelta = 0;
			var jojoSwitch = false;
			if (terrorRangeSq < 1140000) {
				if (jojoLastTime != undefined) jojoDelta = performance.now() - jojoLastTime;
				jojoLastTime = performance.now();
			}
			if (terrorRangeSq < 12500) {
				if (activerJojo.isPlaying || activeJojo.isPlaying || ambientJojo.isPlaying) {
					jojoSwitch = true;
					if (ambientJojo.isPlaying) ambientJojo.stop();
					if (activeJojo.isPlaying) activeJojo.stop();
					if (activerJojo.isPlaying) activerJojo.stop();
				}
				if (!activestJojo.isPlaying) {
					this.mesh.body.add(activestJojo);
					if (!jojoSwitch) jojoOffset = 0;
					var compensate = jojoOffset/1000 - 0.125; //compensate audio... its 0.125s early for better loop
					if (compensate < 0) compensate = 0;
					activestJojo.offset = compensate;
					activestJojo.play();
				}
			} else if (terrorRangeSq < 72000 ) {
				if (ambientJojo.isPlaying || activeJojo.isPlaying || activestJojo.isPlaying) {
					jojoSwitch = true;
					if (ambientJojo.isPlaying) ambientJojo.stop();
					if (activeJojo.isPlaying) activeJojo.stop();
					if (activestJojo.isPlaying) activestJojo.stop();
				}
				if (!activerJojo.isPlaying) {
					this.mesh.body.add(activerJojo);
					if (!jojoSwitch) jojoOffset = 0;
					activerJojo.offset = jojoOffset/1000;
					activerJojo.play();
				}
			} else if (terrorRangeSq < 1140000 && !killer.crouching) {
				if (terrorRangeSq < 356000) activeJojo.setPlaybackRate(1);
				else {
					activeJojo.setPlaybackRate(0.3);
					jojoDelta *= 0.3;
				}
				if (ambientJojo.isPlaying || activerJojo.isPlaying || activestJojo.isPlaying) {
					jojoSwitch = true;
					if (ambientJojo.isPlaying) ambientJojo.stop();
					if (activerJojo.isPlaying) activerJojo.stop();
					if (activestJojo.isPlaying) activestJojo.stop();
				}
				if (!activeJojo.isPlaying) {
					this.mesh.body.add(activeJojo);
					if (!jojoSwitch) jojoOffset = 0;
					activeJojo.offset = jojoOffset/1000;
					activeJojo.play();
				}
			} else {
				if (activeJojo.isPlaying) activeJojo.stop();
				if (activerJojo.isPlaying) activerJojo.stop();
				if (activestJojo.isPlaying) activestJojo.stop();
				if (!ambientJojo.isPlaying)	{
					jojoLastTime = undefined;
					jojoOffset = 0;
					ambientJojo.play();
				}
			}
			jojoOffset += jojoDelta;
		}
	}

	this.renderDistCalc = function() {
		for (var i = map.objects.length - 1; i >= 0; i--) {
			var manzPos;
			if (this.spectating.num != undefined) manzPos = players[this.spectating.num].pos;
			else manzPos = player.pos;
			if (dist2(map.objects[i].position.x,map.objects[i].position.z,manzPos.x,manzPos.z) > (1000 + Math.max(
				map.objects[i].geometry.parameters.width,map.objects[i].geometry.parameters.depth)) ** 2) scene.remove(map.objects[i]);
			else {
				scene.add(map.objects[i]);
				showCount++;
			}
		}
		for (var i = trees.length - 1; i >= 0; i--) {
			if (dist2(trees[i].position.x,trees[i].position.z,manzPos.x,manzPos.z) > 1000 ** 2) scene.remove(trees[i]);
			else {
				scene.add(trees[i]);
				showCount++;
			}
		}
	}
}
