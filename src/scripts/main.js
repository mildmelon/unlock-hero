let width = window.innerWidth;
let height = window.innerHeight;

WebFont.load({
    google: {
        families: ['Press Start 2P']
    },
    active:e => {
        init();
    }
});
const bump = new Bump(PIXI);
let app;
function init() {
    app = new PIXI.Application({
        width: width,
        height: height,
        antialias: true,
        transparent: false
    });

    PIXI.loader
        .add("assets/images/char.png")
        .add("assets/sound/no_ammo.wav")
        .add("assets/sound/pickup.wav")
        .add("assets/sound/sword-hit.wav")
        .add("assets/sound/punch.wav")
        .add("assets/sound/rock.wav")
        .add("assets/sound/unlock.wav")
        .add("assets/sound/player-hurt.wav")
        .add("assets/music/cold-funk.mp3")
        .add("assets/music/district-four.mp3")
        .add("assets/music/just-nasty.mp3")
        .add("assets/images/sprites/tiles.json")
        .add("assets/images/sprites/entities.json")
        .add("assets/images/sprites/projectiles.json")
        .add("assets/images/sprites/platforms.json")
        .add("assets/credits.txt")
        .load(loadFinished);

    document.body.appendChild(app.view);
}

function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
}

function stepTowards(val, target, step) {
    if (val > target) {
        val -= step;
    }
    if (val < target) {
        val += step;
    }
    if (Math.abs(val - target) <= step) {
        val = target;
    }
    return val;
}

let musicCycle = [
    "assets/music/cold-funk.mp3",
    "assets/music/just-nasty.mp3",
    "assets/music/district-four.mp3"
];
let currentSong = 0;
let slimeSpawnInterval = 10 * 1000;
let slimeSpawnCount = 4;
let lastSlimeSpawnTime = 0;

let batSpawnInterval = 60 * 1000;
let batSpawnCount = 1;
let lastBatSpawnTime = performance.now();
let spawnBats = false;

let world;
let noAmmoSound;
let unlockAnnouncer;
let killCounter;
let ammoCounter;
let hb;
// Menu stage:
let menuBg;
let titleText;
let playButton;
let creditsButton;
// End menu stage
// Credits stage:
let credits;
// End credits stage
let paused = false;
let stage = 0;
let gameStage;
function runUpdate(delta) {
    let now = performance.now();
    if (now - lastSlimeSpawnTime >= slimeSpawnInterval && world.entities.length <= 50) {
        world.spawnEnemies(slimeSpawnCount, "slime");
        lastSlimeSpawnTime = now;
    }

    if (spawnBats && now - lastBatSpawnTime >= batSpawnInterval) {
        world.spawnEnemies(batSpawnCount, "bat");
        lastBatSpawnTime = now;
    }
    world.update(delta);
    unlockAnnouncer.update(delta);
    killCounter.update(delta);
    ammoCounter.update(delta);
    if(world.player.dead) {
        setGameOver();
    }

}

