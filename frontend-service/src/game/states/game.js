/* ----- Model Dependencies ----- */
import Bullet from '../models/bullet'
import {SingleBullet, LazerBeam} from '../models/weapon'
import Enemy from '../models/enemy'
import Player from '../models/player'


/* ----- State Dependencies ----- */
import CivZombie from '../main'

/* ----- Server Dependencies ----- */
import {socket, setEventHandlers, playerObs} from '../eventHandlers'
import enemyHandlers from '../eventHandlers/enemyHandlers'
import playerHandlers from '../eventHandlers/playerHandlers'



  /* ----- Declares global variables ----- */
  let map
    , layer
    , players
    , cursors
    , fireButton
    , changeKey
    , collisionLayer
    , enemies
    , bullets
    , weapons
    , localPlayer

  const gameWidth = 1000
  const gameHeight = 800
  const score = 0
  const enemyMap = []
  const numEnemies = 15


  /* ----- Start Game Instance ----- */
  const game = {
    init: init,
    preload: preload,
    create: create,
    update: update,
    render: render
  }


  function init(){
    game.stage.disableVisibilityChange = true
  }

  function preload(){
    game.load.crossOrigin = 'anonymous'

    game.load.tilemap('desert', './assets/tilemaps/desert.json', null, Phaser.Tilemap.TILED_JSON)
    game.load.tilemap('forest', './assets/tilemaps/forest.json', null, Phaser.Tilemap.TILED_JSON)
    game.load.image('forestTiles', './assets/tilemaps/trees-and-bushes.png')
    game.load.image('tiles', './assets/tilemaps/tmw_desert_spacing.png')

    game.load.image('zombie', './assets/CZombieMini.png') //Zombie_Sprite CZombie
    game.load.image('Zombie_Sprite', './assets/Zombie_Sprite.png') //Zombie_Sprite CZombie
    game.load.image('bullet', './assets/singleBullet.png')
    game.load.image('lazer', './assets/lazer.png')
    game.load.spritesheet('zombies', './assets/zombie_sheet.png', 32, 48)
  }

  function create(){
    configureGame()

    addMap('desert') // specify map can be: ['desert', 'forest']
    addEnemies(numEnemies) //specify number of enemies to be added
    addWeapons()
    addPlayerGroup()
    addScore() // Score animations
    addInputs() // Add game controls

    setEventHandlers() // Start listening for events

    // checkForNewPlayers()
    addEnemiesToGroup()
    enemyHandlers.addRemoteEnemies()
  }

  function update(){
    if (localPlayer) checkPlayerInputs(localPlayer)
    if (localPlayer) checkCollisions()
    if (enemies) checkEnemyActions()

    checkScore()
    checkGameOver()
  }

  function render(){
	  //  if (localPlayer) game.debug.text("Player Health: " + localPlayer.health + " / " + localPlayer.maxHealth, 32, 32);
	  //  if (localPlayer) game.debug.text("Player Score:  " + game.score, 32, 64);
    //  if (localPlayer) game.debug.text("Enemies Remaining:  " + enemies.children.length, 32, 96);
  }


  /* =============== =============== ===============

   =============== CREATE FUNCTIONS ===============

   =============== =============== =============== */

  function configureGame(){
    game.physics.startSystem(Phaser.Physics.ARCADE)
    game.forceSingleUpdate = true //suggested sync config
    // game.world.setBounds(-1000, -1000, 2000, 2000)
    game.playerMap = {}
    game.scale.pageAlignHorizontally = true;
    game.scale.pageAlignVertically = true;

    // configure FPS
    game.time.advancedTiming = true;
    game.time.desiredFps = 60;

    //bounds for enemy positioning
    game.startX = 32
    game.startY = game.world.height / 2
  }



  function addMap(type){
    if(type === 'desert') desertMap()
    if(type === 'forest') forestMap()
  }

  function desertMap(){
    map = game.add.tilemap('desert')
    map.addTilesetImage('Desert', 'tiles')
    layer = map.createLayer('Ground')
    layer.resizeWorld()
  }

  function forestMap(){
    map = game.add.tilemap('forest')
    map.addTilesetImage('forestTiles', 'forestTiles')
    map.addTilesetImage('tmw_desert_spacing', 'tiles')
    layer = map.createLayer('MapLayer')
    collisionLayer = map.createLayer('CollisionLayer')
    collisionLayer.visible = false
    map.setCollisionByExclusion([], true, collisionLayer)
  }

  //https://leanpub.com/html5shootemupinanafternoon/read <- info on randomizing enemy spawn
  function addEnemies(number = 100){
    enemies = game.add.group()
    //socket.emit('newEnemies',{number: number, x: gameWidth, y: gameHeight})
  }


  function createScoreAnimation(x,y,message,score){
    const scoreFont = "20px Arial"

    //Create a new label for the score
    const scoreAnimation = game.add.text(x, y, message, {font: scoreFont, fill: "#ff0000", stroke: "#ffffff", strokeThickness: 5})
    scoreAnimation.anchor.setTo(0.5, 0)
    scoreAnimation.align = 'center'

    //Tween this score label to the total score label
    const scoreTween = game.add.tween(scoreAnimation).to({x:game.world.centerX, y: 50}, 800, Phaser.Easing.Exponential.In, true)

    //When the animation finishes, destroy this score label, trigger the total score labels animation and add the score
    scoreTween.onComplete.add(function(){
        scoreAnimation.destroy()
        game.scoreLabelTween.start()
        game.scoreBuffer += score
    }, game)
  }

  function addScore(){
    game.score = 0
    game.scoreBuffer = 0
    // game.add.text(16, 16, 'score: 0', { fontSize: '32px', fill: '#111' })

    const scoreFont = "100px Indie Flower"

    //Create the score label -> may want to move away from adding it directly on game object?
    game.scoreLabel = game.add.text(game.world.centerX, 50, '0', {font: scoreFont, fill: "#ff0000", stroke: "#535353", strokeThickness: 15})
    // scoreLabel.anchor.setTo(0.5, 0)
    game.scoreLabel.align = 'center'

    //Create a tween to grow / shrink the score label
    game.scoreLabelTween = game.add.tween(game.scoreLabel.scale).to({ x: 1.5, y: 1.5}, 200, Phaser.Easing.Linear.In).to({ x: 1, y: 1}, 200, Phaser.Easing.Linear.In)
  }



  function addPlayerGroup(){
    players = game.add.group()
    return players
  }

  function addWeapons(){
    weapons = game.add.group()
    weapons.add(new SingleBullet(game,'bullet'))
    weapons.add(new LazerBeam(game,'lazer'))
    game.weapons = weapons

    return weapons
  }

  function addInputs(){
    cursors = game.input.keyboard.createCursorKeys()
    fireButton = game.input.keyboard.addKey(Phaser.KeyCode.SPACEBAR)
    changeKey = game.input.keyboard.addKey(Phaser.Keyboard.ENTER)
  }





  /* =============== =============== ===============

   =============== UPDATE FUNCTIONS ===============

   =============== =============== =============== */



  function checkPlayerInputs(player){
    if (cursors.left.isDown){
      player.body.x -= player.body.velocity.x
      sendPlayerMovement(player)
    }
    if (cursors.right.isDown){
      player.body.x += player.body.velocity.x
      sendPlayerMovement(player)
    }
    if (cursors.up.isDown){
      player.body.y -= player.body.velocity.y
      sendPlayerMovement(player)
    }
    if (cursors.down.isDown){
      player.body.y += player.body.velocity.y
      sendPlayerMovement(player)
    }
    if (fireButton.isDown){
      // player.weapons.children[player.currentWeapon].fire(player)
      sendShot(player)
    }
    if(changeKey.isDown){
      changeWeapon(player)
    }
  }

  function sendPlayerMovement(player){
     socket.emit('movePlayer',{id: player.id, x: player.body.x, y: player.body.y, gameID: player.gameID}) //gameID: player.gameID
  }

  function sendShot(player){
     const weapon = player.weapons.children[player.currentWeapon]

     const type = weapon.cursor.type //recent addition to be able to view other peoples firing type
     console.log('type',type,weapon)

     if(checkTimeToFire(player,weapon)){
       socket.emit('shoot', {id: player.id, x: player.body.x, y: player.body.y, v: weapon.bulletSpeed, r: player.body.rotation, type: type, gameID: player.gameID})
     }
  }

  function checkTimeToFire(player, weapon){
     if (game.time.time < weapon.nextFire) {
       return false
     }
     else{
       weapon.nextFire = game.time.time + weapon.fireRate
       return true
     }
  }


  function changeWeapon(player){
    if(player.currentWeapon === 1){
      player.currentWeapon = 0
      return player
    }

    if(player.currentWeapon === 0){
      player.currentWeapon = 1
      return player
    }
  }




  function checkCollisions(){
    game.physics.arcade.collide(localPlayer, collisionLayer)
    game.physics.arcade.collide(enemies, collisionLayer)

    /* Collide weaponry with enemies */
    game.physics.arcade.overlap(localPlayer.weapons, enemies, hitEnemy, null, this)

    /* Collide weaponry with other players */
      //currently a stretch goal to include 3v3 mode
      // game.physics.arcade.overlap(localPlayer.weapons, players, hitPlayer, null, this)
  }

  function hitEnemy(bullet, enemy){
    const damage = bullet.parent.damage
    enemy.takeDamage(damage)
    bullet.kill()
    console.log("Hit Zombie")
    socket.emit('enemyHit',{id: enemy.id, damage: damage, gameID: enemy.gameID})

    const score = damage
    // game.score += 5
    createScoreAnimation(enemy.x,enemy.y,`${score}`,5)
  }

  function hitPlayer(bullet, player){
    console.log(bullet, player)
    player.takeDamage(bullet.parent.damage)
    // bullet.kill() //<- hits own player
    console.log("Hit Player")


  }

  function checkScore(){
    if(game.scoreBuffer > 0){
        incrementScore()
        game.scoreBuffer--
    }
  }

  function incrementScore(){
    game.score += 1
    game.scoreLabel.text = game.score
  }


  function aimRotation(){
    const myPoint = new Phaser.Point( sprite.width / 2 + 30,  -sprite.height / 2)
    myPoint.rotate(sprite.rotation)
    this.getFirstExists(false).fire(sprite.x+myPoint.x, sprite.y+myPoint.y, sprite.rotation, BulletPool.BULLET_SPEED)
  }


  function checkEnemyActions(){
    if(enemies) enemies.children.map(enemyOperations)
  }

  function enemyOperations(enemy){
    if(enemy.isAlive()){
      enemyHandlers.sendEnemyMovement(enemy)
      return enemy
    }
    return enemy.destroy()
  }

