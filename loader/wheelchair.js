class Skid {
    constructor(e) {
        this.consts = e(0x7);
        this.utils = e(0x8);
        this.three = e(0x4);
        this.colors = e(0x15);
        this.uiFunctions = e(0x85);
        this.menu =  {
            features:[],
            items:new Map(),
            activeMenu:0,
            activeLine:0,
            show:true,
        }
        this.settings = {
            canShoot: true,
            scopingOut: false,
        }
        this.onload();
    }
    onload() {
        this.menu.items
        .set('Krunker Skid', [this.newFeature('Self', []), this.newFeature('Weapon', []), this.newFeature('Visual', []), this.newFeature('Settings', [])])
        .set('Self', [this.newFeature('AutoBhop', ['Off', 'Auto Jump', 'Key Jump', 'Auto Slide', 'Key Slide']), /*this.newFeature('SkidSettings', ['Off', 'On'])*/ ])
        .set('Weapon', [this.newFeature('AutoAim', ['Off', 'TriggerBot', 'Quickscoper', 'Assist', 'Hip Fire', 'Silent Aim']), this.newFeature('AutoReload', ['Off', 'On']), this.newFeature('Aim Through Walls', ['Off', 'On']), this.newFeature('UseDeltaForce', ['Off', 'On'])])
        .set('Visual', [this.newFeature('EspMode', ['Off', '2d', 'Names', 'All']), this.newFeature('Tracers', ['Off', 'On'])])
        .set('Settings', [this.newFeature('Reset', [], this.resetSettings) /*this.newFeature('Save game.js', [], _=>{navigator.msSaveOrOpenBlob(new main.Blob([window.gamescript], {type: "text/plain;charset=utf-8"}), `game.js`);})*/])
    }
    onTick(me, world, inputs) {
        if (!defined(world.controls.keys)) return;
        let controls = world.controls;
        this.world = world;
        this.me = me;
        const recoilMlt = 0.3;
        controls.recoil = recoilMlt * me[recoilAnimY];
        if (!defined(controls.pitchObject)) {
            controls.aimTarget = null;
            controls.inputs = inputs;
            controls.pitchObject = controls[pchObjc];
            controls.updated = controls.update;
            controls.update = function() {
                if (!this.target && this.aimTarget) {
                    this.object.rotation.y = this.aimTarget.yD;
                    this.pitchObject.rotation.x = this.aimTarget.xD;
                    const c = Math.PI / 2;
                    this.pitchObject.rotation.x = Math.max(-c, Math.min(c, this.pitchObject.rotation.x));
                    this.yDr =  (this.pitchObject.rotation.x % (2 * Math.PI));
                    this.xDr = (this.object.rotation.y % (2 * Math.PI));
                    this.xDr -= this.recoil;
                    this.inputs[3] = +(this.xDr);
                    this.inputs[2] = +(this.yDr);
                    this.inputs[6] = 1;
                }
                return this.updated(...arguments);
            } 
        }

        const INPUTS = { SPEED: 1, YDIR: 2, XDIR: 3, SHOOT: 5, SCOPE: 6, JUMP: 7, CROUCH: 8, RELOAD: 9, WEAPON: 10, };
        for (let i = 0, sz = this.menu.features.length; i < sz; i++) {
            const feature = this.menu.features[i];
            switch (feature.name) {
                case 'AutoAim':
                        this.autoAim(feature.container[feature.value]);
                    break;
                case 'AutoReload':
                        if (feature.value) {
                            //inputs[INPUTS.RELOAD] = !me.ammos[me.weaponIndex];
                            const ammoLeft = me.ammos[me.weaponIndex];
                            if (ammoLeft === 0) {
                                world.players.reload(me);
                                if (ammoLeft) world.players.endReload(me.weapon);
                            }
                        }
                    break;
                case 'AutoBhop':
                        if (feature.value) {
                            inputs[INPUTS.JUMP] = ((controls.keys[controls.jumpKey] || feature.value === 1 || feature.value === 3) && !me.didJump) * 1;
                            if (feature.value > 2) inputs[INPUTS.CROUCH] = (me.yVel < -0.04 && me.canSlide) * 1;
                        }
                    break;
                    //case 'SkidSettings':
                    //if (feature.value) new Map([ ["fov", 85], ["fpsFOV", 85], ["weaponBob", 3], ["weaponLean", 6], ["weaponOffX", 2], ["weaponOffY", 2], ["weaponOffZ", 2] ]).forEach(function(value, key, map) { window.setSetting(key, value) });
                    //break;
                    //case 'UseDeltaForce':
                    //this.settings.delta = feature.value ? 5 : 1;
                    //break;
            }
        }
        me.lastInput = inputs;
    }
    onRender(config, canvas, ctx, renderer, scale, me, world) {
        if (!defined(world.controls.keys)) return;
        this.renderer = renderer;
        const fonts = {
            ssBig: '30px\x20Sans-serif',
            ssSmall: '20px\x20Sans-serif',
            gmBig: '30px\x20GameFont',
            gmSmall: '20px\x20GameFont'
        }
        let fullWidth = canvas.parentNode.clientWidth;
        let fullHeight = canvas.parentNode.clientHeight;
        let scaledWidth = canvas.width / scale;
        let scaledHeight = canvas.height / scale;
        let camPos = renderer.camera.getWorldPosition();
        let controls = world.controls;
        let entities = world.players.list.filter(x => { return x.active && !x[isYou] });
        
        //functions
        let world2Screen = (camera, position) => {
            let pos = position.clone();
            pos.project(camera);
            pos.x = (pos.x + 1) / 2;
            pos.y = (-pos.y + 1) / 2;
            pos.x *= scaledWidth;
            pos.y *= scaledHeight;
            return pos;
        }
    
        let pixelTranslate = (ctx, x, y) => {
            ctx.translate(~~x, ~~y);
        }
    
        let pixelDifference = (pos1, Pos2, multi) => {
            const hDiff = ~~(pos1.y - Pos2.y);
            return [hDiff, ~~(hDiff * multi)]
        }
    
        let text = (txt, font, color, x, y) => {
            ctx.save();
            pixelTranslate(ctx, x, y);
            ctx.fillStyle = color;
            ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
            ctx.font = font;
            ctx.lineWidth = 1;
            ctx.strokeText(txt, 0, 0);
            ctx.fillText(txt, 0, 0);
            ctx.restore();
        }
    
        let rect = (x, y, ox, oy, w, h, color, fill) => {
            ctx.save();
            pixelTranslate(ctx, x, y);
            ctx.beginPath();
            fill ? ctx.fillStyle = color : ctx.strokeStyle = color;
            ctx.rect(ox, oy, w, h);
            fill ? ctx.fill() : ctx.stroke();
            ctx.closePath();
            ctx.restore();
        }
    
        let line = (x1, y1, x2, y2, lW, sS) => {
            ctx.save();
            ctx.lineWidth = lW + 2;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
            ctx.stroke();
            ctx.lineWidth = lW;
            ctx.strokeStyle = sS;
            ctx.stroke();
            ctx.restore();
        }
    
        let image = (x, y, img, ox, oy, w, h) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.beginPath();
            ctx.drawImage(img, ox, oy, w, h);
            ctx.closePath();
            ctx.restore();
        }

        let getTextMeasurements = (arr) => {
            for (let i = 0; i < arr.length; i++) {
                arr[i] = ~~ctx.measureText(arr[i]).width;
            }
            return arr;
        }
        
        let byte2Hex = (n) => {
            var chars = "0123456789ABCDEF";
            return String(chars.substr((n >> 4) & 0x0F,1)) + chars.substr(n & 0x0F,1);
        }
    
        let rgba2hex = (r,g,b,a = 255) => ("#").concat(byte2Hex(r),byte2Hex(g),byte2Hex(b),byte2Hex(a));

        let drawMenuLine = (item, lineWidth, lineHeight, lineTop, lineLeft, textLeft, active, title, rescaleText = true) => {
            // default values
            let text_col = [255, 255, 255, 255],
                rect_col = [0, 0, 0, 120],
                text_scale = 20,
                font = 'px sans-serif';

            // active line values
            if (active) {
                text_col[0] = 0;
                text_col[1] = 0;
                text_col[2] = 0;
                rect_col[0] = 231;
                rect_col[1] = 231;
                rect_col[2] = 231;
                if (rescaleText) text_scale = 21;
            }

            // title values
            if (title)
            {
                rect_col[0] = 70;
                rect_col[1] = 90;
                rect_col[2] = 90;
                rect_col[3] = 255;
                if (rescaleText) text_scale = 20;
                font = 'px GameFont';
                textLeft = lineWidth / 2 - getTextMeasurements([item.name]);
            }

            // rect
            rect(lineLeft, lineTop, 0, 0, lineWidth, (lineHeight * 2), rgba2hex(rect_col[0],rect_col[1],rect_col[2],rect_col[3]), true);

            // text
            text(item.name, text_scale+font, rgba2hex(text_col[0],text_col[1],text_col[2]), textLeft, lineTop + lineHeight + lineHeight/2);

            // value
            text(item.valueStr, text_scale+font, item.valueStr === "On" ? "#B2F252" : item.valueStr === "Off" ? "#FF4444" : active ? "#333333" : "#999EA5", lineWidth - textLeft * 1.5 - getTextMeasurements([item.valueStr]), lineTop + lineHeight + lineHeight/2);
        }

        let drawMenuItem = (caption) => {
            const top = 280;
            const left = 20;
            const lineWidth = 320;
            const items = this.menu.items.get(caption);
            //if (!defined(items) || items.length) return;
            if (this.menu.activeLine > items.length -1) this.menu.activeLine = 0;

            // draw menu
            drawMenuLine({name:caption,valueStr:''}, lineWidth, 22, top + 18, left, left + 5, false, true);
            for (var i = 0; i < items.length; i++) {
                if (i != this.menu.activeLine) drawMenuLine(items[i][0], lineWidth, 19, top + 60 + i * 36, left, left + 9, false, false);
                drawMenuLine(items[this.menu.activeLine][0], lineWidth, 19, top + 60 + this.menu.activeLine * 36, left, left + 9, true, false);
            }

            // process buttons
            if (controls.keys[101]) {
                controls.keys[101] = 0;
                    main.SOUND.play('tick_0',0.1)
                    const feature = items[this.menu.activeLine][0];
                    if (feature) {
                        if (feature.container.length) this.onUpdated(feature);
                        else if (typeof feature.myFunction === "function") feature.myFunction();
                        else this.menu.activeMenu = this.menu.activeLine + 1;
                    }
            } else if (controls.keys[96]) {
                controls.keys[96] = 0;
                    main.SOUND.play('tick_0',0.1);
                    if (this.menu.activeMenu > 0) this.menu.activeMenu = 0;
                    else if (this.menu.show) this.menu.show = 0;
              
            } else if (controls.keys[104]) {
                controls.keys[104] = 0;
                    main.SOUND.play('tick_0',0.1)
                    if (this.menu.activeLine === 0) this.menu.activeLine = items.length;
                    this.menu.activeLine--;
               
            } else if (controls.keys[98]) {
                controls.keys[98] =0;
                    main.SOUND.play('tick_0',0.1)
                    this.menu.activeLine++;
                    if (this.menu.activeLine === items.length) this.menu.activeLine = 0;
               
            }
        }
        //Draw shit 
        if ('none' == main.menuHolder.style.display && 'none' == main.endUI.style.display) {
            //ESP
            const espValue = this.getFeature('EspMode').value;
            const espMode = this.getFeature('EspMode').container[espValue];
            if (espValue) {
                const playerHeight = 11;
                const nameOffset = 0.6;
                const nameOffsetHat = 0.8;
                const crouchDst = 3;
                
                entities.map((entity, index, array)=> {
                    
                    if (defined(entity[objInstances])) {
                        let isFriendly = this.get(entity, 'isFriendly');
                        let entityPos = entity[objInstances].position;
                        let entitynamePos = entityPos.clone().setY(entityPos.y + (playerHeight + (0x0 <= entity.hatIndex ? nameOffsetHat : 0) + nameOffset - entity.crouchVal * crouchDst));
                        let teamCol = isFriendly ? '#44AAFF' : '#FF4444';
                        let entityScrPosName = entitynamePos.clone();          
                        let playerScaled = Math.max(0.3, 1 - camPos.distanceTo(entityScrPosName) / 600);

                        if (espMode !== '2d' && 1 <= 20 * playerScaled && renderer.frustum.containsPoint(entityScrPosName)) {       
                            ctx.save(); 
                            entityScrPosName.project(renderer.camera); 
                            entityScrPosName.x = (entityScrPosName.x + 1) / 2;
                            entityScrPosName.y = (entityScrPosName.y + 1) / 2; 
                            ctx.translate(scaledWidth * entityScrPosName.x, scaledHeight * (1 - entityScrPosName.y)); 
                            ctx.scale(playerScaled, playerScaled);
                            //healthbar
                            ctx.fillStyle = 'rgba(0,\x200,\x200,\x200.4)';
                            ctx.fillRect(-60, -16, 120, 16);
                            config.dynamicHP && entity.hpChase > entity.health / entity.maxHealth && (ctx.fillStyle = '#FFFFFF', ctx.fillRect(-60, -16, 120 * entity.hpChase, 16));
                            ctx.fillStyle = isFriendly ? this.colors.teams[0] : this.colors.teams[1], ctx.fillRect(-60, -16, entity.health / entity.maxHealth * 120, 16);
                            //info
                            let distance = Math.round(entityPos.distanceTo(me) / 10);
                            if (Number.isNaN(distance)) distance = 0;
                            distance += "mt";
                            ctx.font = fonts.ssBig;
                            let distScale = ctx.measureText(distance).width + 10;
                            
                            let name =  entity.name, clan = entity.clan ? '[' + entity.clan + ']' : null;
                            ctx.font = fonts.ssBig;
                            let nameScale = ctx.measureText(name).width + (clan ? 0x5 : 0x0);

                            let level = entity.level;
                            ctx.font = fonts.ssBig;
                            let levelScale = level ? ctx.measureText(level).width + 0xa : 0x0;             
                            
                            let fullScale = distScale + nameScale + (clan ? ctx.measureText(clan).width : 0x0);
                            
                            ctx.translate(0, -26), 
                            ctx.fillStyle = teamCol, 
                            ctx.font = fonts.ssBig, 
                            ctx.fillText(distance, -fullScale / 0x2, 0x0);
                            ctx.fillStyle = 'white', 
                            ctx.font = fonts.ssBig;
                            ctx.globalAlpha= 0x1; 
                            ctx.fillText(name, -fullScale / 0x2 + distScale, 0x0), 
                            ctx.globalAlpha = 0x0 <= this.consts.verClans.indexOf(entity.clan) ? 0x1 : 0.4,
                            ctx.fillStyle = 0x0 <= this.consts.verClans.indexOf(entity.clan) ? this.colors.verified.clan : 'white', clan && ctx.fillText(clan, -fullScale / 0x2 + distScale + nameScale, 0x0);
                            ctx.restore();
                        }

                        //2d
                        if (espMode !== 'Names' && renderer.frustum.containsPoint(entityPos)) {
                            let entityScrPosBase = world2Screen(renderer.camera, entityPos),
                                entityScrPosHead = world2Screen(renderer.camera, entityPos.setY(entityPos.y + playerHeight - entity.crouchVal * crouchDst)),
                                entityScrPxlDiff = pixelDifference(entityScrPosBase, entityScrPosHead, 0.6);
                            rect(entityScrPosHead.x - entityScrPxlDiff[1] / 2, entityScrPosHead.y, 0, 0, entityScrPxlDiff[1], entityScrPxlDiff[0], teamCol, false);
                            const tracers = this.getFeature('Tracers');
                            if (tracers && tracers.value) line(canvas.width / 2, canvas.height - 1, entityScrPosBase.x, entityScrPosBase.y, 2.5, teamCol);
                        }

                        //Chams
                        for (let i = 0; i < entity[objInstances].children.length; i++) {
                            const object3d = entity[objInstances].children[i];
                            for (let j = 0; j < object3d.children.length; j++) {
                                const mesh = object3d.children[j];
                                if (mesh && mesh.type == "Mesh") {
                                    const material = mesh.material;
                                    material.depthTest = false;
                                    material.colorWrite = true;
                                    material.transparent = true;
                                    material.opacity = 1.0;
                                    //material.needsUpdate = true;
                                    //material.wireframe = !canHit(entity);
                                }
                            }
                        }                               
                    }
                });
            }
            //Menu
            if (this.menu.show) {
                switch(this.menu.activeMenu) {
                    case 0: drawMenuItem('Krunker Skid'); break;
                    case 1: drawMenuItem('Self'); break;
                    case 2: drawMenuItem('Weapon'); break;
                    case 3: drawMenuItem('Visual'); break;
                    case 4: drawMenuItem('Settings'); break;
                    default: break;
                }
            }
            else if (controls.keys[96] && !this.menu.show) {
                controls.keys[96] = 0;
                main.SOUND.play('tick_0',0.1)
                this.menu.show = true;       
            }
        }
    }
    resetSettings() {
        if (main.confirm("Are you sure you want to reset all your skid settings? This will also refresh the page")) {
            Object.keys(main.localStorage).filter(x => x.includes("utilities_")).forEach(x => main.localStorage.removeItem(x));
            main.location.reload();
        }
    }

    newFeature(name, array, myFunction = null) {
        const cStruct = (...keys) => ((...v) => keys.reduce((o, k, i) => {
            o[k] = v[i];
            return o
        }, {}));
        let item = [];
        const myStruct = cStruct('name', 'value', 'valueStr', 'container', 'myFunction')
        const value = parseInt(main.localStorage.getItem("utilities_" + name) || 0);
        const feature = myStruct(name, value, array.length ? array[value] : '', array, myFunction);
        if (array.length||myFunction) this.menu.features.push(feature);
        item.push(feature);
        return item;
    }

    getFeature(name) {
        for (const feature of this.menu.features) {
            if (feature.name.toLowerCase() === name.toLowerCase()) {
                return feature;
            }
        }
        return null;
    }

    onUpdated(feature) {
        if (feature.container.length) {
            feature.value += 1;
            if (feature.value > feature.container.length - 1) {
                feature.value = 0;
            }
            feature.valueStr = feature.container[feature.value];
            main.saveVal("utilities_" + feature.name, feature.value);
        }
        if (feature.container.length === 2 && feature.container[0] === 'Off' && feature.container[1] === 'On') {
            console.log(feature.name, " is now ", feature.valueStr);
        }
    }
    get(entity, string) {
        if (defined(entity) && entity && entity.active) {
            switch (string) {
                case 'isYou': return entity[isYou];
                case 'objInstances': return entity[objInstances];
                case 'inView': return entity[cnBSeen]; //null == this.world[canSee](this.me, entity.x2, entity.y2 - entity.crouchVal * crouchDst, entity.z2);
                case 'isFriendly': return (this.me && this.me.team ? this.me.team : this.me.spectating ? 0x1 : 0x0) == entity.team;
                case 'recoilAnimY': return entity[recoilAnimY];
            }
        }
        return null;
    }
    getTarget() {
        let distance = Infinity, target = null;
        for (const entity of this.world.players.list.filter(x => { return x.active && !x[isYou] && this.get(x,"inView") && !this.get(x,"isFriendly") })) {
            if (defined(entity[objInstances])) {
                let entityPos = entity[objInstances].position;
                if (this.renderer.frustum.containsPoint(entityPos)) {
                    let dist = entityPos.distanceTo(this.me);
                    if (dist <= distance) {distance = dist; target = entity;}
                }
            }
        }
        return target;
    }
    
    //tx = getXDire(controls.object.position.x, controls.object.position.y, controls.object.position.z, target.x3, y, target.z3);
    //ty = getDirection(controls.object.position.z, controls.object.position.x, target.z3, target.x3);
    camLookAt(target) {
        const controls = this.world.controls;
        const headScale = 2;
        const hitBoxPad = 1;
        const playerHeight = 11;
        const cameraHeight = 1.5;
        const crouchDst = 3;
        const recoilMlt = 0.3;
        if (target === null) return void(controls.aimTarget = null);

        const offset1 = ((playerHeight - cameraHeight) - (target.crouchVal * crouchDst));/* - (this.me[recoilAnimY] * recoilMlt) * 25;*/
        const offset2 = playerHeight - headScale / 2 - target.crouchVal * crouchDst;

        let ydir = this.getDirection(controls.object.position.z, controls.object.position.x, target.z2, target.x2);
        let xdir = this.getXDir(controls.object.position.x, controls.object.position.y, controls.object.position.z, target.x2, target.y2 + offset1, target.z2);
        let camChaseDst = this.consts.camChaseDst;
        controls.aimTarget = {
            xD: xdir,
            yD: ydir,
            x: target.x2 + camChaseDst * Math.sin(ydir) * Math.cos(xdir),
            y: target.y2 - camChaseDst * Math.sin(xdir),
            z: target.z2 + camChaseDst * Math.cos(ydir) * Math.cos(xdir)
        }
    }

    autoAim(value) {
        const controls = this.world.controls;
        const target = this.getTarget();
        if (target) {
            if ((value === 'Assist' && this.me.aimVal === 1) || (value === 'Hip Fire' && this.me.aimVal === 0)) return void this.camLookAt(null);
            this.camLookAt(target);
            if (value === 'TriggerBot') {
                if (controls[mouseDownR] !== 1) {
                    controls[mouseDownR] = 1;
                } else {
                   controls[mouseDownL] ^=1;
                }
            } else if (value === 'Quickscoper') {
                controls[mouseDownR] = 1;
                if (this.me.aimVal === 0) {
                    if (controls[mouseDownL] === 0) {
                        controls[mouseDownL] = 1;
                    } else {
                        controls[mouseDownR] = 0;
                        controls[mouseDownL] = 0;
                    }
                }
            }
        } else {
            this.camLookAt(null);
            if (value === 1) {
                controls[mouseDownL] = 0;
                if (controls[mouseDownR] !== 0) controls[mouseDownR] = 0;
            } else if (value === 2) {
                if (controls[mouseDownR] !== 0) controls[mouseDownR] = 0;
                if (controls[mouseDownL] !== 0) controls[mouseDownL] = 0;
            }
        }
    }
      
    getDistance3D(fromX, fromY, fromZ, toX, toY, toZ) {
        var distX = fromX - toX,
            distY = fromY - toY,
            distZ = fromZ - toZ;
        return Math.sqrt(distX * distX + distY * distY + distZ * distZ);
    }

    getDistance(player1, player2) {
        return this.getDistance3D(player1.x, player1.y, player1.z, player2.x, player2.y, player2.z);
    }

    getDirection(fromZ, fromX, toZ, toX) {
        return Math.atan2(fromX - toX, fromZ - toZ);
    }

    getXDir(fromX, fromY, fromZ, toX, toY, toZ) {
        var dirY = Math.abs(fromY - toY),
            dist = this.getDistance3D(fromX, fromY, fromZ, toX, toY, toZ);
        return Math.asin(dirY / dist) * (fromY > toY ? -1 : 1);
    }

    getAngleDist(start, end) {
        return Math.atan2(Math.sin(end - start), Math.cos(start - end));
    }
}