function initMainStage() {
    stage = 1;
    gameStage = new PIXI.Container();
    gameStage.pivot.set(0.5);
    world = new World(app, gameStage, false);
    app.stage.addChild(world.stage);
    hb = new HealthBar(app, new PIXI.Rectangle(0, 0, 500, 80), 20, 20, true);

    let player = new Player(app, world, hb);
    player.setY(world.ground.top);
    let unlockBounds = new PIXI.Rectangle(app.screen.width / 2, 160, 500, 80);
    unlockAnnouncer = new UnlockAnnouncer(app, unlockBounds, player);

    let killCounterBounds = new PIXI.Rectangle(25, 90, 500, 80);
    killCounter = new KillCounter(app, killCounterBounds, player);

    let ammoCounterBounds = new PIXI.Rectangle(25, 128, 500, 80);
    ammoCounter = new AmmoCounter(app, ammoCounterBounds, player);

    app.renderer.backgroundColor = 0;
    world.player = player;
    world.entities.push(player);

    app.ticker.add((delta) => {
        if(!paused) {
            runUpdate(delta)
        }
    });
}
function fadeOutBg(lightness, cb) {
    if(lightness <= 0) {
        cb();
    } else {
        lightness -= 0.005;
        menuBg.color.setLight(lightness, lightness, lightness);
        requestAnimationFrame(() => fadeOutBg(lightness, cb))
    }
}
function initMainMenuStage() {
    stage = 0;
    let unit = app.screen.height / 20;
    menuBg = new PIXI.heaven.Sprite(PIXI.Texture.WHITE);
    menuBg.tint = 0x393939;

    menuBg.anchor.set(0.5);
    menuBg.width = app.screen.width;
    menuBg.height = app.screen.height;
    app.stage.addChild(menuBg);
    titleText = new TextDisplay(app, new PIXI.Rectangle(0, -3.5 * unit, 160, 40), "UNLOCK HERO", 60, 0xaa3832);
    playButton = new TextButton(app, new PIXI.Rectangle(0, -2 * unit, 80, 20), "Play Game", 24, 0xFFFFFF, 0x888888);
    creditsButton = new TextButton(app, new PIXI.Rectangle(0, -1 * unit, 80, 20), "Credits", 24, 0xFFFFFF, 0x888888);
    creditsButton.click = () => {
        destroyMainMenuStage();
        initCreditsStage();
    };
    playButton.click = () => {
        requestAnimationFrame(() => fadeOutBg(menuBg.color.light[0], () => {
            destroyMainMenuStage();
            initMainStage();
        }))

    };
    app.stage.position.set(app.screen.width / 2, app.screen.height / 2);
}
function initCreditsStage() {
    stage = 2;
    let unit = app.screen.height / 20;
    titleText = new TextDisplay(app, new PIXI.Rectangle(0, -9 * unit, 160, 40), "CREDITS", 60, 0xFFFFFF);
    playButton = new TextButton(app, new PIXI.Rectangle(0, -8 * unit, 80, 20), "Go Back", 24, 0x46a152, 0x7ac483);
    playButton.click = () => {
        destroyCreditsStage();
        initMainMenuStage();
    };
    credits = new TextDisplay(app, new PIXI.Rectangle(0, unit, app.screen.width, 20), PIXI.loader.resources['assets/credits.txt'].data,
        24, 0xFFFFFF, true);


}
function destroyCreditsStage() {
    titleText.destroy();
    playButton.destroy();
    credits.destroy();
}
function destroyMainMenuStage() {
    titleText.destroy();
    playButton.destroy();
    creditsButton.destroy();
    menuBg.destroy();
}

function loadFinished() {
    noAmmoSound = PIXI.loader.resources['assets/sound/no_ammo.wav'].sound;
    initMainMenuStage();
    // initMainStage();
    // app.stage.addChild(getSprite("char.png"))
}
let music;
function nextSong() {
    if(currentSong > musicCycle.length) {
        currentSong = 0;
    }
    music = PIXI.loader.resources[musicCycle[currentSong]].sound;
    let sound = music.play();
    sound.volume = 0.15;
    currentSong++;
    sound.on('end', () => {
        nextSong();
    })

}
function startMusicPlay() {
    nextSong();
}

function zPad(str) {
	let max = 5;
	str = str.toString();
	return str.padStart(max, "0");
}
function lPad(str) {
	let max = 16;
	str = str.toString();
	return str.padEnd(max, " ");
}

