import 'dotenv/config'
import cors from 'cors'
import { randomUUID, timingSafeEqual } from 'node:crypto'
import express from 'express'
import { mkdirSync } from 'node:fs'
import { unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import multer from 'multer'
import sql from 'mssql'

const app = express()
const port = Number(process.env.API_PORT || 3001)
const uploadDirectory = path.resolve(process.env.PRODUCT_IMAGE_DIRECTORY || 'uploads')
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()).filter(Boolean)
  : false

mkdirSync(uploadDirectory, { recursive: true })
app.use(cors({ origin: allowedOrigins }))
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
        available.price AS price
      FROM producto AS p
      CROSS APPLY (
        SELECT MIN(v.precioVenta) AS price
        FROM variante_producto AS v
        WHERE v.id_producto = p.id_producto
          AND v.stock > 0
      ) AS available
      WHERE available.price IS NOT NULL
      ORDER BY p.nombre_producto;
    `)

    response.json(result.recordset.map(product => ({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      category: product.category,
      color: product.color,
      tag: null,
      img: product.image,
      desc: product.description,
    })))
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