function checkGameOver(){
  if(game.score >= 100){
    // refresh socket after game over: socket.emit('disconnect')
    socket.emit('gameOver', {gameID: gameID})
    CivZombie.game.state.start('GameOver')

  }
}




  /* =============== =============== ===============

   =============== MULTIPLAYER FUNCTIONS ===============

   =============== =============== =============== */


  function shootOperation(data){
    const player = game.playerMap[data.pid];
    const weapon = player.weapons.children[player.currentWeapon]
    const bullet = weapon.children[data.id]
    bullet.reset(data.x,data.y)
    bullet.rotation = data.r
    // bullet.body.velocity = game.physics.arcade.velocityFromRotation(bullet.rotation, bullet.body.velocity)
    game.physics.arcade.velocityFromAngle(bullet.rotation, weapon.bulletSpeed, bullet.body.velocity)
  }

  //similar to shoot operation, but removes velocity factor
  function layMine(data){
    const player = game.playerMap[data.pid];
    const weapon = player.weapons.children[player.currentWeapon]
    const bullet = weapon.children[data.id]
    bullet.reset(data.x,data.y)
    bullet.rotation = data.r
  }


  function addPlayersToGame(player){
    players.add(player)
    game.playerMap[player.id] = player


    if(!localPlayer) {
      console.log('setting local player', player.id)
      localPlayer = player

      // game.gameID = localPlayer.gameID
      game.camera.follow(localPlayer)
    }
  }





  function removeOperations(removePlayer){
    removePlayer.kill()
    delete game.playerMap[removePlayer.id]
  }



  function addEnemiesToGroup(){
    playerObs.on('enemyGroup',(data) => {
      console.log('enemy data!!',data)
      return enemies.add(data)
    })
  }


  /** Event Listeners outside of update loop*/
  playerObs.on('removePlayer', removeOperations)
  playerObs.on('movingPlayer', playerHandlers.movePlayerOperation)
  playerObs.on('shootPlayer', shootOperation)
  playerObs.on('movingEnemy', enemyHandlers.moveEnemyOperation)
  playerObs.on('addPlayer', addPlayersToGame)



export default game
