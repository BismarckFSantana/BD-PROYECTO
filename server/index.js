import 'dotenv/config'
import cors from 'cors'
import { createHmac, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto'
import express from 'express'
import { mkdirSync } from 'node:fs'
import { unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import rateLimit from 'express-rate-limit'
import multer from 'multer'
import sql from 'mssql'

const app = express()
const port = Number(process.env.API_PORT || 3001)
const uploadDirectory = path.resolve(process.env.PRODUCT_IMAGE_DIRECTORY || 'uploads')
const sessionCookieName = 'luna_session'
const sessionLifetimeSeconds = 60 * 60 * 24 * 7
const scryptAsync = promisify(scrypt)
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()).filter(Boolean)
  : false

mkdirSync(uploadDirectory, { recursive: true })
app.use(cors({ origin: allowedOrigins, credentials: true }))
app.use(express.json({ limit: '16kb' }))
app.use('/uploads', express.static(uploadDirectory, {
  dotfiles: 'deny',
  index: false,
  maxAge: '1d',
}))

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
})

function requireUploadToken(request, response, next) {
  const expectedToken = process.env.PRODUCT_IMAGE_UPLOAD_TOKEN
  if (!expectedToken || Buffer.byteLength(expectedToken) < 32) {
    return response.status(503).json({ error: 'Configure PRODUCT_IMAGE_UPLOAD_TOKEN with at least 32 characters.' })
  }

  const authorization = request.get('authorization') || ''
  const providedToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  const expected = Buffer.from(expectedToken)
  const provided = Buffer.from(providedToken)
  const matches = expected.length === provided.length && timingSafeEqual(expected, provided)

  if (!matches) return response.status(401).json({ error: 'Invalid administration key.' })
  next()
}

function getImageType(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { extension: 'jpg' }
  }
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { extension: 'png' }
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { extension: 'webp' }
  }
  return null
}

let poolPromise

function getPool() {
  const { DB_SERVER, DB_DATABASE, DB_USER, DB_PASSWORD } = process.env
  if (!DB_SERVER || !DB_DATABASE || !DB_USER || !DB_PASSWORD) {
    throw new Error('Database configuration is incomplete. Set DB_SERVER, DB_DATABASE, DB_USER, and DB_PASSWORD.')
  }

  if (!poolPromise) {
    const pool = new sql.ConnectionPool({
      server: DB_SERVER,
      port: Number(process.env.DB_PORT || 1433),
      database: DB_DATABASE,
      user: DB_USER,
      password: DB_PASSWORD,
      options: {
        encrypt: process.env.DB_ENCRYPT !== 'false',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
      },
    })

    poolPromise = pool.connect().catch(error => {
      poolPromise = undefined
      throw error
    })
  }

  return poolPromise
}

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new HttpError(503, 'Configure SESSION_SECRET with at least 32 characters.')
  }
  return secret
}

