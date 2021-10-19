function Gun(name) {
this.name = name;
this.gunDrop = 0; //angle lerp for reloading.
this.weaponFrame = 0; //related to timing fireRate.
this.weaponLungeTime = {lastFrameTime:undefined, lungeTime:0};
this.attackType = 0;
this.hitStunFrames = 0;
this.genStunFrames = 0;
this.hipPos = new THREE.Vector3(8,-4,-20);
this.currentPos = this.hipPos.clone();

  this.showGun = function(pI) { //shogun
		if (this.name == "mace") {
			if (mace != undefined && this.mesh == undefined) {
				this.mesh = mace.clone();
				this.mesh.scale.set(2.8,2.8,2.8);
				scene.add(this.mesh);
			}
		} else if (this.name == "superHammer") {
			if (superHammer != undefined && this.mesh == undefined) {
				this.mesh = superHammer.clone();
				this.mesh.scale.set(2.8,2.8,2.8);
				scene.add(this.mesh);
			}
		} else if (this.name == "pekkaSword") {
			if (pekkaSword != undefined && this.mesh == undefined) {
				this.mesh = pekkaSword.clone();
				this.mesh.scale.set(3.8,3.8,3.8);
				scene.add(this.mesh);
			}
		} else if (this.name == "lightsaber") {
			if (lightsaber != undefined && this.mesh == undefined) {
				this.mesh = lightsaber.clone();
				this.mesh.scale.set(1.5,1.5,1.5);
				scene.add(this.mesh);
			}
		}
  		if (this.mesh) {
	  		this.mesh.position.set(players[pI].pos.x + this.currentPos.x, players[pI].pos.y + this.currentPos.y, players[pI].pos.z + this.currentPos.z
	  		 + Number(players[pI].id != playerID) * 5);
	  		var deltaVec = new THREE.Vector3(this.mesh.position.x - players[pI].pos.x,this.mesh.position.y - players[pI].pos.y,this.mesh.position.z - players[pI].pos.z);
	  		deltaVec.applyAxisAngle(Xaxis, players[pI].looking.x);
	  		deltaVec.applyAxisAngle(Yaxis, players[pI].looking.y);
	  		deltaVec.add(players[pI].pos);

				vec3.set(Math.sin(players[pI].totalStepDist/45*Math.PI) * 0.3,Math.abs(Math.sin(players[pI].totalStepDist/45*Math.PI)) * -0.3,0); //walking weapon sway
	  		vec3.applyAxisAngle(Yaxis, players[pI].looking.y);

	  		this.mesh.position.copy(deltaVec);
				this.mesh.position.add(vec3);

				this.mesh.rotation.y = players[pI].looking.y + Math.PI/2;
	  		this.mesh.rotation.z = players[pI].looking.x - this.gunDrop;

	  	if (this.hitStunFrames > 0) { //cant attack
  			if (this.hitStunFrames > 0 && this.hitStunFrames <= 25) {
  				this.hipPos.lerp(new THREE.Vector3(8,-4,-20),0.15);
	  			this.gunDrop *= 0.85;
	  		} else if (this.hitStunFrames > 25 && this.hitStunFrames <= 32){
  				this.hipPos.set(this.hipPos.x,this.hipPos.y- ((this.hitStunFrames - 25) / 3) ** 1.4,this.hipPos.z - ((this.hitStunFrames - 25) / 4) ** 1.4);
  				this.gunDrop += 0.1;
	  		} else if (this.hitStunFrames > 32 && this.hitStunFrames <= 45){
  				this.hipPos.lerp(new THREE.Vector3(8,-4,-20),0.15);
	  			this.gunDrop *= 0.85;
	  		} else if (this.hitStunFrames > 45 && this.hitStunFrames <= 52){
  				this.hipPos.set(this.hipPos.x,this.hipPos.y- ((this.hitStunFrames - 45) / 3) ** 1.4,this.hipPos.z - ((this.hitStunFrames - 45) / 4) ** 1.4);
  				this.gunDrop += 0.1;
	  		} else if (this.hitStunFrames > 52 && this.hitStunFrames <= 65){
  				this.hipPos.lerp(new THREE.Vector3(8,-4,-20),0.15);
	  			this.gunDrop -= 0.075;
	  		} else if (this.hitStunFrames > 65 && this.hitStunFrames <= 72){
  				this.hipPos.set(this.hipPos.x,this.hipPos.y- ((this.hitStunFrames - 65) / 3) ** 1.4,this.hipPos.z - ((this.hitStunFrames - 65) / 4) ** 1.4);
  				this.gunDrop += 0.16;
	  		} else if (this.hitStunFrames > 72 && this.hitStunFrames <= 120){
  				this.hipPos.lerp(new THREE.Vector3(8,-10,-20),0.15);
	  			this.gunDrop *= 0.85;
	  		}
	  	} else if (this.genStunFrames > 0) { //funky little animation
 				if (this.genStunFrames > 0 && this.genStunFrames <= 120) {
					if (this.genStunFrames > 0 && this.genStunFrames <= 20) {
						this.hipPos.lerp(new THREE.Vector3(8,20,-20),0.05);
					} else if (this.genStunFrames > 20 && this.genStunFrames <= 40) {
						this.gunDrop -= (this.genStunFrames - 20) / 1000;
						this.hipPos.lerp(new THREE.Vector3(8,20,-20),0.05);
					} else if (this.genStunFrames > 40 && this.genStunFrames <= 50) {
						this.gunDrop /= 1.1;
						this.hipPos.lerp(new THREE.Vector3(4,-10,-20),0.4);
					} else if (this.genStunFrames > 50 && this.genStunFrames <= 70) {
						this.hipPos.lerp(new THREE.Vector3(8,30,-20),0.05);
					} else if (this.genStunFrames > 70 && this.genStunFrames <= 80) {
						this.gunDrop /= 1.1;
						this.hipPos.lerp(new THREE.Vector3(4,-10,-20),0.5);
					} else if (this.genStunFrames > 80 && this.genStunFrames <= 100) {
	  				this.hipPos.lerp(new THREE.Vector3(8,-4,-20),0.065);
		  			this.gunDrop *= 0.94;
		  		} else if (this.genStunFrames > 100 && this.genStunFrames <= 120){
	  				this.hipPos.lerp(new THREE.Vector3(8,-4,-20),0.09);
		  			this.gunDrop *= 0.9;
		  		}
					if (player.isKiller) { //killer logic... not for show
						controls.set(controls.looking().x * 0.7,controls.looking().y);
						controls.sensitivity = 0;
						if (generators[this.genStun].done) { //finished mid damaging
							this.genStunFrames = 0;
							this.genStun = undefined;
						} else if (this.genStunFrames == 79) {
							socket.emit("gen damage start", this.genStun);
							generators[this.genStun].damaged = true;
						} else if (this.genStunFrames == 119) {
							this.genStun = undefined;
							controls.sensitivity = sensitivity;
						}
					}
	  		}
	  	} else { //can attack

	  	if (this.attackType == 1) {
	  		if (this.weaponFrame > 0 && this.weaponFrame <= 10) {
	  			this.weaponLungeTime.lungeTime = 0; //reset it... ten times
	  			this.hipPos.set(this.hipPos.x - 1,this.hipPos.y + (this.weaponFrame / 5) ** 1.4,this.hipPos.z + (this.weaponFrame / 8) ** 1.4);
	  			this.gunDrop += -0.04;
	  		} else if (this.weaponFrame == 11) {
	  			if (pI == pIndex(playerID)) {
	  			if (mouseIsPressed.left && this.weaponLungeTime.lungeTime < 550) {
		  			if (this.weaponLungeTime.lastFrameTime) this.weaponLungeTime.lungeTime += performance.now() - this.weaponLungeTime.lastFrameTime; //one frame delay...
		  			this.weaponLungeTime.lastFrameTime = performance.now();
		  			this.weaponFrame--;
	  			} else { //mouse release
	  				socket.emit("attack release");
	  			}
	  			} else {
	  				this.weaponFrame--; //wait for weapon release to get us to frame 12
	  			}
	  		} else if (this.weaponFrame > 11 && this.weaponFrame <= 16){
	  			this.hipPos.set(this.hipPos.x,this.hipPos.y - 10.5,this.hipPos.z - 6.25 * 1.4);
	  			this.gunDrop += 0.4;
	  		} else if (this.weaponFrame > 16 && this.weaponFrame <= 21){
	  			//this.hipPos.set(this.hipPos.x - 1.25,this.hipPos.y - 2.5,this.hipPos.z - 6.25);
	  			//this.gunDrop += 0.2;
	  		} else if (this.weaponFrame > 21 && this.weaponFrame <= 50){
	  			this.hipPos.lerp(new THREE.Vector3(8,-4,-20),0.18);
	  			this.gunDrop *= 0.82;
	  		} else {
	  			this.gunDrop = 0;
	  			this.hipPos.set(8,-4,-20);
	  		}
		} else if (this.attackType == 0) {
	  		if (this.weaponFrame > 0 && this.weaponFrame <= 10) {
	  			this.weaponLungeTime.lungeTime = 0; //reset it... ten times
	  			this.hipPos.set(this.hipPos.x,this.hipPos.y + (this.weaponFrame / 8) ** 1.4,this.hipPos.z + (this.weaponFrame / 8) ** 1.4);
	  			this.gunDrop += -0.03;
	  		} else if (this.weaponFrame == 11) {
	  			if (pI == pIndex(playerID)) {
	  			if (mouseIsPressed.left && this.weaponLungeTime.lungeTime <= 550) {
		  			if (this.weaponLungeTime.lastFrameTime) this.weaponLungeTime.lungeTime += performance.now() - this.weaponLungeTime.lastFrameTime;
		  			this.weaponLungeTime.lastFrameTime = performance.now();
		  			this.weaponFrame--;
	  			} else { //mouse release
	  				socket.emit("attack release");
	  			}
	  			} else {
	  				this.weaponFrame--; //wait for weapon release to get us to frame 12
	  			}
	  		} else if (this.weaponFrame > 11 && this.weaponFrame <= 15){
	  			this.hipPos.set(this.hipPos.x - 1.25,this.hipPos.y - 2.5,this.hipPos.z - 6.25 * 1.4);
	  			this.gunDrop += 0.2;
	  		} else if (this.weaponFrame > 15 && this.weaponFrame <= 18){
	  			//this.hipPos.set(this.hipPos.x - 1.25,this.hipPos.y - 2.5,this.hipPos.z - 6.25);
	  			//this.gunDrop += 0.2;
	  		} else if (this.weaponFrame > 18 && this.weaponFrame <= 50){
	  			this.hipPos.lerp(new THREE.Vector3(8,-4,-20),0.15);
	  			this.gunDrop *= 0.85;
	  		} else {
	  			this.gunDrop = 0;
	  			this.hipPos.set(8,-4,-20);
	  		}
	  	}
	  	}
  		this.currentPos.copy(this.hipPos);

  		if (this.weaponFrame > 0) {
  			this.weaponFrame++;
  		}
  		if (this.weaponFrame >= 50) {
  			this.weaponFrame = 0;
  		}
  		if (this.hitStunFrames > 0) {
  			this.hitStunFrames++;
  		}
  		if (this.hitStunFrames >= 120) {
  			this.hitStunFrames = 0;
  		}
  		if (this.genStunFrames > 0) {
  			this.genStunFrames++;
  		}
  		if (this.genStunFrames >= 120) {
  			this.genStunFrames = 0;
  		}

	    }
	}
}