cripple_window(window.parent);
function cripple_window(_window) {
    if (!_window) {
        return;
    }

    // state is shared across all frames
    let shared_state = new Map(Object.entries({functions_to_hide: new WeakMap(), strings_to_hide: [], hidden_globals: [], init: false}));

    let invisible_define = function(obj, key, value) {
        shared_state.get('hidden_globals').push(key);
        Object.defineProperty(obj, key, {
            enumberable: false,
            configurable: false,
            writable: true,
            value: value
        });
    };

    // unique to each user
    const master_key = 'xttap#4547';
    if (!window.top[master_key]) {
        // initialise top state
        invisible_define(window.top, master_key, shared_state);
    } else {
        // restore
        shared_state = window.top[master_key];
    }

    // hook toString to hide presence
    const original_toString = _window.Function.prototype.toString;
    let hook_toString = new Proxy(original_toString, {
        apply: function(target, _this, _arguments) {
            let lookup_fn = shared_state.get('functions_to_hide').get(_this);
            if (lookup_fn) {
                return target.apply(lookup_fn, _arguments);
            }

            let ret = target.apply(_this, _arguments);
            for (var i = 0; i < shared_state.get('strings_to_hide').length; i++) {
                ret = ret.replace(shared_state.get('strings_to_hide')[i].from, shared_state.get('strings_to_hide')[i].to);
            }
            return ret;
        }
    });
    _window.Function.prototype.toString = hook_toString;

    let conceal_function = function(original_Function, hook_Function) {
        shared_state.get('functions_to_hide').set(hook_Function, original_Function);
    };

    let conceal_string = function(original_string, hook_string) {
        shared_state.get('strings_to_hide').push({from: new RegExp(hook_string.replace(/([\[|\]|\(|\)|\*|\\|\.|\+])/g,'\\$1'), 'g'), to: original_string});
    };

    // hook Object.getOwnPropertyDescriptors to hide variables from window
    const original_getOwnPropertyDescriptors = _window.Object.getOwnPropertyDescriptors;
    let hook_getOwnPropertyDescriptors = new Proxy(original_getOwnPropertyDescriptors, {
        apply: function(target, _this, _arguments) {
            try {
                var descriptors = target.apply(_this, _arguments);
            } catch (e) {
                // modify stack trace to hide proxy
                e.stack = e.stack.replace(/.*Object.*\n/g, '');
                throw e;
            }
            for (var i = 0; i < shared_state.get('hidden_globals').length; i++) {
                delete descriptors[shared_state.get('hidden_globals')[i]];
            }
            return descriptors;
        }
    });
    _window.Object.getOwnPropertyDescriptors = hook_getOwnPropertyDescriptors;

    // drawVisuals gets overwritten later - place hook before anti cheat loads
    let drawVisuals = function(ctx) {
        if (ctx) {
            const canvas = ctx.canvas;
            const args = arguments.callee.caller.caller.arguments;
            const config = args.callee;
            const scale = args[0];
            const world = args[1];
            const renderer = args[2];
            const me = args[3];
            const scale2 = args[4];
            if  (typeof window.skid !== "undefined")
            window.skid.onRender(config, canvas, ctx, renderer, scale, me, world);
        }
    };
    const original_clearRect = _window.CanvasRenderingContext2D.prototype.clearRect;
    let hook_clearRect = new Proxy(original_clearRect, {
        apply: function(target, _this, _arguments) {
            target.apply(_this, _arguments);
            drawVisuals(_this);
        }
    });
    _window.CanvasRenderingContext2D.prototype.clearRect = hook_clearRect;

    // hook window.open to always return null (pop up blocker)
    // otherwise we would have to also patch native functions in new window
    const original_open = _window.open;
    let hook_open = new Proxy(original_open, {
        apply: function(target, _this, _arguments) {
            return null;
        }
    });
    _window.open = hook_open;

    if (!shared_state.get('exports')) {
        shared_state.set('exports', (e) => {
            /******************************************************/
            window.main = e(0x16);
            window.console = main.console;
            window.defined = (object) => typeof object !== "undefined";
            window.skid = new Skid(e);
            /******************************************************/
        })
    }

    if (!shared_state.get('procInputs')) {
        shared_state.set('procInputs', function(inputs, world, me) {
            /******************************************************/
            window.skid.onTick(me, world, inputs);
            /******************************************************/ 
        })
    }
    /******************************************************/ 
    const handler = {
      construct(target, args) {
        try {
            var original_fn = new target(...args);
        } catch (e) {
            // modify stack trace to hide proxy
            e.stack = e.stack.replace(/.*Object.*\n/g, '');
            throw e;
        }

        if (args.length == 2 && args[1].length > parseInt("1337 ttap#4547")) {
            let script = args[1];
            window.gamescript = script;

            // note: this window is not the main window

            // Player
            window['canSee'] = script.match(/,this\['(\w+)'\]=function\(\w+,\w+,\w+,\w+,\w+\){if\(!\w+\)return!\w+;/)[1];
            window['isYou'] = script.match(/,this\['\w+'\]=!\w+,this\['\w+'\]=!\w+,this\['(\w+)'\]=\w+,this\['\w+'\]\['length'\]=\w+,this\[/)[1];
            window['cnBSeen'] = script.match(/this\['recon']=!0x1,this\['(\w+)']=!0x1/)[1];
            window['objInstances'] = script.match(/\[\w+\]\['\w+'\]=!\w+,this\['\w+'\]\[\w+\]\['\w+'\]&&\(this\['\w+'\]\[\w+\]\['(\w+)'\]\['\w+'\]=!\w+/)[1];
            window['recoilAnimY'] = script.match(/\w*1,this\['\w+'\]=\w*0,this\['\w+'\]=\w*0,this\['\w+'\]=\w*1,this\['\w+'\]=\w*1,this\['\w+'\]=\w*0,this\['\w+'\]=\w*0,this\['(\w+)'\]=\w*0,this\['\w+'\]=\w*0,this\['\w+'\]=\w*0,this\['\w+'\]=\w*0,/)[1];
            
            //Controls
            window['pchObjc'] = script.match(/\(\w+,\w+,\w+\),this\['(\w+)'\]=new \w+\['\w+'\]\(\)/)[1];     
            window['mouseDownL'] = script.match(/this\['\w+'\]=function\(\){this\['(\w+)'\]=\w*0,this\['(\w+)'\]=\w*0,this\['\w+'\]={}/)[1];
            window['mouseDownR'] = script.match(/this\['\w+'\]=function\(\){this\['(\w+)'\]=\w*0,this\['(\w+)'\]=\w*0,this\['\w+'\]={}/)[2];

            //Exports
            const gm_exports = script.match(/(\['__CANCEL__']=.*?\(\w+,\w+,(\w+)\){)let/);
            const my_exports = gm_exports[1].concat("window.top['", master_key, "'].get('exports')(",gm_exports[2],");let");
            script = script.replace(gm_exports[0], my_exports);
            conceal_string(gm_exports[0], my_exports);
            
            //ProcInputs
            const gm_procInputs = script.match(/(this\['\w+']=function\((\w+,\w+,)\w+,\w+\){)(this)/);
            const my_procInputs =  gm_procInputs[1].concat("window.top['", master_key, "'].get('procInputs')(", gm_procInputs[2], gm_procInputs[3], ");", gm_procInputs[3]);
            script = script.replace(gm_procInputs[0], my_procInputs);
            conceal_string(gm_procInputs[0], my_procInputs);

            /***********************************************************************************************************/
            //remove in game nametags
            script = script.replace(/(if\('none'==menuHolder\['style']\['display']&&'none'==endUI\['style']\['display'])\)/, '$1 && !1)')
            
            //strict mode disable
            script = script.replace(/'use strict';/, "");

            //shoot through penetratable walls
            script = script.replace(/(\(((\w+))=this\['map']\['manager']\['objects']\[(\w+)]\))(.+?)\)/, '$1.penetrable&&$2.active)');

            // all weapons trails on
            script = script.replace(/\w+\['weapon'\]&&\w+\['weapon'\]\['trail'\]/g, "true")

            // color blind mode
            script = script.replace(/#9eeb56/g, '#44AAFF');

            // no zoom
            script = script.replace(/,'zoom':.+?(?=,)/g, ",'zoom':1");

            /***********************************************************************************************************/

            // bypass modification check of returned function
            const original_script = args[1];
            args[1] = script;
            let mod_fn = new target(...args);
            args[1] = original_script;
            conceal_function(original_fn, mod_fn);
            return mod_fn;
        }
        return original_fn;
      }
    };

    // we intercept game.js at the `Function` generation level
    const original_Function = _window.Function;
    let hook_Function = new Proxy(original_Function, handler);
    _window.Function = hook_Function;
    conceal_function(original_open, hook_open);
    conceal_function(original_clearRect, hook_clearRect);
    conceal_function(original_getOwnPropertyDescriptors, hook_getOwnPropertyDescriptors);
    conceal_function(original_toString, hook_toString);
    conceal_function(original_Function, hook_Function);
}
