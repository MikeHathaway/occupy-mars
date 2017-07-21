const io = global._io
const Game = global._Game

const Player = require('../models/Player').Player
const Bullet = require('../models/Bullet').Bullet
const Enemy = require('../models/Enemy').Enemy

const players = []
const bullets = []
const enemies = []

const gameSessions = Game.gameSessions

//https://www.codementor.io/codementorteam/socketio-multi-user-app-matchmaking-game-server-2-uexmnux4p

//https://www.npmjs.com/package/node-pathfinding
// ^node pathfinder


module.exports = {
  onNewPlayer,
  onNewEnemies,
  onMovePlayer,
  onMoveEnemy,
  onShoot,
  onEnemyHit,
  onSocketDisconnect
}


//identify the proper game room --roomID
//io.sockets.in()

function onNewPlayer(data) {
  const newPlayer = new Player(data.x, data.y)
  newPlayer.id = data.id
  newPlayer.gameID = data.gameID.toString()
  const roomID = newPlayer.gameID

  console.log('on new player')

  //first player in new game
  if(gameSessions[newPlayer.gameID].players.length === 0){
    console.log('first player in game', gameSessions)
    io.sockets.in(roomID).emit('newPlayer', {id: newPlayer.id, x: newPlayer.getX(), y: newPlayer.getY(), gameID: newPlayer.gameID})
    // io.sockets.emit('newPlayer', {id: newPlayer.id, x: newPlayer.getX(), y: newPlayer.getY(), gameID: newPlayer.gameID})
    return gameSessions[newPlayer.gameID].players.push(newPlayer);
  }

  //existing game - make sure all players are in sync with eachother
  else if(gameSessions[newPlayer.gameID].players.length <= 3){
    console.log('joining existing game')
    //console.log('joining existing game', gameSessions[newPlayer.gameID])
    io.sockets.in(roomID).emit('newPlayer', {id: newPlayer.id, x: newPlayer.getX(), y: newPlayer.getY(), gameID: newPlayer.gameID})

    // send enemies if joining existing game
    io.sockets.in(roomID).emit('newEnemies', {enemyList: gameSessions[newPlayer.gameID].enemies})

    gameSessions[newPlayer.gameID].players.forEach(player => {
      this.in(roomID).emit('newPlayer', {id: player.id, x: player.getX(), y: player.getY(), gameID: newPlayer.gameID})
    })

    return gameSessions[newPlayer.gameID].players.push(newPlayer);
  }
}


function onNewEnemies(data){
  const currentGame = gameSessions[data.gameID.toString()]
  const roomID = data.gameID.toString()
  //ensure that enemies are only added once
  console.log('on new enemies called', enemies.length,data.number)
  if(currentGame.enemies.length === 0){
    addEnemies(data)
    return io.sockets.in(roomID).emit('newEnemies', {enemyList: currentGame.enemies})
  }
  else if(currentGame.enemies.length <= data.number){
    return io.sockets.in(roomID).emit('newEnemies', {enemyList: currentGame.enemies})
  }
}

function addEnemies(data){
  let currentNum = 0
  console.log(data, Game.lastEnemyId)
  while(currentNum++ < data.number){
    const newEnemy = new Enemy(Game.lastEnemyId, randomInt(0,data.x), randomInt(0,data.y))
    newEnemy.gameID = data.gameID.toString()
    Game.lastEnemyId++
    gameSessions[data.gameID.toString()].enemies.push(newEnemy)
  }
}

function onMovePlayer(data) {
  const movePlayer = playerById(data.id,data.gameID)
  const roomID = data.gameID.toString()

  if (!movePlayer) {
      console.log("Player not found: " + data.id)
      return
  }

  movePlayer.setX(data.x)
  movePlayer.setY(data.y)

  //need to broadcast.emit this one
  io.sockets.in(roomID).emit("movePlayer", {id: movePlayer.id, x: movePlayer.getX(), y: movePlayer.getY()})
  // io.sockets.in(roomID).broadcast.emit("movePlayer", {id: movePlayer.id, x: movePlayer.getX(), y: movePlayer.getY()})
}