function signSession(userId, expiresAt, secret) {
  const payload = `${userId}.${expiresAt}`
  const signature = createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

function getSessionUserId(request) {
  const secret = getSessionSecret()
  const cookies = request.headers.cookie?.split(';') ?? []
  const sessionCookie = cookies.map(cookie => cookie.trim()).find(cookie => cookie.startsWith(`${sessionCookieName}=`))
  if (!sessionCookie) return null

  let token
  try {
    token = decodeURIComponent(sessionCookie.slice(sessionCookieName.length + 1))
  } catch {
    return null
  }
  const [userIdText, expiresAtText, signature, ...rest] = token.split('.')
  if (rest.length || !/^\d+$/.test(userIdText) || !/^\d+$/.test(expiresAtText)) return null

  const userId = Number(userIdText)
  const expiresAt = Number(expiresAtText)
  if (!Number.isSafeInteger(userId) || userId <= 0 || expiresAt <= Date.now() / 1000) return null

  const expected = Buffer.from(signSession(userId, expiresAt, secret))
  const actual = Buffer.from(`${userIdText}.${expiresAtText}.${signature}`)
  return expected.length === actual.length && timingSafeEqual(expected, actual) ? userId : null
}

function setSessionCookie(response, userId) {
  const expiresAt = Math.floor(Date.now() / 1000) + sessionLifetimeSeconds
  const token = signSession(userId, expiresAt, getSessionSecret())
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  response.setHeader(
    'Set-Cookie',
    `${sessionCookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${sessionLifetimeSeconds}${secure}`,
  )
}

function clearSessionCookie(response) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  response.setHeader(
    'Set-Cookie',
    `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
  )
}

function requireAccount(request, response, next) {
  try {
    const userId = getSessionUserId(request)
    if (!userId) return response.status(401).json({ error: 'Inicia sesión para continuar.' })
    request.accountId = userId
    next()
  } catch (error) {
    next(error)
  }
}

function toAccount(user) {
  return {
    id: user.id_usuario,
    firstName: user.nombre_usuario,
    lastName: user.apellido_usuario,
    email: user.correo,
    phone: user.numero_Celular,
    address: user.direccion_envio,
  }
}

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.' },
})

function validateAccountDetails(body) {
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : ''
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
  const address = typeof body.address === 'string' ? body.address.trim() : ''

  if (!/^[\p{L}][\p{L} '\-]{0,99}$/u.test(firstName) || !/^[\p{L}][\p{L} '\-]{0,99}$/u.test(lastName)) {
    throw new HttpError(400, 'Ingresa un nombre y apellido válidos.')
  }
  if (email.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, 'Ingresa un correo válido.')
  }
  if (password.length < 12 || password.length > 200) {
    throw new HttpError(400, 'La contraseña debe tener entre 12 y 200 caracteres.')
  }
  if (!/^\d{8,20}$/.test(phone)) throw new HttpError(400, 'El teléfono debe tener entre 8 y 20 dígitos.')
  if (!address || address.length > 200) throw new HttpError(400, 'La dirección es obligatoria y debe tener máximo 200 caracteres.')

  return { firstName, lastName, email, password, phone, address }
}

async function hashPassword(password) {
  const salt = randomBytes(16)
  const key = await scryptAsync(password, salt, 64)
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`
}

async function verifyPassword(password, storedHash) {
  const [algorithm, saltHex, keyHex, ...rest] = (storedHash || '').split('$')
  if (algorithm !== 'scrypt' || rest.length || !/^[0-9a-f]{32}$/i.test(saltHex) || !/^[0-9a-f]{128}$/i.test(keyHex)) {
    return false
  }

  const expected = Buffer.from(keyHex, 'hex')
  const actual = await scryptAsync(password, Buffer.from(saltHex, 'hex'), expected.length)
  return timingSafeEqual(expected, actual)
}

async function withTransaction(action) {
  const transaction = new sql.Transaction(await getPool())
  await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE)
  try {
    const result = await action(transaction)
    await transaction.commit()
    return result
  } catch (error) {
    await transaction.rollback().catch(rollbackError => {
      console.error('Could not roll back a database transaction:', rollbackError)
    })
    throw error
  }
}

async function getActiveCartId(transaction, userId, createIfMissing = false) {
  const result = await new sql.Request(transaction)
    .input('userId', sql.Int, userId)
    .query(`
      SELECT TOP (1) id_carrito
      FROM carrito WITH (UPDLOCK, HOLDLOCK)
      WHERE id_usuario = @userId AND estado_pedido = N'ACTIVO'
      ORDER BY id_carrito DESC;
    `)
  if (result.recordset[0]) return result.recordset[0].id_carrito
  if (!createIfMissing) return null

  const created = await new sql.Request(transaction)
    .input('userId', sql.Int, userId)
    .query(`
      INSERT INTO carrito (fecha_creacion, id_usuario, estado_pedido)
      OUTPUT INSERTED.id_carrito
      VALUES (CONVERT(date, GETDATE()), @userId, N'ACTIVO');
    `)
  return created.recordset[0].id_carrito
}