function performUnlocks(killCount) {
    switch (killCount) {
        case 3:
            killCounter.setAlpha(1);
            break;
        case 10:
            unlockAnnouncer.setUnlocked("Health HUD");
            hb.setAlpha(1);
            break;
        case 15:
            unlockAnnouncer.setUnlocked("Enemy Health");
            world.entityHBUnlocked = true;
            world.entities.forEach((entity) => {
                if (entity instanceof Living && entity.healthBar) {
                    entity.healthBar.setAlpha(1);
                }
            });
            break;
        case 20:
            unlockAnnouncer.setUnlocked("Jamming");
            startMusicPlay();
            break;
        case 25:
            unlockAnnouncer.setUnlocked("Blue Skies");
            app.renderer.backgroundColor = 0x60959a;
            break;
        case 30:
            unlockAnnouncer.setUnlocked("A Big Stick");
            world.player.weaponMelee = new Stick(app, world);
            break;
        case 40:
            unlockAnnouncer.setUnlocked("Dirt and grass. Congrats");
            world.beautifyGround();
            break;
        case 50:
            unlockAnnouncer.setUnlocked("Better sprites");
            world.player.setAnimationNames("player_walk", "player_idle", "player_melee", "player_ranged");
            world.slimesAreColored = true;
            break;
        case 55:
            unlockAnnouncer.setUnlocked("Ammo counter?");
            ammoCounter.setAlpha(1);
            break;
        case 65:
            unlockAnnouncer.setUnlocked("Platforms for platforming...");
            world.spawnPlatforms();
            break;
        case 70:
            unlockAnnouncer.setUnlocked("Lots of rocks");
            world.spawnRocks = true;
            break;
        case 80:
            unlockAnnouncer.setUnlocked("Gone Batty");
            spawnBats = true;
            break;
        case 90:
            unlockAnnouncer.setUnlocked("More Slimes");
            slimeSpawnInterval /= 2;
            break;
        case 100:
            unlockAnnouncer.setUnlocked("More Bats");
            batSpawnInterval /= 2;
            break;
        case 120:
            unlockAnnouncer.setUnlocked("INFINITE ROCKS");
            if (world.player.weaponRanged.ammo <= 0) {
                world.player.weaponRanged.ammo = 1;
            }
            world.player.weaponRanged.consumable = false;
            break;
        case 135:
            unlockAnnouncer.setUnlocked("Even More Slimes");
            slimeSpawnInterval = 3 * 1000;
            world.slimeBaseHealthMod++;
            break;
        case 150:
            unlockAnnouncer.setUnlocked("Regen (Phew)");
            world.player.regenDelay = 3 * 1000;
            break;
        case 165:
            unlockAnnouncer.setUnlocked("Slimeaggedon");
            slimeSpawnCount += 2;
            world.slimeBaseHealthMod++;
            break;
        case 170:
            unlockAnnouncer.setUnlocked("Stick sharpening (hurts more)");
            world.player.weaponMelee.damage *= 2;
            break;
        case 190:
            unlockAnnouncer.setUnlocked("Rock hard (rocks hit twice before break)");
            world.player.weaponRanged.despawnAfterHits = 2;
            break;
        case 200:
            unlockAnnouncer.setUnlocked("<3 proud of you");
            world.player.maxHealth += 6;
            world.player.health += 6;
            world.player.healthBar.setHealth(world.player.health, world.player.maxHealth + 6);
            break;
        case 210:
            unlockAnnouncer.setUnlocked("Slimepocalypse");
            slimeSpawnCount += 2;
            break;
        case 250:
            unlockAnnouncer.setUnlocked("Catacalslyme");
            world.slimeBaseHealthMod += 2;
            break;
        // case 3:
        //     app.renderer.backgroundColor = 0x60959a;
        //     break;
    }
}
window.addEventListener('playerkill', (e) => {
    this.performUnlocks(e.totalKills)

});
window.addEventListener('resize', () => {
    app.renderer.resize(window.innerWidth, window.innerHeight);
    app.stage.position.set(app.screen.width / 2, app.screen.height / 2);
    let unit = app.screen.height / 20;
    if(stage === 0) {
        if(titleText) {
            titleText.bounds = new PIXI.Rectangle(0, -4 * unit, 160, 40);
            playButton.bounds = new PIXI.Rectangle(app.screen.width / 2, 500, 500, 80);
            creditsButton.bounds = new PIXI.Rectangle(0, -1 * unit, 80, 20);
            menuBg.width = app.screen.width;
            menuBg.height = app.screen.height;
        }
    } else if(stage === 1) {
        unlockAnnouncer.bounds = new PIXI.Rectangle(app.screen.width / 2, 160, 500, 80);
        killCounter.bounds = new PIXI.Rectangle(16, 90, 500, 80);
        ammoCounter.bounds = new PIXI.Rectangle(16, 128, 500, 80);
        if(paused) {
            pauseOverlay.position.x = -app.screen.width / 2;
            pauseOverlay.position.y = app.screen.height / 2;
            pauseOverlay.width = app.screen.width;
            pauseOverlay.height = app.screen.height;
            pauseText.bounds = new PIXI.Rectangle(0, app.screen.height / 2, 160, 40);
            pauseText.update(0);
        }
    } else if (stage === 2) {
        titleText.bounds = new PIXI.Rectangle(0, -4 * unit, 160, 40);
        playButton.bounds = new PIXI.Rectangle(0, -3 * unit, 80, 20);
        credits.bounds = new PIXI.Rectangle(app.screen.width / 2, 500, 500, 80);
    }
});
let pauseOverlay;
let pauseText;
let helpText;

