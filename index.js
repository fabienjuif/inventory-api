const { join } = require('path')
const polka = require('polka')
const cors = require('cors')
const { json } = require('body-parser')
const { v4: uuid } = require('uuid')

const VERSION = process.env.VERSION || 1
const PORT = process.env.PORT || 3000

let armory = []
let weapons = []
let stuff = { belt: undefined, left: undefined, right: undefined }

const dir = join(__dirname, 'public')
const serve = require('serve-static')(dir)

polka()
  .use(cors(), serve, json())
  .use(errorsHandler, responseHandler)
  .post('/reset', res => {
    init()
    res.end()
  })
  .get('/weapons', (req, res) => {
    res.send(weapons)
  })
  .get('/weapons/:idWeapon', (req, res) => {
    const { idWeapon } = req.params

    const weapon = weapons.find(({ id }) => id === idWeapon)
    res.send(weapon || weaponNotFound(idWeapon))
  })
  .get('/armory', (req, res) => {
    res.send(armory)
  })
  .post('/armory/:idWeapon', (req, res) => {
    const { idWeapon } = req.params

    let weapon = armory.find(id => id === idWeapon)
    if (weapon) {
      const error = new Error('Weapon already exists in armory')
      error.idWeapon = idWeapon
      error.statusCode = 400
      res.send(error)
      return
    }

    // TODO: test that the weapon does not already exist in stuff

    weapon = weapons.find(({ id }) => id === idWeapon)
    if (weapon) {
      armory = [...armory, idWeapon]
    }
    res.send(weapon || weaponNotFound(idWeapon))
  })
  .delete('/armory/:idWeapon', (req, res) => {
    const { idWeapon } = req.params

    let oldArmory = armory
    armory = armory.filter(id => id !== idWeapon)
    res.send(
      oldArmory.length === armory.length ? weaponNotFound(idWeapon) : true
    )
  })
  .get('/stuff', (req, res) => {
    res.send(stuff)
  })
  .post('/stuff', (req, res) => {
    const { belt, left, right } = req.body

    const checkWeapon = where => {
      if (req.body[where] === stuff[where]) return true
      if (!req.body[where]) {
        armory = [...armory, stuff[where]].filter(Boolean)
        return true
      }

      const weapon = armory.find(id => id === req.body[where])
      if (!weapon) {
        res.send(weaponNotFound(req.body[where]))
        return false
      }
      return true
    }

    if (checkWeapon('belt') && checkWeapon('right') && checkWeapon('left')) {
      stuff = { belt, left, right }
      armory = armory.filter(id => ![left, belt, right].includes(id))
      res.send(stuff)
    }
  })
  .get('/', (req, res) => {
    res.send({
      name: 'inventory-api',
      version: VERSION,
      resources: ['/weapons', '/armory', '/stuff']
    })
  })
  .listen(PORT, err => {
    if (err) throw err
    init()
    console.log(`> Running on localhost:${PORT}`)
  })

function init() {
  armory = []
  weapons = []
  stuff = { belt: undefined, left: undefined, right: undefined }

  const weaponNames = ['AK47', 'AWP', 'GLOCK18', 'KNIFE', 'M4A4', 'P90']
  weapons = weaponNames.map(name => ({
    id: uuid(),
    name,
    imageUrl: `/images/weapons/${name}.png`
  }))
}

function errorsHandler(req, res, next) {
  res.sendError = error => {
    res.statusCode = error.statusCode || 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ ...error, message: error.message }))
  }
  next()
}

function responseHandler(req, res, next) {
  res.send = (body, statusCode) => {
    if (body instanceof Error) {
      res.sendError(body)
      return
    }
    res.statusCode = statusCode || 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(body))
  }
  next()
}

function weaponNotFound(idWeapon) {
  const error = new Error('Weapon not found')
  error.idWeapon = idWeapon
  error.statusCode = 404
  return error
}