async function readCart(userId) {
  const pool = await getPool()
  const result = await pool.request()
    .input('userId', sql.Int, userId)
    .query(`
      SELECT
        v.id_variante AS variantId,
        p.id_producto AS productId,
        p.nombre_producto AS name,
        p.color,
        p.ruta_imagen AS image,
        v.talla AS size,
        v.precioVenta AS price,
        dc.cantidad AS quantity,
        v.stock
      FROM carrito AS c
      INNER JOIN detalle_carrito AS dc ON dc.id_carrito = c.id_carrito
      INNER JOIN variante_producto AS v ON v.id_variante = dc.id_variante
      INNER JOIN producto AS p ON p.id_producto = v.id_producto
      WHERE c.id_usuario = @userId AND c.estado_pedido = N'ACTIVO'
      ORDER BY p.nombre_producto, v.talla;
    `)
  return result.recordset.map(line => ({
    variantId: line.variantId,
    productId: line.productId,
    name: line.name,
    color: line.color,
    img: line.image,
    size: line.size.trim(),
    price: Number(line.price),
    quantity: line.quantity,
    stock: line.stock,
  }))
}

app.post('/api/auth/register', authRateLimit, async (request, response, next) => {
  try {
    getSessionSecret()
    const details = validateAccountDetails(request.body ?? {})
    const passwordHash = await hashPassword(details.password)
    const pool = await getPool()
    const result = await pool.request()
      .input('firstName', sql.NVarChar(100), details.firstName)
      .input('lastName', sql.NVarChar(100), details.lastName)
      .input('email', sql.NVarChar(100), details.email)
      .input('passwordHash', sql.NVarChar(255), passwordHash)
      .input('phone', sql.NVarChar(20), details.phone)
      .input('address', sql.NVarChar(200), details.address)
      .query(`
        INSERT INTO usuario (
          nombre_usuario, apellido_usuario, correo, password_hash,
          numero_Celular, tipo_Usuario, direccion_envio
        )
        OUTPUT
          INSERTED.id_usuario, INSERTED.nombre_usuario, INSERTED.apellido_usuario,
          INSERTED.correo, INSERTED.numero_Celular, INSERTED.direccion_envio
        VALUES (
          @firstName, @lastName, @email, @passwordHash,
          @phone, 'C', @address
        );
      `)
    const account = toAccount(result.recordset[0])
    setSessionCookie(response, account.id)
    response.status(201).json({ account })
  } catch (error) {
    if (error.number === 2627 || error.number === 2601) {
      return response.status(409).json({ error: 'Ya existe una cuenta con ese correo o teléfono.' })
    }
    next(error)
  }
})

app.post('/api/auth/login', authRateLimit, async (request, response, next) => {
  try {
    getSessionSecret()
    const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : ''
    const password = typeof request.body?.password === 'string' ? request.body.password : ''
    if (!email || email.length > 100 || !password || password.length > 200) {
      throw new HttpError(400, 'Ingresa un correo y una contraseña válidos.')
    }

    const pool = await getPool()
    const result = await pool.request()
      .input('email', sql.NVarChar(100), email)
      .query(`
        SELECT id_usuario, nombre_usuario, apellido_usuario, correo,
          numero_Celular, direccion_envio, password_hash
        FROM usuario
        WHERE correo = @email AND tipo_Usuario = 'C';
      `)
    const user = result.recordset[0]
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      throw new HttpError(401, 'Correo o contraseña incorrectos.')
    }

    const account = toAccount(user)
    setSessionCookie(response, account.id)
    response.json({ account })
  } catch (error) {
    next(error)
  }
})

app.get('/api/auth/me', requireAccount, async (request, response, next) => {
  try {
    const pool = await getPool()
    const result = await pool.request()
      .input('userId', sql.Int, request.accountId)
      .query(`
        SELECT id_usuario, nombre_usuario, apellido_usuario, correo,
          numero_Celular, direccion_envio
        FROM usuario
        WHERE id_usuario = @userId AND tipo_Usuario = 'C';
      `)
    if (!result.recordset[0]) {
      clearSessionCookie(response)
      return response.status(401).json({ error: 'La cuenta ya no está disponible.' })
    }
    response.json({ account: toAccount(result.recordset[0]) })
  } catch (error) {
    next(error)
  }
})