function pauseToggle() {
    paused = !paused;
    if(paused) {
        pauseOverlay = new PIXI.heaven.Sprite(PIXI.Texture.WHITE);
        pauseOverlay.tint = 0x00000;
        pauseOverlay.alpha = 0.5;
        pauseOverlay.anchor.set(0);
        pauseOverlay.position.x = -app.screen.width / 2;
        pauseOverlay.position.y = app.screen.height / 2;

        let relX =  app.screen.width / 2;
        let relY = app.screen.height / 2;
        pauseOverlay.position.x = app.stage.pivot.x - relX;
        pauseOverlay.position.y = app.stage.pivot.y - relY;
        pauseOverlay.width = app.screen.width;
        pauseOverlay.height = app.screen.height;
        app.stage.addChild(pauseOverlay);
        pauseText = new TextDisplay(app, new PIXI.Rectangle(app.screen.width / 2, app.screen.height / 2 - 175, 160, 40),
            "GAME PAUSED", 60, 0xFFFFFF);
		helpText = new TextDisplay(app, new PIXI.Rectangle(app.screen.width / 2, app.screen.height / 2 - 100, 160, 40),
			"(Press Escape to Unpause)", 24, 0xbababa);
        pauseText.sticky = true;
		helpText.sticky = true;
        pauseText.update(0);
		helpText.update(0);
        if(music) {
            music.pause();
        }
    } else {
        if(pauseOverlay) {
            app.stage.removeChild(pauseOverlay);
            pauseText.destroy();
            helpText.destroy();
            if(music) {
                music.resume();
            }
        }
    }
}
function setGameOver() {
    paused = true;
    pauseOverlay = new PIXI.heaven.Sprite(PIXI.Texture.WHITE);
    pauseOverlay.tint = 0x00000;
    pauseOverlay.alpha = 0.75;
    pauseOverlay.anchor.set(0);
    pauseOverlay.position.x = -app.screen.width / 2;
    pauseOverlay.position.y = app.screen.height / 2;

    let relX =  app.screen.width / 2;
    let relY = app.screen.height / 2;
    pauseOverlay.position.x = app.stage.pivot.x - relX;
    pauseOverlay.position.y = app.stage.pivot.y - relY;
    pauseOverlay.width = app.screen.width;
    pauseOverlay.height = app.screen.height;
    app.stage.addChild(pauseOverlay);
    pauseText = new TextDisplay(app, new PIXI.Rectangle(app.screen.width / 2, app.screen.height / 2 - 100, 160, 40),
        "GAME OVER", 60, 0xaa3832);
    pauseText.sticky = true;
    pauseText.update(0);
    let scoreText = "\n" + lPad("Final Score: ") + zPad(world.player.killCount) + "\n";
    let storedScore = localStorage.getItem("highScore") || 0;
    if(storedScore < world.player.killCount) {
        scoreText += "\n" + lPad("New High Score: ") + zPad(world.player.killCount);
        scoreText += "\n" + lPad("Old High Score: ") + zPad(storedScore);
        localStorage.setItem("highScore", world.player.killCount);
    } else {
        scoreText += "\n" + lPad("High Score: ") + zPad(storedScore);
    }
    let finalScore = new TextDisplay(app, new PIXI.Rectangle(app.screen.width / 2, app.screen.height / 2, 160, 40),
        scoreText, 24, 0xFFFFFF);
    finalScore.sticky = true;
    finalScore.update(0);

    if(music) {
        music.pause();
    }
    let backButton = new TextButton(app, new PIXI.Rectangle(app.screen.width / 2, app.screen.height / 2 + 100, 80, 20),
		"Return to Menu", 24, 0x46a152, 0x7ac483);
    backButton.sticky = true;
    backButton.update(0);
    backButton.click = () => {
        window.location.reload();
    }

}
window.addEventListener("keyup", (e) => {
    if (stage === 1 && e.key === "Escape") {
        pauseToggle();
        e.preventDefault();
    }
},false);

window.addEventListener("blur", (e) => {
    if (stage === 1 && !paused) {
        pauseToggle();
    }
});