function onMoveEnemy(data){
  const moveEnemy = enemyById(data.id,data.gameID) //send gameID as well
  const roomID = data.gameID.toString()

  if (!moveEnemy) {
      // console.log("Enemy (move) not found: " + data.id)
      return
  }

  const enemyRange = moveEnemy.speed * 60

  const target = decideToMove(moveEnemy,enemyRange)

  if(target !== -1){
    identifyNextPosition(moveEnemy,enemyRange,gameSessions[moveEnemy.gameID].players[target])
    io.sockets.in(roomID).emit('moveEnemy', {id: moveEnemy.id, x: moveEnemy.x, y: moveEnemy.y})
  }
}

// && check that they are also within y range
function identifyNextPosition(enemy,enemyRange,player){
  if(Math.floor(Math.random() * 2) === 1){
    // enemy.isMoving = true
    if((Math.floor(enemy.x) - Math.floor(player.getX())) < enemyRange) return enemy.x += enemy.speed
    if((Math.floor(enemy.x) + Math.floor(player.getX())) > enemyRange) return enemy.x -= enemy.speed
  }
  else {
    // enemy.isMoving = true
    if((Math.floor(enemy.y) - Math.floor(player.getY())) < enemyRange) return enemy.y += enemy.speed
    if((Math.floor(enemy.y) + Math.floor(player.getY())) > enemyRange) return enemy.y -= enemy.speed
  }
}

// && enemy.isMoving === false <- check that enemy isn't already moving
function decideToMove(enemy, enemyRange){
  const gamePlayers = gameSessions[enemy.gameID].players
  for(let i = 0; i < gamePlayers.length; i++){
    if(
      Math.floor(enemy.x) - Math.floor(gamePlayers[i].getX()) < enemyRange ||
      Math.floor(enemy.y) - Math.floor(gamePlayers[i].getY()) < enemyRange
       ){
        //console.log('true')
       return i
     }
      return -1
  }
}


function onShoot(data){
  const bulletType = data.type
  console.log(data.id, ' is shooting!', bulletType)
  const bullet = new Bullet(Object.keys(bullets).length, data.id, data.x, data.y, data.v, data.r, bulletType)
  bullet.gameID = data.gameID
  const roomID = data.gameID.toString()
  bullets.push(bullet)

  // this.volatile.broadcast.emit('shoot', bullet)
  // this.volatile.emit('shoot', bullet)
  // this.broadcast.emit('shoot', bullet)
  io.sockets.in(roomID).emit('shoot', bullet)
}





function resetBullets(){

}








function onEnemyHit(data){
  const hitEnemy = enemyById(data.id,data.gameID)
  const roomID = data.gameID.toString()

  if (!hitEnemy) {
      console.log("Enemy (move) not found: " + data.id)
      return
  }

  console.log('ENEMY HIT!!!!!!',hitEnemy.health, data.damage)

  hitEnemy.health -= data.damage

  if(hitEnemy.health <= 0){
    io.sockets.in(roomID).emit('enemyHit', {id: hitEnemy.id, health: 0, alive: false})
    return gameSessions[data.gameID].enemies.splice(gameSessions[data.gameID].enemies.indexOf(hitEnemy),1)

    // return enemies.splice(enemies.indexOf(hitEnemy),1)
  }
  return io.sockets.in(roomID).emit('enemyHit', {id: hitEnemy.id, health: hitEnemy.health, alive: true, gameID: data.gameID})
}


// ADD GAME ID to socket disconnect
function onSocketDisconnect() {
  console.log("Player has disconnected: " + this.id)

  const removePlayer = playerById(this.id)
  
  if (!removePlayer) {
      console.log("Player not found: " + this.id)
      return
  }

  io.sockets.in(roomID).emit()
  this.broadcast.emit('removePlayer', {id: removePlayer.id})
  players.splice(players.indexOf(removePlayer), 1)
}





/* =============== =============== ===============

 =============== HELPER FUNCTIONS ===============

 =============== =============== =============== */


function randomInt (low, high) {
  return Math.floor(Math.random() * (high - low) + low);
}

function playerById (id,gameID) {
  if(gameSessions[gameID]){
    const identifiedPlayer = gameSessions[gameID].players.filter(player => player.id === id)
    return identifiedPlayer.length > 0 ? identifiedPlayer[0] : false
  }
  console.error('Game session not properly defined - player')
}

function enemyById (id,gameID) {
  if(gameSessions[gameID]){
    const identifiedEnemy = gameSessions[gameID].enemies.filter(enemy => enemy.id === id)
    return identifiedEnemy.length > 0 ? identifiedEnemy[0] : false
  }
  console.error('Game session not properly defined - enemy')
}