app.post('/api/auth/logout', (_request, response) => {
  clearSessionCookie(response)
  response.status(204).end()
})

app.get('/api/products', async (_request, response, next) => {
  try {
    const pool = await getPool()
    const result = await pool.request().query(`
      SELECT
        p.id_producto AS id,
        p.nombre_producto AS name,
        p.descripcion AS description,
        p.color AS color,
        p.estilo AS category,
        p.ruta_imagen AS image,
        v.id_variante AS variantId,
        v.talla AS size,
        v.precioVenta AS price,
        v.stock
      FROM producto AS p
      INNER JOIN variante_producto AS v ON v.id_producto = p.id_producto
      WHERE v.stock > 0
      ORDER BY p.nombre_producto, v.talla;
    `)

    const products = new Map()
    for (const row of result.recordset) {
      if (!products.has(row.id)) {
        products.set(row.id, {
          id: row.id,
          name: row.name,
          category: row.category,
          color: row.color,
          tag: null,
          img: row.image,
          desc: row.description,
          variants: [],
        })
      }
      products.get(row.id).variants.push({
        id: row.variantId,
        size: row.size.trim(),
        price: Number(row.price),
        stock: row.stock,
      })
    }
    response.json([...products.values()])
  } catch (error) {
    next(error)
  }
})

app.get('/api/cart', requireAccount, async (request, response, next) => {
  try {
    response.json({ items: await readCart(request.accountId) })
  } catch (error) {
    next(error)
  }
})

app.post('/api/cart/items', requireAccount, async (request, response, next) => {
  try {
    const variantId = Number(request.body?.variantId)
    const quantity = Number(request.body?.quantity ?? 1)
    if (!Number.isSafeInteger(variantId) || variantId <= 0 ||
      !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) {
      throw new HttpError(400, 'Selecciona una variante y una cantidad válida.')
    }

    await withTransaction(async transaction => {
      const cartId = await getActiveCartId(transaction, request.accountId, true)
      const variant = await new sql.Request(transaction)
        .input('variantId', sql.Int, variantId)
        .query(`
          SELECT stock
          FROM variante_producto WITH (UPDLOCK, HOLDLOCK)
          WHERE id_variante = @variantId;
        `)
      if (!variant.recordset[0]) throw new HttpError(404, 'La variante seleccionada ya no existe.')

      const existing = await new sql.Request(transaction)
        .input('cartId', sql.Int, cartId)
        .input('variantId', sql.Int, variantId)
        .query(`
          SELECT cantidad
          FROM detalle_carrito WITH (UPDLOCK, HOLDLOCK)
          WHERE id_carrito = @cartId AND id_variante = @variantId;
        `)
      const nextQuantity = (existing.recordset[0]?.cantidad ?? 0) + quantity
      if (nextQuantity > variant.recordset[0].stock) {
        throw new HttpError(409, 'No hay suficiente inventario para esa cantidad.')
      }

      const itemRequest = new sql.Request(transaction)
        .input('cartId', sql.Int, cartId)
        .input('variantId', sql.Int, variantId)
        .input('quantity', sql.Int, nextQuantity)
      if (existing.recordset[0]) {
        await itemRequest.query(`
          UPDATE detalle_carrito SET cantidad = @quantity
          WHERE id_carrito = @cartId AND id_variante = @variantId;
        `)
      } else {
        await itemRequest.query(`
          INSERT INTO detalle_carrito (id_carrito, id_variante, cantidad)
          VALUES (@cartId, @variantId, @quantity);
        `)
      }
    })

    response.json({ items: await readCart(request.accountId) })
  } catch (error) {
    next(error)
  }
})

