// note:    this script gets injected into its own isolated context/iframe
//          to console.log we would have to call window.top.console.log

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
    const master_key = 'ttap#4547';
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
    let drawVisuals = function() {};
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
            window.consts = e(0x7);
            window.utils = e(0x8);
            window.three = e(0x4);
            window.colors = e(0x15);
            window.uiFunctions = e(0x85);
            window.self = e(0x16);
            self.console.dir(window);
            /******************************************************/
        })
    }

    if (!shared_state.get('procInputs')) {
        shared_state.set('procInputs', function(inputs, world, me) {
            /******************************************************/
            let controls = world.controls;
            /******************************************************/ 
            const playerHeight = 11;
            const cameraHeight = 1.5;
            const nameOffset = 0.6;
            const nameOffsetHat = 0.8;
            const recoilMlt = 0.3;
            const crouchDst = 3;
            const headScale = 2;
            const hitBoxPad = 1;
            const armScale = 1.3;
            const chestWidth = 2.6;
            const armInset = -.1;
            const playerScale = (2 * armScale + chestWidth + armInset) / 2;
            const SHOOT = 5, SCOPE = 6, xDr = 3, yDr = 2, JUMP = 7, CROUCH = 8;
            const PI2 = Math.PI * 2;
            let defined = (object) => typeof object !== "undefined";
            let isEnemy = function(player) {return !me.team || player.team != me.team};
            let canHit = function(player) {return null == world[canSee](me, player.x3, player.y3 - player.crouchVal * crouchDst, player.z3)};
            let normaliseYaw = function(yaw) {return (yaw % PI2 + PI2) % PI2;};
            let getDir = function(a, b, c, d) {
                return Math.atan2(b - d, a - c);
            };
            let getD3D = function(a, b, c, d, e, f) {
                let g = a - d, h = b - e, i = c - f;
                return Math.sqrt(g * g + h * h + i * i);
            };
            let getXDire = function(a, b, c, d, e, f) {
                let g = Math.abs(b - e), h = getD3D(a, b, c, d, e, f);
                return Math.asin(g / h) * (b > e ? -1 : 1);
            };

            let dAngleTo = function(x, y, z) {
                let ty = normaliseYaw(getDir(controls.object.position.z, controls.object.position.x, z, x));
                let tx = getXDire(controls.object.position.x, controls.object.position.y, controls.object.position.z, x, y, z);
                let oy = normaliseYaw(controls.object.rotation.y);
                let ox = controls[pchObjc].rotation.x;
                let dYaw = Math.min(Math.abs(ty - oy), Math.abs(ty - oy - PI2), Math.abs(ty - oy + PI2));
                let dPitch = tx - ox;
                return Math.hypot(dYaw, dPitch);
            };
            let calcAngleTo = function(player) {return dAngleTo(player.x3, player.y3 + playerHeight - (headScale + hitBoxPad) / 2 - player.crouchVal * crouchDst, player.z3);};
            let calcDistanceTo = function(player) {return getD3D(player.x3, player.y3, player.z3, me.x, me.y, me.z)};
            let isCloseEnough = function(player) {let distance = calcDistanceTo(player); return me.weapon.range >= distance && ("Shotgun" != me.weapon.name || distance < 70) && ("Akimbo Uzi" != me.weapon.name || distance < 100);};
            let haveAmmo = function() {return !(me.ammos[me.weaponIndex] !== undefined && me.ammos[me.weaponIndex] == 0);};

            // target selector - based on closest to aim
            let closest = null, closestAngle = Infinity;
            let players = world.players.list;
            for (var i = 0; me.active && i < players.length; i++) {
                let e = players[i];
                if (e[isYou] || !e.active || !e[objInstances] || !isEnemy(e)) {
                    continue;
                }

                // experimental prediction removed
                e.x3 = e.x;
                e.y3 = e.y;
                e.z3 = e.z;

                if (!isCloseEnough(e) || !canHit(e)) {
                    continue;
                }

                let angle = calcAngleTo(e);
                if (angle < closestAngle) {
                    closestAngle = angle;
                    closest = e;
                }
            }
            // aimbot
            let ty = controls.object.rotation.y, tx = controls[pchObjc].rotation.x;
            if (closest) {
                let target = closest;
                let y = target.y3 + playerHeight - (headScale/* + hitBoxPad*/) / 2 - target.crouchVal * crouchDst;
                if (me.weapon.nAuto && me.didShoot) {
                    inputs[SHOOT] = 0;
                } else if (!me.aimVal) {
                    inputs[SHOOT] = 1;
                    inputs[SCOPE] = 1;
                } else {
                    inputs[SCOPE] = 1;
                }

                ty = getDir(controls.object.position.z, controls.object.position.x, target.z3, target.x3);
                tx = getXDire(controls.object.position.x, controls.object.position.y, controls.object.position.z, target.x3, y, target.z3);

                // perfect recoil control
                tx -= recoilMlt * me[recoilAnimY];
            } else {
                inputs[SHOOT] = controls[mouseDownL];
                inputs[SCOPE] = controls[mouseDownR];
            }


            // silent aim
            inputs[xDr] = +(tx % PI2).toFixed(3);
            inputs[yDr] = +(ty % PI2).toFixed(3);

            // auto reload
            controls.keys[controls.reloadKey] = !haveAmmo() * 1;

            // bhop
            inputs[JUMP] = (controls.keys[controls.jumpKey] && !me.didJump) * 1;

            me.lastInput = inputs;

            // runs once
            if (!shared_state.get('init')) {
                shared_state.set('init', true);

                drawVisuals = function(ctx) {
                    const args = arguments.callee.caller.caller.arguments;
                    const config = args.callee;
                    const scale = args[0];
                    //const world = args[1];
                    const renderer = args[2];
                    //const me = args[3];
                    //const scale2 = args[4];

                    const fonts = {
                        ssBig: '30px\x20Sans-serif',
                        ssSmall: '20px\x20Sans-serif',
                        gmBig: '30px\x20GameFont',
                        gmSmall: '20px\x20GameFont'
                    }
                    
                    if (ctx) {
                        const canvas = ctx.canvas;
                        let playerScaled = 0,
                        fullWidth = canvas.parentNode.clientWidth,
                        fullHeight = canvas.parentNode.clientHeight,
                        scaledWidth = canvas.width / scale,
                        scaledHeight = canvas.height / scale,
                        camPos = renderer.camera.getWorldPosition(),
                        entities = world.players.list.filter(x => { return x.active && !x[isYou] });
                        
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
                

                        if (1) {
                            entities.map((entity, index, array)=> {
                                
                                if (defined(entity[objInstances])) {
                                    let entityPos = entity[objInstances].position;
                                    let entitynamePos = entityPos.clone().setY(entityPos.y + (playerHeight + (0x0 <= entity.hatIndex ? nameOffsetHat : 0) + nameOffset - entity.crouchVal * crouchDst));
                                    let teamCol = !isEnemy(entity) ? '#44AAFF' : '#FF4444';
                                    let entityScrPosName = entitynamePos.clone();          
                                    let playerScaled = Math.max(0.3, 1 - camPos.distanceTo(entityScrPosName) / 600);
                                    if (1 <= 20 * playerScaled && renderer.frustum.containsPoint(entityScrPosName)) {       
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
                                        ctx.fillStyle = !isEnemy(entity) ? window.colors.teams[0] : window.colors.teams[1], ctx.fillRect(-60, -16, entity.health / entity.maxHealth * 120, 16);
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
                                        ctx.globalAlpha = 0x0 <= window.consts.verClans.indexOf(entity.clan) ? 0x1 : 0.4,
                                        ctx.fillStyle = 0x0 <= window.consts.verClans.indexOf(entity.clan) ? window.colors.verified.clan : 'white', clan && ctx.fillText(clan, -fullScale / 0x2 + distScale + nameScale, 0x0);
                                        ctx.restore();
                                    }

                                    //2d
                                    if (renderer.frustum.containsPoint(entityPos)) {
                                        let entityScrPosBase = world2Screen(renderer.camera, entityPos),
                                            entityScrPosHead = world2Screen(renderer.camera, entityPos.setY(entityPos.y + playerHeight - entity.crouchVal * crouchDst)),
                                            entityScrPxlDiff = pixelDifference(entityScrPosBase, entityScrPosHead, 0.6);
                                        rect(entityScrPosHead.x - entityScrPxlDiff[1] / 2, entityScrPosHead.y, 0, 0, entityScrPxlDiff[1], entityScrPxlDiff[0], teamCol, false);
                                        line(canvas.width / 2, canvas.height - 1, entityScrPosBase.x, entityScrPosBase.y, 2.5, teamCol);
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
                    }
                };
            };
        })
    }

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
