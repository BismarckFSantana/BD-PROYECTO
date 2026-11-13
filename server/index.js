import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import sql from 'mssql'

const app = express()
const port = Number(process.env.API_PORT || 3001)
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()).filter(Boolean)
  : false

app.use(cors({ origin: allowedOrigins }))

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

app.use((error, _request, response, _next) => {
  console.error('API request failed:', error)
  response.status(500).json({ error: 'The product service could not complete the request.' })
})

app.listen(port, () => {
  console.log(`Product API listening on port ${port}`)
})