app.put('/api/cart/items/:variantId', requireAccount, async (request, response, next) => {
  try {
    const variantId = Number(request.params.variantId)
    const quantity = Number(request.body?.quantity)
    if (!Number.isSafeInteger(variantId) || variantId <= 0 ||
      !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) {
      throw new HttpError(400, 'Selecciona una cantidad válida.')
    }

    await withTransaction(async transaction => {
      const cartId = await getActiveCartId(transaction, request.accountId)
      if (!cartId) throw new HttpError(404, 'El producto ya no está en tu carrito.')

      const result = await new sql.Request(transaction)
        .input('cartId', sql.Int, cartId)
        .input('variantId', sql.Int, variantId)
        .input('quantity', sql.Int, quantity)
        .query(`
          UPDATE detail
          SET cantidad = @quantity
          FROM detalle_carrito AS detail
          INNER JOIN variante_producto AS v WITH (UPDLOCK, HOLDLOCK)
            ON v.id_variante = detail.id_variante
          WHERE detail.id_carrito = @cartId
            AND detail.id_variante = @variantId
            AND v.stock >= @quantity;
          SELECT @@ROWCOUNT AS affected;
        `)
      if (result.recordset[0]?.affected !== 1) {
        throw new HttpError(409, 'La cantidad supera el inventario disponible.')
      }
    })

    response.json({ items: await readCart(request.accountId) })
  } catch (error) {
    next(error)
  }
})

app.delete('/api/cart/items/:variantId', requireAccount, async (request, response, next) => {
  try {
    const variantId = Number(request.params.variantId)
    if (!Number.isSafeInteger(variantId) || variantId <= 0) {
      throw new HttpError(400, 'La variante no es válida.')
    }

    await withTransaction(async transaction => {
      const cartId = await getActiveCartId(transaction, request.accountId)
      if (!cartId) return

      await new sql.Request(transaction)
        .input('cartId', sql.Int, cartId)
        .input('variantId', sql.Int, variantId)
        .query(`
          DELETE FROM detalle_carrito
          WHERE id_carrito = @cartId AND id_variante = @variantId;
        `)
    })
    response.json({ items: await readCart(request.accountId) })
  } catch (error) {
    next(error)
  }
})

app.post('/api/checkout', requireAccount, async (request, response, next) => {
  try {
    const address = typeof request.body?.address === 'string' ? request.body.address.trim() : ''
    const phone = typeof request.body?.phone === 'string' ? request.body.phone.trim() : ''
    if (!address || address.length > 200) {
      throw new HttpError(400, 'Ingresa una dirección de entrega de máximo 200 caracteres.')
    }
    if (!/^\d{8,20}$/.test(phone)) throw new HttpError(400, 'Ingresa un teléfono válido de 8 a 20 dígitos.')

    const order = await withTransaction(async transaction => {
      const cartId = await getActiveCartId(transaction, request.accountId)
      if (!cartId) throw new HttpError(400, 'Tu carrito está vacío.')

      const lines = await new sql.Request(transaction)
        .input('cartId', sql.Int, cartId)
        .query(`
          SELECT
            detail.id_variante AS variantId,
            detail.cantidad AS quantity,
            variant.precioVenta AS price,
            variant.stock
          FROM detalle_carrito AS detail
          INNER JOIN variante_producto AS variant WITH (UPDLOCK, HOLDLOCK)
            ON variant.id_variante = detail.id_variante
          WHERE detail.id_carrito = @cartId
          ORDER BY detail.id_variante;
        `)
      if (lines.recordset.length === 0) throw new HttpError(400, 'Tu carrito está vacío.')

      for (const line of lines.recordset) {
        if (line.quantity > line.stock) {
          throw new HttpError(409, 'El inventario cambió. Actualiza el carrito antes de confirmar.')
        }
      }

      await new sql.Request(transaction)
        .input('userId', sql.Int, request.accountId)
        .input('address', sql.NVarChar(200), address)
        .input('phone', sql.NVarChar(20), phone)
        .query(`
          UPDATE usuario
          SET direccion_envio = @address, numero_Celular = @phone
          WHERE id_usuario = @userId;
        `)

      const reference = randomUUID().replace(/-/g, '').slice(0, 20).toUpperCase()
      const finalizedCart = await new sql.Request(transaction)
        .input('cartId', sql.Int, cartId)
        .input('reference', sql.NVarChar(50), reference)
        .input('address', sql.NVarChar(200), address)
        .query(`
          UPDATE carrito
          SET estado_pedido = N'PENDIENTE_EFECTIVO',
              numero_referencia = @reference,
              direccion_entrega = @address
          WHERE id_carrito = @cartId AND estado_pedido = N'ACTIVO';
          SELECT @@ROWCOUNT AS affected;
        `)
      if (finalizedCart.recordset[0]?.affected !== 1) {
        throw new HttpError(409, 'El carrito ya fue procesado. Actualiza la página.')
      }

      const total = lines.recordset.reduce((sum, line) => sum + Number(line.price) * line.quantity, 0)
      const createdAt = new Date()
      for (const [index, line] of lines.recordset.entries()) {
        const lineTotal = Math.round(Number(line.price) * line.quantity * 100) / 100
        const updatedStock = await new sql.Request(transaction)
          .input('variantId', sql.Int, line.variantId)
          .input('quantity', sql.Int, line.quantity)
          .query(`
            UPDATE variante_producto
            SET stock = stock - @quantity
            WHERE id_variante = @variantId AND stock >= @quantity;
            SELECT @@ROWCOUNT AS affected;
          `)
        if (updatedStock.recordset[0]?.affected !== 1) {
          throw new HttpError(409, 'El inventario cambió. Actualiza el carrito antes de confirmar.')
        }

        await new sql.Request(transaction)
          .input('cartId', sql.Int, cartId)
          .input('variantId', sql.Int, line.variantId)
          .input('createdAt', sql.DateTime2, createdAt)
          .input('lineTotal', sql.Decimal(10, 2), lineTotal)
          .input('reference', sql.NVarChar(50), `${reference}-${index + 1}`)
          .input('price', sql.Decimal(10, 2), Number(line.price))
          .input('quantity', sql.Int, line.quantity)
          .query(`
            INSERT INTO factura (
              id_carrito, id_variante, fecha_factura, total_pago, metodo_pago,
              tipo_envio, numero_referencia, precio_unitario, descuento, cantidad
            )
            VALUES (
              @cartId, @variantId, @createdAt, @lineTotal, N'Efectivo contra entrega',
              N'Domicilio', @reference, @price, 0, @quantity
            );
          `)
      }

      return { reference, total: Math.round(total * 100) / 100 }
    })

    response.status(201).json({
      ...order,
      paymentMethod: 'Efectivo contra entrega',
      status: 'PENDIENTE_EFECTIVO',
    })
  } catch (error) {
    next(error)
  }
})

app.get('/api/orders/:reference', requireAccount, async (request, response, next) => {
  try {
    const reference = request.params.reference.toUpperCase()
    if (!/^[A-F0-9]{20}$/.test(reference)) {
      throw new HttpError(400, 'La referencia del pedido no es válida.')
    }

    const pool = await getPool()
    const result = await pool.request()
      .input('userId', sql.Int, request.accountId)
      .input('reference', sql.NVarChar(50), reference)
      .query(`
        SELECT
          orderCart.numero_referencia AS reference,
          orderCart.estado_pedido AS status,
          customer.nombre_usuario AS firstName,
          customer.apellido_usuario AS lastName,
          customer.correo AS email,
          customer.numero_Celular AS phone,
          orderCart.direccion_entrega AS address,
          invoice.fecha_factura AS createdAt,
          product.nombre_producto AS name,
          product.color,
          variant.talla AS size,
          invoice.cantidad AS quantity,
          invoice.precio_unitario AS unitPrice,
          invoice.total_pago AS lineTotal
        FROM carrito AS orderCart
        INNER JOIN usuario AS customer ON customer.id_usuario = orderCart.id_usuario
        INNER JOIN factura AS invoice ON invoice.id_carrito = orderCart.id_carrito
        INNER JOIN variante_producto AS variant ON variant.id_variante = invoice.id_variante
        INNER JOIN producto AS product ON product.id_producto = variant.id_producto
        WHERE orderCart.id_usuario = @userId
          AND orderCart.numero_referencia = @reference
        ORDER BY invoice.numero_factura;
      `)

    if (result.recordset.length === 0) throw new HttpError(404, 'No se encontró el comprobante.')

    const firstLine = result.recordset[0]
    const lines = result.recordset.map(line => ({
      name: line.name,
      color: line.color,
      size: line.size.trim(),
      quantity: line.quantity,
      unitPrice: Number(line.unitPrice),
      total: Number(line.lineTotal),
    }))
    const subtotal = lines.reduce((sum, line) => sum + line.total, 0)

    response.json({
      reference: firstLine.reference,
      status: firstLine.status,
      createdAt: firstLine.createdAt.toISOString(),
      customer: {
        name: `${firstLine.firstName} ${firstLine.lastName}`,
        email: firstLine.email,
        phone: firstLine.phone,
        address: firstLine.address,
      },
      lines,
      subtotal: Math.round(subtotal * 100) / 100,
    })
  } catch (error) {
    next(error)
  }
})

app.get('/api/admin/products', requireUploadToken, async (_request, response, next) => {
  try {
    const pool = await getPool()
    const result = await pool.request().query(`
      SELECT
        id_producto AS id,
        nombre_producto AS name,
        color,
        estilo AS category,
        ruta_imagen AS image
      FROM producto
      ORDER BY nombre_producto;
    `)

    response.json(result.recordset.map(product => ({
      id: product.id,
      name: product.name,
      color: product.color,
      category: product.category,
      img: product.image,
    })))
  } catch (error) {
    next(error)
  }
})

app.put('/api/admin/products/:id/image', requireUploadToken, (request, response, next) => {
  imageUpload.single('image')(request, response, error => {
    if (error) return next(error)

    void (async () => {
      const productId = Number(request.params.id)
      if (!Number.isSafeInteger(productId) || productId <= 0) {
        throw new HttpError(400, 'Product ID must be a positive integer.')
      }
      if (!request.file) throw new HttpError(400, 'Choose an image to upload.')

      const imageType = getImageType(request.file.buffer)
      if (!imageType) {
        throw new HttpError(400, 'Use a valid JPG, PNG, or WebP image.')
      }

      const filename = `${randomUUID()}.${imageType.extension}`
      const imagePath = `/uploads/${filename}`
      const filePath = path.join(uploadDirectory, filename)
      await writeFile(filePath, request.file.buffer, { flag: 'wx' })

      try {
        const pool = await getPool()
        const result = await pool.request()
          .input('id', sql.Int, productId)
          .input('imagePath', sql.NVarChar(255), imagePath)
          .query(`
            UPDATE producto
            SET ruta_imagen = @imagePath
            WHERE id_producto = @id;
            SELECT @@ROWCOUNT AS affected;
          `)

        if (result.recordset[0]?.affected !== 1) {
          throw new HttpError(404, 'Product not found.')
        }

        response.json({ id: productId, imagePath })
      } catch (databaseError) {
        await unlink(filePath).catch(cleanupError => {
          console.error('Could not remove an image after its database update failed:', cleanupError)
        })
        throw databaseError
      }
    })().catch(next)
  })
})

app.use((error, _request, response, _next) => {
  console.error('API request failed:', error)
  const status = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE'
    ? 413
    : error.status || (error instanceof multer.MulterError ? 400 : 500)
  const message = status === 500
    ? 'The product service could not complete the request.'
    : error.message
  response.status(status).json({ error: message })
})

app.listen(port, () => {
  console.log(`Product API listening on port ${port}`)
})
