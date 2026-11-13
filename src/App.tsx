import { useState, useEffect, useRef } from 'react'

const STARS = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  top: Math.random() * 100,
  left: Math.random() * 100,
  size: Math.random() * 2 + 0.5,
  dur: (Math.random() * 4 + 2).toFixed(1),
  delay: (Math.random() * 4).toFixed(1),
  minOp: (Math.random() * 0.3 + 0.1).toFixed(2),
}))

type ProductVariant = {
  id: number
  size: string
  price: number
  stock: number
}

type Product = {
  id: number
  name: string
  variants: ProductVariant[]
  category: string
  color: string
  tag: string | null
  img: string
  desc: string
}

type CartLine = {
  variantId: number
  productId: number
  name: string
  color: string
  img: string
  size: string
  price: number
  quantity: number
  stock: number
}

type Account = {
  id: number
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
}

type AccountForm = {
  firstName?: string
  lastName?: string
  email: string
  password: string
  phone?: string
  address?: string
}

type OrderConfirmation = {
  reference: string
  total: number
}

type Invoice = {
  reference: string
  status: string
  createdAt: string
  customer: {
    name: string
    email: string
    phone: string
    address: string
  }
  lines: Array<{
    name: string
    color: string
    size: string
    quantity: number
    unitPrice: number
    total: number
  }>
  subtotal: number
}

type AdminProduct = {
  id: number
  name: string
  color: string
  category: string
  img: string
}

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? ''
const NAV_LINKS = [
  { label: 'Colección', href: '#coleccion' },
  { label: 'Nueva Temporada', href: '#nueva-temporada' },
  { label: 'Lookbook', href: '#lookbook' },
  { label: 'Sobre Nosotros', href: '#sobre-nosotros' },
]

function getImageUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path
  return `${API_URL}${path.startsWith('/') ? path : `/${path}`}`
}

function isProduct(value: unknown): value is Product {
  if (typeof value !== 'object' || value === null) return false
  const product = value as Record<string, unknown>
  return (
    typeof product.id === 'number' &&
    typeof product.name === 'string' &&
    Array.isArray(product.variants) &&
    product.variants.every(variant =>
      typeof variant === 'object' &&
      variant !== null &&
      typeof variant.id === 'number' &&
      typeof variant.size === 'string' &&
      typeof variant.price === 'number' &&
      typeof variant.stock === 'number',
    ) &&
    typeof product.category === 'string' &&
    typeof product.color === 'string' &&
    (typeof product.tag === 'string' || product.tag === null) &&
    typeof product.img === 'string' &&
    typeof product.desc === 'string'
  )
}

function isAccount(value: unknown): value is Account {
  if (typeof value !== 'object' || value === null) return false
  const account = value as Record<string, unknown>
  return (
    typeof account.id === 'number' &&
    typeof account.firstName === 'string' &&
    typeof account.lastName === 'string' &&
    typeof account.email === 'string' &&
    typeof account.phone === 'string' &&
    typeof account.address === 'string'
  )
}

function isCartLine(value: unknown): value is CartLine {
  if (typeof value !== 'object' || value === null) return false
  const line = value as Record<string, unknown>
  return (
    typeof line.variantId === 'number' &&
    typeof line.productId === 'number' &&
    typeof line.name === 'string' &&
    typeof line.color === 'string' &&
    typeof line.img === 'string' &&
    typeof line.size === 'string' &&
    typeof line.price === 'number' &&
    typeof line.quantity === 'number' &&
    typeof line.stock === 'number'
  )
}

function isInvoice(value: unknown): value is Invoice {
  if (typeof value !== 'object' || value === null) return false
  const invoice = value as Record<string, unknown>
  if (
    typeof invoice.reference !== 'string' ||
    typeof invoice.status !== 'string' ||
    typeof invoice.createdAt !== 'string' ||
    typeof invoice.subtotal !== 'number' ||
    typeof invoice.customer !== 'object' ||
    invoice.customer === null ||
    !Array.isArray(invoice.lines)
  ) return false

  const customer = invoice.customer as Record<string, unknown>
  return (
    typeof customer.name === 'string' &&
    typeof customer.email === 'string' &&
    typeof customer.phone === 'string' &&
    typeof customer.address === 'string' &&
    invoice.lines.every(line => {
      if (typeof line !== 'object' || line === null) return false
      const item = line as Record<string, unknown>
      return typeof item.name === 'string' &&
        typeof item.color === 'string' &&
        typeof item.size === 'string' &&
        typeof item.quantity === 'number' &&
        typeof item.unitPrice === 'number' &&
        typeof item.total === 'number'
    })
  )
}

function isAdminProduct(value: unknown): value is AdminProduct {
  if (typeof value !== 'object' || value === null) return false
  const product = value as Record<string, unknown>
  return (
    typeof product.id === 'number' &&
    typeof product.name === 'string' &&
    typeof product.color === 'string' &&
    typeof product.category === 'string' &&
    typeof product.img === 'string'
  )
}

async function getApiError(response: Response) {
  try {
    const body: unknown = await response.json()
    if (typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string') {
      return body.error
    }
  } catch {
    // Use the HTTP status when the server does not return a JSON error.
  }
  return `La solicitud falló (HTTP ${response.status}).`
}

function formatCOP(n: number) {
  return '$' + n.toLocaleString('es-CO')
}

function apiRequest(path: string, init?: RequestInit) {
  return fetch(`${API_URL}${path}`, { ...init, credentials: 'include' })
}

async function parseCartResponse(response: Response) {
  const data: unknown = await response.json()
  if (
    typeof data !== 'object' ||
    data === null ||
    !('items' in data) ||
    !Array.isArray(data.items) ||
    !data.items.every(isCartLine)
  ) {
    throw new Error('La respuesta del carrito tiene un formato inválido.')
  }
  return data.items
}

function StarField() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {STARS.map(s => (
        <div
          key={s.id}
          className="star"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            '--dur': `${s.dur}s`,
            '--delay': `${s.delay}s`,
            '--min-op': s.minOp,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

function MoonSVG({ size = 200 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="moon-glow float-anim"
    >
      <defs>
        <radialGradient id="moonGrad" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#faf7f2" />
          <stop offset="60%" stopColor="#e8d88a" />
          <stop offset="100%" stopColor="#c9a82e" />
        </radialGradient>
        <radialGradient id="craterGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#c9a82e30" />
          <stop offset="100%" stopColor="#0a0a0f20" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="90" fill="url(#moonGrad)" opacity="0.95" />
      <circle cx="70" cy="75" r="12" fill="url(#craterGrad)" />
      <circle cx="130" cy="110" r="8" fill="url(#craterGrad)" />
      <circle cx="90" cy="130" r="5" fill="url(#craterGrad)" />
      <circle cx="120" cy="65" r="6" fill="url(#craterGrad)" />
      <circle cx="100" cy="100" r="90" fill="url(#moonGrad)" opacity="0" />
    </svg>
  )
}

function Navbar({ cartCount, onCartClick }: { cartCount: number; onCartClick: () => void }) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        background: scrolled ? 'rgba(6,13,26,0.97)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(74,122,181,0.2)' : '1px solid transparent',
      }}
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8 flex items-center justify-between h-16 md:h-20">
        <div className="font-display text-xl md:text-2xl tracking-widest text-[#f5f0e8] select-none">
          <span className="gold-shimmer">LUNA</span>
          <span className="text-[#f5f0e8] opacity-60 ml-1 text-sm font-normal tracking-[0.3em] align-middle">FASHION</span>
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-10">
          {NAV_LINKS.map(item => (
            <a
              key={item.href}
              href={item.href}
              className="text-xs tracking-[0.15em] uppercase text-[#f5f0e8] opacity-70 hover:opacity-100 hover:text-[#e8c84a] transition-all duration-200"
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onCartClick}
            className="relative p-2 text-[#f5f0e8] opacity-80 hover:opacity-100 hover:text-[#e8c84a] transition-all"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#e8c84a] text-[#0a0a0f] text-[9px] font-bold flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>

          {/* Mobile menu */}
          <button
            className="md:hidden p-2 text-[#f5f0e8] opacity-80"
            onClick={() => setMenuOpen(o => !o)}
          >
            {menuOpen ? (
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu drawer */}
      {menuOpen && (
        <div
          className="md:hidden border-t"
          style={{ background: 'rgba(6,13,26,0.99)', borderColor: 'rgba(74,122,181,0.2)' }}
        >
          <div className="px-5 py-6 flex flex-col gap-5">
            {NAV_LINKS.map(item => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="text-sm tracking-[0.15em] uppercase text-[#f5f0e8] opacity-70"
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}

function Hero() {
  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'radial-gradient(ellipse 90% 70% at 50% 0%, #1b3358 0%, #0d1b2e 35%, #060d1a 70%)' }}
    >
      <StarField />

      {/* Background image with dark overlay */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1683967195779-419a2e27ce07?w=1400&h=900&fit=crop&auto=format"
          alt="Mujer con vestido frente a la luna"
          className="w-full h-full object-cover opacity-20"
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(6,13,26,0.2) 0%, rgba(13,27,46,0.6) 50%, rgba(6,13,26,0.95) 90%, #060d1a 100%)' }}
        />
      </div>

      {/* Moon */}
      <div className="absolute top-16 right-8 md:top-24 md:right-24 opacity-80">
        <MoonSVG size={120} />
      </div>

      <div className="relative z-10 text-center px-5 max-w-4xl mx-auto">
        <p className="text-[#e8c84a] text-xs tracking-[0.5em] uppercase mb-6 opacity-80">
          Nueva Colección · Otoño 2026
        </p>
        <h1 className="font-display text-5xl md:text-7xl lg:text-8xl leading-none mb-6 text-[#f5f0e8]">
          Viste la
          <br />
          <em className="gold-shimmer not-italic">Oscuridad</em>
        </h1>
        <p className="text-[#f5f0e8] opacity-60 text-base md:text-lg font-light tracking-wide max-w-md mx-auto mb-10 leading-relaxed">
          Diseños inspirados en la luna y la noche. Cada pieza captura la elegancia del cielo nocturno.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a className="btn-gold" href="#coleccion">Explorar Colección</a>
          <a className="btn-outline" href="#lookbook">Ver Lookbook</a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40">
        <span className="text-[#f5f0e8] text-[10px] tracking-[0.3em] uppercase">Descubrir</span>
        <div
          className="w-px h-12"
          style={{ background: 'linear-gradient(to bottom, #e8c84a, transparent)' }}
        />
      </div>
    </section>
  )
}

function FeaturedBanner() {
  return (
    <section
      id="nueva-temporada"
      className="py-16 md:py-24 px-5 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0d1b2e 0%, #112240 50%, #0d1b2e 100%)' }}
    >
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, #4a7ab5 0px, #4a7ab5 1px, transparent 1px, transparent 60px), repeating-linear-gradient(90deg, #4a7ab5 0px, #4a7ab5 1px, transparent 1px, transparent 60px)',
        }}
      />
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-[#e8c84a] text-xs tracking-[0.4em] uppercase mb-4">Editorial</p>
          <h2 className="font-display text-4xl md:text-5xl text-[#f5f0e8] leading-tight mb-6">
            Elegancia para<br />
            <em className="text-[#e8c84a]">cada ocasión</em>
          </h2>
          <p className="text-[#f5f0e8] opacity-50 leading-relaxed mb-8 max-w-md">
            Cada diseño de Luna Fashion celebra la elegancia y la confianza en cada ocasión.
            Telas seleccionadas a mano. Cortes que acompañan cada movimiento.
          </p>
          <div className="flex gap-8 mb-8">
            {[['+200', 'Diseños únicos'], ['98%', 'Satisfacción'], ['48h', 'Envío express']].map(([num, label]) => (
              <div key={label}>
                <div className="font-display text-2xl text-[#e8c84a]">{num}</div>
                <div className="text-[10px] tracking-[0.2em] uppercase text-[#f5f0e8] opacity-40 mt-1">{label}</div>
              </div>
            ))}
          </div>
          <a className="btn-gold inline-block" href="#sobre-nosotros">Nuestra Historia</a>
        </div>
        <div className="relative">
          <div
            className="absolute -inset-4 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #2a4a72 0%, transparent 70%)' }}
          />
          <img
            src="https://images.unsplash.com/photo-1755676433268-63fcc44e190f?w=700&h=900&fit=crop&auto=format"
            alt="Modelo con proyección de luna creciente"
            className="w-full object-cover relative z-10"
            style={{ maxHeight: '520px', filter: 'contrast(1.1) brightness(0.9)' }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 h-32 z-20"
            style={{ background: 'linear-gradient(to top, #0d1b2e, transparent)' }}
          />
        </div>
      </div>
    </section>
  )
}

function ProductCard({
  product,
  onAdd,
}: {
  product: Product
  onAdd: (variantId: number) => void
}) {
  const [added, setAdded] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? 0)
  const selectedVariant = product.variants.find(variant => variant.id === variantId)

  const handleAdd = () => {
    if (!selectedVariant) return
    onAdd(selectedVariant.id)
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  return (
    <div className="card-hover group cursor-pointer">
      <div
        className="relative overflow-hidden mb-4"
        style={{ background: '#0d1b2e', aspectRatio: '3/4' }}
      >
        {!imgLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-8 h-8 rounded-full border-t border-[#e8c84a] animate-spin"
              style={{ borderTopColor: '#e8c84a', borderWidth: '1px' }}
            />
          </div>
        )}
        <img
          src={getImageUrl(product.img)}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          style={{ opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.4s' }}
          onLoad={() => setImgLoaded(true)}
        />
        {product.tag && (
          <div className="absolute top-3 left-3">
            <span className="bg-[#e8c84a] px-2 py-1 text-[9px] font-medium uppercase tracking-[0.2em] text-[#0a0a0f]">
              {product.tag}
            </span>
          </div>
        )}
      </div>
      <div>
        <div className="flex items-start justify-between">
          <div>
            <p
              className="text-[9px] tracking-[0.25em] uppercase mb-1"
              style={{ color: '#e8c84a', opacity: 0.7 }}
            >
              {product.color} · {product.category}
            </p>
            <h3 className="font-display text-lg text-[#f5f0e8] leading-tight">{product.name}</h3>
          </div>
          <p className="font-display text-[#e8c84a] text-base mt-1">
            {formatCOP(selectedVariant?.price ?? 0)}
          </p>
        </div>
        <p className="text-[#f5f0e8] opacity-40 text-xs leading-relaxed mt-2">{product.desc}</p>
        <div className="mt-4 flex gap-2">
          <label className="min-w-0 flex-1 text-[10px] uppercase tracking-wider text-[#f5f0e8]/60">
            Talla
            <select
              value={variantId}
              onChange={event => setVariantId(Number(event.target.value))}
              className="mt-1 block w-full border border-[#4a7ab5]/30 bg-[#0d1b2e] px-2 py-2 text-sm text-[#f5f0e8]"
            >
              {product.variants.map(variant => (
                <option key={variant.id} value={variant.id}>
                  {variant.size} · {variant.stock} disponibles
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!selectedVariant}
          className={`mt-3 w-full border px-3 py-3 text-xs font-medium uppercase tracking-widest transition-colors ${
            added
              ? 'border-[#e8c84a] bg-[#e8c84a] text-[#0a0a0f]'
              : 'border-[#e8c84a]/50 bg-[#0d1b2e] text-[#f5f0e8] hover:bg-[#e8c84a] hover:text-[#0a0a0f]'
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {added ? 'Agregado al carrito' : 'Agregar al carrito'}
        </button>
      </div>
    </div>
  )
}

function Collection({
  products,
  loading,
  error,
  onRetry,
  onAdd,
}: {
  products: Product[]
  loading: boolean
  error: string | null
  onRetry: () => void
  onAdd: (variantId: number) => void
}) {
  const [active, setActive] = useState('Todos')

  const categories = ['Todos', ...new Set(products.map(product => product.category).filter(Boolean))]
  const selectedCategory = categories.includes(active) ? active : 'Todos'
  const filtered =
    selectedCategory === 'Todos'
      ? products
      : products.filter(product => product.category === selectedCategory)

  return (
    <section className="py-16 md:py-24 px-5" style={{ background: 'linear-gradient(180deg, #060d1a 0%, #0a1628 50%, #060d1a 100%)' }} id="coleccion">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-[#e8c84a] text-xs tracking-[0.4em] uppercase mb-3 opacity-70">
            Colección 2026
          </p>
          <h2 className="font-display text-4xl md:text-5xl text-[#f5f0e8] mb-4">Nuestros Diseños</h2>
          <div className="section-divider mb-8" />
          <div className="flex justify-center gap-2 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActive(cat)}
                style={{
                  padding: '0.5rem 1.5rem',
                  fontSize: '0.7rem',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  fontFamily: 'Outfit, sans-serif',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: '1px solid',
                  borderColor: selectedCategory === cat ? '#e8c84a' : 'rgba(232,200,74,0.2)',
                  background: selectedCategory === cat ? '#e8c84a' : 'transparent',
                  color: selectedCategory === cat ? '#0a0a0f' : '#e8c84a',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-center text-[#f5f0e8] opacity-60">Cargando productos...</p>
        ) : error ? (
          <div className="text-center text-[#f5f0e8]">
            <p className="mb-4">{error}</p>
            <button className="btn-gold px-6 py-2" onClick={onRetry}>Reintentar</button>
          </div>
        ) : products.length === 0 ? (
          <p className="text-center text-[#f5f0e8] opacity-60">No hay productos disponibles.</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-[#f5f0e8] opacity-60">
            No hay productos disponibles en esta colección.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-8">
            {filtered.map(product => (
              <ProductCard key={product.id} product={product} onAdd={onAdd} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function MoonPhases() {
  const phases = [
    { name: 'Luna Nueva', icon: '🌑', desc: 'Negro absoluto. Poder en la oscuridad.' },
    { name: 'Cuarto Creciente', icon: '🌓', desc: 'Contraste. Negro y blanco en equilibrio.' },
    { name: 'Luna Llena', icon: '🌕', desc: 'Blanco luminoso. Plenitud radiante.' },
    { name: 'Cuarto Menguante', icon: '🌗', desc: 'Dorado. La luna al despedirse.' },
  ]
  return (
    <section
      className="py-16 md:py-20 px-5 relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #060d1a 0%, #112240 50%, #060d1a 100%)' }}
    >
      <StarField />
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl text-[#f5f0e8] mb-2">
            Inspiradas en las <em className="text-[#e8c84a]">Fases Lunares</em>
          </h2>
          <div className="section-divider mt-6" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {phases.map(ph => (
            <div
              key={ph.name}
              className="text-center p-6 transition-all duration-300 cursor-default"
              style={{ border: '1px solid rgba(74,122,181,0.15)', background: 'rgba(13,27,46,0.4)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(74,122,181,0.4)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(74,122,181,0.15)')}
            >
              <div className="text-4xl mb-4">{ph.icon}</div>
              <h3 className="font-display text-sm text-[#e8c84a] mb-2">{ph.name}</h3>
              <p className="text-[#f5f0e8] opacity-40 text-xs leading-relaxed">{ph.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Lookbook() {
  const looks = [
    {
      image: 'https://images.unsplash.com/photo-1683967195779-419a2e27ce07?w=900&h=1200&fit=crop&auto=format',
      alt: 'Editorial de moda Luna Fashion con vestido de noche',
      caption: 'Luz de luna',
    },
    {
      image: 'https://images.unsplash.com/photo-1755676433268-63fcc44e190f?w=900&h=1200&fit=crop&auto=format',
      alt: 'Diseño elegante de la colección Luna Fashion',
      caption: 'Elegancia en movimiento',
    },
    {
      image: 'https://images.unsplash.com/photo-1688597168941-cc8ec4839069?w=900&h=1200&fit=crop&auto=format',
      alt: 'Vestido claro de la colección Luna Fashion',
      caption: 'Esencia lunar',
    },
  ]

  return (
    <section id="lookbook" className="scroll-mt-24 bg-[#060d1a] px-5 py-16 md:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <p className="mb-3 text-xs uppercase tracking-[0.4em] text-[#e8c84a] opacity-70">Luna Fashion · Editorial</p>
          <h2 className="font-display text-4xl text-[#f5f0e8] md:text-5xl">Lookbook</h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-[#f5f0e8]/50">
            Una mirada a los detalles, siluetas y texturas que inspiran nuestra colección.
          </p>
          <div className="section-divider mt-8" />
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {looks.map((look, index) => (
            <figure key={look.caption} className={index === 1 ? 'md:mt-12' : ''}>
              <img src={look.image} alt={look.alt} className="aspect-[3/4] w-full object-cover" loading="lazy" />
              <figcaption className="mt-4 font-display text-lg text-[#e8c84a]">{look.caption}</figcaption>
            </figure>
          ))}
        </div>
        <div className="mt-12 text-center">
          <a href="#coleccion" className="btn-outline inline-block">Descubrir colección</a>
        </div>
      </div>
    </section>
  )
}

function About() {
  return (
    <section
      id="sobre-nosotros"
      className="scroll-mt-24 px-5 py-16 md:py-24"
      style={{ background: 'linear-gradient(135deg, #0d1b2e 0%, #112240 50%, #0d1b2e 100%)' }}
    >
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-2 md:items-center">
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.4em] text-[#e8c84a] opacity-70">Nuestra esencia</p>
          <h2 className="font-display text-4xl leading-tight text-[#f5f0e8] md:text-5xl">
            Sobre <em className="text-[#e8c84a]">Luna Fashion</em>
          </h2>
          <div className="section-divider my-7" />
          <p className="text-sm leading-7 text-[#f5f0e8]/60">
            Luna Fashion nace para celebrar el estilo propio. Diseñamos prendas que combinan detalles cuidados,
            comodidad y elegancia para acompañarte en tus momentos especiales y en tu día a día.
          </p>
          <p className="mt-4 text-sm leading-7 text-[#f5f0e8]/60">
            Creemos que la moda debe hacerte sentir segura, auténtica y libre de expresar quién eres.
          </p>
          <a href="#coleccion" className="btn-gold mt-8 inline-block">Conoce nuestros diseños</a>
        </div>
        <div className="relative">
          <img
            src="https://images.unsplash.com/photo-1755676433268-63fcc44e190f?w=900&h=1000&fit=crop&auto=format"
            alt="Una propuesta de diseño Luna Fashion"
            className="max-h-[560px] w-full object-cover"
            loading="lazy"
          />
          <div className="pointer-events-none absolute inset-4 border border-[#e8c84a]/30" />
        </div>
      </div>
    </section>
  )
}

function InvoicePage({ reference }: { reference: string }) {
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    document.title = `Comprobante ${reference} | Luna Fashion`

    async function loadInvoice() {
      try {
        const response = await apiRequest(`/api/orders/${encodeURIComponent(reference)}`)
        if (!response.ok) throw new Error(await getApiError(response))
        const data: unknown = await response.json()
        if (!isInvoice(data)) throw new Error('El comprobante recibido tiene un formato inválido.')
        if (!cancelled) setInvoice(data)
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el comprobante.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadInvoice()
    return () => {
      cancelled = true
    }
  }, [reference])

  return (
    <main className="min-h-screen bg-[#060d1a] px-5 py-10 md:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <a href="/" className="text-xs tracking-widest text-[#e8c84a] hover:text-[#f7e9a0]">
            ← Luna Fashion
          </a>
          {invoice && (
            <button type="button" className="btn-gold px-5 py-3" onClick={() => window.print()}>
              Imprimir / Guardar PDF
            </button>
          )}
        </div>
        {loading ? (
          <p className="py-20 text-center text-[#f5f0e8]/60">Cargando comprobante…</p>
        ) : error ? (
          <div className="border border-red-300/20 bg-[#0d1b2e] p-8 text-center">
            <p role="alert" className="text-sm text-red-300">{error}</p>
            <a href="/" className="btn-outline mt-6 inline-block">Volver a Luna Fashion</a>
          </div>
        ) : invoice ? (
          <article className="bg-[#0d1b2e] p-6 text-[#f5f0e8] shadow-2xl md:p-10 print:bg-white print:p-0 print:text-black print:shadow-none">
            <div className="flex flex-col justify-between gap-6 border-b border-[#4a7ab5]/30 pb-7 sm:flex-row">
              <div>
                <p className="font-display text-3xl tracking-widest">
                  <span className="text-[#e8c84a] print:text-black">LUNA</span>
                  <span className="ml-2 text-sm tracking-[0.3em] opacity-60">FASHION</span>
                </p>
                <p className="mt-3 text-xs text-[#f5f0e8]/50 print:text-gray-600">Comprobante de pedido</p>
              </div>
              <div className="sm:text-right">
                <p className="text-xs uppercase tracking-[0.2em] text-[#e8c84a] print:text-black">
                  {invoice.status === 'PENDIENTE_EFECTIVO' ? 'Pendiente de pago' : invoice.status}
                </p>
                <p className="mt-2 text-sm">Ref. {invoice.reference}</p>
                <p className="mt-1 text-xs text-[#f5f0e8]/50 print:text-gray-600">
                  {new Intl.DateTimeFormat('es-CO', {
                    dateStyle: 'long',
                    timeStyle: 'short',
                  }).format(new Date(invoice.createdAt))}
                </p>
              </div>
            </div>

            <div className="grid gap-6 border-b border-[#4a7ab5]/30 py-7 text-sm sm:grid-cols-2">
              <div>
                <h2 className="mb-3 text-xs uppercase tracking-widest text-[#e8c84a] print:text-black">Cliente</h2>
                <p>{invoice.customer.name}</p>
                <p className="mt-1 text-[#f5f0e8]/60 print:text-gray-600">{invoice.customer.email}</p>
                <p className="mt-1 text-[#f5f0e8]/60 print:text-gray-600">Tel. {invoice.customer.phone}</p>
              </div>
              <div>
                <h2 className="mb-3 text-xs uppercase tracking-widest text-[#e8c84a] print:text-black">Entrega y pago</h2>
                <p>{invoice.customer.address}</p>
                <p className="mt-1 text-[#f5f0e8]/60 print:text-gray-600">Efectivo contra entrega</p>
              </div>
            </div>

            <div className="overflow-x-auto py-6">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#4a7ab5]/30 text-xs uppercase tracking-wider text-[#e8c84a] print:text-black">
                    <th className="py-3 pr-3 font-medium">Producto</th>
                    <th className="px-3 py-3 font-medium">Talla</th>
                    <th className="px-3 py-3 text-right font-medium">Cant.</th>
                    <th className="px-3 py-3 text-right font-medium">Precio</th>
                    <th className="py-3 pl-3 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lines.map((line, index) => (
                    <tr key={`${line.name}-${line.size}-${index}`} className="border-b border-[#4a7ab5]/15">
                      <td className="py-4 pr-3">
                        <p>{line.name}</p>
                        <p className="mt-1 text-xs text-[#f5f0e8]/50 print:text-gray-600">{line.color}</p>
                      </td>
                      <td className="px-3 py-4">{line.size}</td>
                      <td className="px-3 py-4 text-right">{line.quantity}</td>
                      <td className="px-3 py-4 text-right">{formatCOP(line.unitPrice)}</td>
                      <td className="py-4 pl-3 text-right">{formatCOP(line.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ml-auto max-w-sm border-t border-[#4a7ab5]/30 pt-5">
              <div className="flex justify-between font-display text-xl">
                <span>Subtotal</span>
                <span className="text-[#e8c84a] print:text-black">{formatCOP(invoice.subtotal)}</span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[#f5f0e8]/50 print:text-gray-600">
                El costo de envío se confirmará por separado antes del despacho. El pago se realiza en efectivo al recibir.
              </p>
            </div>
            <p className="mt-10 border-t border-[#4a7ab5]/20 pt-5 text-center text-[10px] text-[#f5f0e8]/40 print:text-gray-500">
              Comprobante de pedido. No reemplaza una factura electrónica o documento tributario.
            </p>
          </article>
        ) : null}
      </div>
    </main>
  )
}

function Testimonials() {
  const reviews = [
    {
      name: 'Valentina M.',
      city: 'Bogotá',
      text: "El vestido Noche Eterna es exactamente lo que imaginé. Llegué a la gala y todas me preguntaron dónde lo compré.",
      stars: 5,
    },
    {
      name: 'Isabella R.',
      city: 'Medellín',
      text: "Luna Llena es una obra de arte. El bordado en el dobladillo es delicado y la tela cae perfecto.",
      stars: 5,
    },
    {
      name: 'Camila S.',
      city: 'Cali',
      text: "El envío fue rapidísimo y el empaque parecía un regalo de lujo. Calidad increíble para el precio.",
      stars: 5,
    },
  ]
  return (
    <section className="py-16 md:py-24 px-5" style={{ background: 'linear-gradient(180deg, #060d1a 0%, #0d1b2e 50%, #060d1a 100%)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-[#e8c84a] text-xs tracking-[0.4em] uppercase mb-3 opacity-70">Testimonios</p>
          <h2 className="font-display text-4xl text-[#f5f0e8]">Lo que dicen ellas</h2>
          <div className="section-divider mt-6" />
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {reviews.map((r, i) => (
            <div
              key={i}
              className="p-8 transition-all duration-300"
              style={{ border: '1px solid rgba(74,122,181,0.18)', background: 'rgba(13,27,46,0.5)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(74,122,181,0.4)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(74,122,181,0.18)')}
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: r.stars }).map((_, j) => (
                  <span key={j} className="text-[#e8c84a] text-xs">★</span>
                ))}
              </div>
              <p className="text-[#f5f0e8] opacity-70 text-sm leading-relaxed mb-6 font-light italic">
                "{r.text}"
              </p>
              <div>
                <p className="font-display text-[#f5f0e8] text-sm">{r.name}</p>
                <p className="text-[#e8c84a] opacity-50 text-xs tracking-wider mt-0.5">{r.city}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Newsletter() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) { setSent(true) }
  }

  return (
    <section
      className="py-20 px-5 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #060d1a 0%, #112240 50%, #060d1a 100%)' }}
    >
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #2a4a72 0%, transparent 70%)' }}
      />
      <div className="max-w-2xl mx-auto text-center relative z-10">
        <div className="mb-2">
          <MoonSVG size={60} />
        </div>
        <h2 className="font-display text-3xl md:text-4xl text-[#f5f0e8] mb-4 mt-4">
          Únete al <em className="text-[#e8c84a]">Círculo Lunar</em>
        </h2>
        <p className="text-[#f5f0e8] opacity-50 text-sm leading-relaxed mb-8">
          Recibe acceso anticipado a nuevas colecciones, descuentos exclusivos y la guía de estilo nocturna.
        </p>
        {sent ? (
          <div className="py-4 text-[#e8c84a] font-display text-lg">
            Bienvenida al círculo ✦
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="flex-1 px-4 py-3 text-sm text-[#f5f0e8] placeholder-[#f5f0e8] placeholder-opacity-30 outline-none"
              style={{
                background: 'rgba(13,27,46,0.6)',
                border: '1px solid rgba(74,122,181,0.3)',
                fontFamily: 'Outfit, sans-serif',
              }}
            />
            <button type="submit" className="btn-gold whitespace-nowrap">
              Suscribirme
            </button>
          </form>
        )}
      </div>
    </section>
  )
}

function CartDrawer({
  open,
  account,
  items,
  loading,
  error,
  authBusy,
  authError,
  checkoutBusy,
  checkoutError,
  onAuthenticate,
  onLogout,
  onQuantityChange,
  onClose,
  onRemove,
  onCheckout,
}: {
  open: boolean
  account: Account | null
  items: CartLine[]
  loading: boolean
  error: string | null
  authBusy: boolean
  authError: string | null
  checkoutBusy: boolean
  checkoutError: string | null
  onAuthenticate: (mode: 'login' | 'register', form: AccountForm) => Promise<void>
  onLogout: () => void
  onQuantityChange: (variantId: number, quantity: number) => void
  onClose: () => void
  onRemove: (variantId: number) => void
  onCheckout: (address: string, phone: string) => Promise<OrderConfirmation>
}) {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authForm, setAuthForm] = useState<AccountForm>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    address: '',
  })
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [confirmation, setConfirmation] = useState<OrderConfirmation | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  useEffect(() => {
    if (account) {
      setAddress(account.address)
      setPhone(account.phone)
      setAuthForm(form => ({ ...form, email: account.email }))
      setFormError(null)
    }
  }, [account])

  const submitAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    try {
      await onAuthenticate(authMode, authForm)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo iniciar sesión.')
    }
  }

  const submitCheckout = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    try {
      setConfirmation(await onCheckout(address, phone))
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo confirmar el pedido.')
    }
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-60"
          onClick={onClose}
        />
      )}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col transition-transform duration-400"
        style={{
          width: '100%',
          maxWidth: '400px',
          background: '#080f1e',
          borderLeft: '1px solid rgba(74,122,181,0.2)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.35s cubic-bezier(0.23,1,0.32,1)',
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: '1px solid rgba(74,122,181,0.15)' }}
        >
          <div>
            <h3 className="font-display text-lg text-[#f5f0e8]">Tu carrito</h3>
            {account && <p className="mt-1 text-[10px] text-[#f5f0e8]/50">{account.email}</p>}
          </div>
          <button onClick={onClose} className="text-[#f5f0e8] opacity-50 hover:opacity-100 transition-opacity">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!account ? (
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <p className="mb-6 text-sm leading-relaxed text-[#f5f0e8]/60">
              Inicia sesión o crea una cuenta para guardar tu carrito y pedir con pago en efectivo al recibir.
            </p>
            <div className="mb-5 flex border-b border-[#4a7ab5]/20">
              {(['login', 'register'] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setAuthMode(mode)
                    setFormError(null)
                  }}
                  className={`flex-1 border-b-2 py-3 text-xs uppercase tracking-widest ${
                    authMode === mode ? 'border-[#e8c84a] text-[#e8c84a]' : 'border-transparent text-[#f5f0e8]/40'
                  }`}
                >
                  {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
                </button>
              ))}
            </div>
            <form className="flex flex-col gap-4" onSubmit={event => void submitAuth(event)}>
              {authMode === 'register' && (
                <>
                  <label className="text-xs text-[#f5f0e8]/70">
                    Nombre
                    <input
                      required
                      maxLength={100}
                      value={authForm.firstName}
                      onChange={event => setAuthForm(form => ({ ...form, firstName: event.target.value }))}
                      className="mt-2 w-full border border-[#4a7ab5]/30 bg-[#060d1a] px-3 py-3 text-sm text-[#f5f0e8]"
                    />
                  </label>
                  <label className="text-xs text-[#f5f0e8]/70">
                    Apellido
                    <input
                      required
                      maxLength={100}
                      value={authForm.lastName}
                      onChange={event => setAuthForm(form => ({ ...form, lastName: event.target.value }))}
                      className="mt-2 w-full border border-[#4a7ab5]/30 bg-[#060d1a] px-3 py-3 text-sm text-[#f5f0e8]"
                    />
                  </label>
                </>
              )}
              <label className="text-xs text-[#f5f0e8]/70">
                Correo
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={authForm.email}
                  onChange={event => setAuthForm(form => ({ ...form, email: event.target.value }))}
                  className="mt-2 w-full border border-[#4a7ab5]/30 bg-[#060d1a] px-3 py-3 text-sm text-[#f5f0e8]"
                />
              </label>
              <label className="text-xs text-[#f5f0e8]/70">
                Contraseña (mínimo 12 caracteres)
                <input
                  required
                  type="password"
                  minLength={12}
                  maxLength={200}
                  autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                  value={authForm.password}
                  onChange={event => setAuthForm(form => ({ ...form, password: event.target.value }))}
                  className="mt-2 w-full border border-[#4a7ab5]/30 bg-[#060d1a] px-3 py-3 text-sm text-[#f5f0e8]"
                />
              </label>
              {authMode === 'register' && (
                <>
                  <label className="text-xs text-[#f5f0e8]/70">
                    Celular (solo números)
                    <input
                      required
                      inputMode="numeric"
                      minLength={8}
                      maxLength={20}
                      value={authForm.phone}
                      onChange={event => setAuthForm(form => ({ ...form, phone: event.target.value }))}
                      className="mt-2 w-full border border-[#4a7ab5]/30 bg-[#060d1a] px-3 py-3 text-sm text-[#f5f0e8]"
                    />
                  </label>
                  <label className="text-xs text-[#f5f0e8]/70">
                    Dirección de entrega
                    <input
                      required
                      maxLength={200}
                      value={authForm.address}
                      onChange={event => setAuthForm(form => ({ ...form, address: event.target.value }))}
                      className="mt-2 w-full border border-[#4a7ab5]/30 bg-[#060d1a] px-3 py-3 text-sm text-[#f5f0e8]"
                    />
                  </label>
                </>
              )}
              {(authError || formError) && (
                <p role="alert" className="text-sm text-red-300">{authError || formError}</p>
              )}
              <button type="submit" className="btn-gold w-full" disabled={authBusy}>
                {authBusy ? 'Procesando…' : authMode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
              </button>
            </form>
          </div>
        ) : confirmation ? (
          <div className="flex-1 overflow-y-auto px-6 py-10">
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-[#e8c84a]">Pedido confirmado</p>
            <h4 className="font-display text-2xl text-[#f5f0e8]">¡Gracias por tu compra!</h4>
            <p className="mt-4 text-sm leading-relaxed text-[#f5f0e8]/60">
              Pagarás en efectivo cuando recibas tu pedido.
            </p>
            <div className="mt-6 border border-[#4a7ab5]/20 bg-[#0d1b2e] p-4">
              <p className="text-xs text-[#f5f0e8]/50">Referencia del pedido</p>
              <p className="mt-1 font-mono text-lg text-[#e8c84a]">{confirmation.reference}</p>
              <p className="mt-4 text-xs text-[#f5f0e8]/50">Subtotal de productos</p>
              <p className="mt-1 font-display text-xl text-[#f5f0e8]">{formatCOP(confirmation.total)}</p>
              <p className="mt-3 text-xs leading-relaxed text-[#f5f0e8]/50">
                El costo de envío se confirmará por separado antes del despacho.
              </p>
            </div>
            <a
              href={`/factura/${encodeURIComponent(confirmation.reference)}`}
              className="btn-gold mt-6 block w-full text-center"
            >
              Ver / imprimir comprobante
            </a>
            <button type="button" className="btn-gold mt-6 w-full" onClick={() => setConfirmation(null)}>
              Seguir comprando
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs text-[#f5f0e8]/50">Hola, {account.firstName}</p>
                <button type="button" onClick={onLogout} className="text-xs text-[#e8c84a] hover:text-[#f7e9a0]">
                  Cerrar sesión
                </button>
              </div>
              {loading ? (
                <p className="py-10 text-center text-sm text-[#f5f0e8]/50">Cargando carrito…</p>
              ) : error ? (
                <p role="alert" className="py-4 text-sm text-red-300">{error}</p>
              ) : items.length === 0 ? (
                <p className="py-16 text-center text-sm text-[#f5f0e8]/40">Tu carrito está vacío.</p>
              ) : (
                <div className="flex flex-col gap-5">
                  {items.map(item => (
                    <div key={item.variantId} className="flex gap-4">
                      <img
                        src={getImageUrl(item.img)}
                        alt={item.name}
                        className="h-20 w-16 flex-shrink-0 object-cover"
                        style={{ background: '#0d1b2e' }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-sm text-[#f5f0e8]">{item.name}</p>
                        <p className="mt-1 text-xs text-[#f5f0e8]/50">Talla {item.size} · {formatCOP(item.price)}</p>
                        <div className="mt-3 flex items-center gap-3">
                          <button
                            type="button"
                            aria-label={`Reducir cantidad de ${item.name}`}
                            disabled={item.quantity <= 1}
                            onClick={() => onQuantityChange(item.variantId, item.quantity - 1)}
                            className="h-7 w-7 border border-[#4a7ab5]/30 text-[#f5f0e8] disabled:opacity-30"
                          >−</button>
                          <span className="text-sm text-[#f5f0e8]">{item.quantity}</span>
                          <button
                            type="button"
                            aria-label={`Aumentar cantidad de ${item.name}`}
                            disabled={item.quantity >= item.stock}
                            onClick={() => onQuantityChange(item.variantId, item.quantity + 1)}
                            className="h-7 w-7 border border-[#4a7ab5]/30 text-[#f5f0e8] disabled:opacity-30"
                          >+</button>
                          <button
                            type="button"
                            onClick={() => onRemove(item.variantId)}
                            className="ml-auto text-xs text-[#f5f0e8]/40 hover:text-red-300"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-[#e8c84a]">{formatCOP(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <form className="max-h-[55%] overflow-y-auto border-t border-[#4a7ab5]/20 px-6 py-5" onSubmit={event => void submitCheckout(event)}>
                <label className="mb-4 block text-xs text-[#f5f0e8]/70">
                  Dirección de entrega
                  <input
                    required
                    maxLength={200}
                    value={address}
                    onChange={event => setAddress(event.target.value)}
                    className="mt-2 w-full border border-[#4a7ab5]/30 bg-[#060d1a] px-3 py-3 text-sm text-[#f5f0e8]"
                  />
                </label>
                <label className="mb-4 block text-xs text-[#f5f0e8]/70">
                  Teléfono de contacto
                  <input
                    required
                    inputMode="numeric"
                    minLength={8}
                    maxLength={20}
                    value={phone}
                    onChange={event => setPhone(event.target.value)}
                    className="mt-2 w-full border border-[#4a7ab5]/30 bg-[#060d1a] px-3 py-3 text-sm text-[#f5f0e8]"
                  />
                </label>
                <div className="mb-4 flex justify-between text-sm">
                  <span className="text-[#f5f0e8]/50">Subtotal · efectivo al recibir</span>
                  <span className="font-display text-[#e8c84a]">{formatCOP(total)}</span>
                </div>
                <p className="mb-4 text-xs leading-relaxed text-[#f5f0e8]/40">
                  El costo de envío se confirmará por separado antes del despacho.
                </p>
                {(error || checkoutError || formError) && (
                  <p role="alert" className="mb-3 text-sm text-red-300">{error || checkoutError || formError}</p>
                )}
                <button type="submit" className="btn-gold w-full" disabled={checkoutBusy || loading}>
                  {checkoutBusy ? 'Confirmando…' : 'Confirmar pedido'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </>
  )
}

function Footer() {
  return (
    <footer
      className="py-12 px-5"
      style={{ background: '#030a14', borderTop: '1px solid rgba(74,122,181,0.15)' }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="font-display text-2xl tracking-widest text-[#f5f0e8] mb-4">
              <span className="gold-shimmer">LUNA</span>
              <span className="opacity-40 ml-1 text-sm font-normal tracking-[0.3em] align-middle">FASHION</span>
            </div>
            <p className="text-[#f5f0e8] opacity-30 text-xs leading-relaxed">
              Diseños nocturnos para mujeres que brillan en la oscuridad.
            </p>
          </div>
          {[
            ['Colección', ['Vestidos Negros', 'Vestidos Blancos', 'Nueva Temporada', 'Lookbook']],
            ['Atención', ['Mi Cuenta', 'Pedidos', 'Guía de Tallas', 'Devoluciones']],
            ['Contacto', ['Escríbenos', 'WhatsApp', 'Instagram', 'Facebook']],
          ].map(([title, links]) => (
            <div key={title as string}>
              <h4 className="text-[#e8c84a] text-[10px] tracking-[0.3em] uppercase mb-4 opacity-70">
                {title as string}
              </h4>
              <ul className="flex flex-col gap-2">
                {(links as string[]).map(l => (
                  <li key={l}>
                    <a href="#" className="text-[#f5f0e8] opacity-30 hover:opacity-70 text-xs transition-opacity">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div
          className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-2"
          style={{ borderTop: '1px solid rgba(74,122,181,0.1)' }}
        >
          <p className="text-[#f5f0e8] opacity-20 text-[10px] tracking-wider">
            © 2026 Luna Fashion · Todos los derechos reservados
          </p>
          <div className="flex items-center gap-5">
            <a href="/admin" className="text-[#f5f0e8] opacity-30 text-[10px] tracking-wider hover:opacity-70">
              Administrar imágenes
            </a>
            <p className="text-[#e8c84a] opacity-20 text-[10px] tracking-wider">✦ Hecho con amor bajo la luna</p>
          </div>
        </div>
      </div>
    </footer>
  )
}

function ImageManager() {
  const [token, setToken] = useState('')
  const [tokenInput, setTokenInput] = useState('')
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Administrar imágenes | Luna Fashion'
  }, [])

  const loadProducts = async (uploadToken: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_URL}/api/admin/products`, {
        headers: { Authorization: `Bearer ${uploadToken}` },
      })
      if (!response.ok) throw new Error(await getApiError(response))

      const data: unknown = await response.json()
      if (!Array.isArray(data) || !data.every(isAdminProduct)) {
        throw new Error('La respuesta del servidor contiene productos con formato inválido.')
      }

      setToken(uploadToken)
      setProducts(data)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los productos.')
    } finally {
      setLoading(false)
    }
  }

  const updateProductImage = (productId: number, imagePath: string) => {
    setProducts(current =>
      current.map(product => product.id === productId ? { ...product, img: imagePath } : product),
    )
  }

  return (
    <main className="min-h-screen px-5 py-12 md:px-8" style={{ background: '#060d1a' }}>
      <div className="mx-auto max-w-5xl">
        <a href="/" className="text-xs tracking-widest text-[#e8c84a] hover:text-[#f7e9a0]">
          ← Luna Fashion
        </a>
        <header className="my-10">
          <p className="mb-3 text-xs uppercase tracking-[0.4em] text-[#e8c84a] opacity-70">Administración</p>
          <h1 className="font-display text-4xl text-[#f5f0e8] md:text-5xl">Imágenes de productos</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#f5f0e8] opacity-60">
            Sube una imagen JPG, PNG o WebP de hasta 5 MB. Se guardará en el servidor y su ruta se actualizará en la base de datos.
          </p>
        </header>

        {!token ? (
          <form
            className="max-w-xl border border-[#4a7ab5]/20 bg-[#0d1b2e] p-6"
            onSubmit={event => {
              event.preventDefault()
              void loadProducts(tokenInput)
            }}
          >
            <label htmlFor="admin-token" className="mb-2 block text-sm text-[#f5f0e8]">
              Clave de administración
            </label>
            <input
              id="admin-token"
              type="password"
              autoComplete="current-password"
              required
              value={tokenInput}
              onChange={event => setTokenInput(event.target.value)}
              className="mb-4 w-full border border-[#4a7ab5]/30 bg-[#060d1a] px-4 py-3 text-sm text-[#f5f0e8] outline-none focus:border-[#e8c84a]"
            />
            {error && <p role="alert" className="mb-4 text-sm text-red-300">{error}</p>}
            <button type="submit" className="btn-gold" disabled={loading}>
              {loading ? 'Verificando…' : 'Entrar'}
            </button>
          </form>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm text-[#f5f0e8] opacity-60">{products.length} productos</p>
              <button
                type="button"
                onClick={() => {
                  setToken('')
                  setTokenInput('')
                  setProducts([])
                }}
                className="text-xs text-[#e8c84a] hover:text-[#f7e9a0]"
              >
                Cerrar sesión
              </button>
            </div>
            {error && <p role="alert" className="mb-4 text-sm text-red-300">{error}</p>}
            {products.length === 0 ? (
              <p className="border border-[#4a7ab5]/20 bg-[#0d1b2e] p-6 text-sm text-[#f5f0e8] opacity-60">
                No hay productos en la base de datos.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {products.map(product => (
                  <AdminProductImageCard
                    key={product.id}
                    product={product}
                    token={token}
                    onImageUpdated={imagePath => updateProductImage(product.id, imagePath)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}

function AdminProductImageCard({
  product,
  token,
  onImageUpdated,
}: {
  product: AdminProduct
  token: string
  onImageUpdated: (imagePath: string) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const upload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!file) return

    setUploading(true)
    setMessage(null)
    setUploadError(null)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const response = await fetch(`${API_URL}/api/admin/products/${product.id}/image`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (!response.ok) throw new Error(await getApiError(response))

      const result: unknown = await response.json()
      if (typeof result !== 'object' || result === null || !('imagePath' in result) || typeof result.imagePath !== 'string') {
        throw new Error('La respuesta del servidor no contiene la ruta de la imagen.')
      }

      onImageUpdated(result.imagePath)
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setMessage('Imagen actualizada.')
    } catch (uploadFailure) {
      setUploadError(uploadFailure instanceof Error ? uploadFailure.message : 'No se pudo subir la imagen.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <article className="overflow-hidden border border-[#4a7ab5]/20 bg-[#0d1b2e]">
      <img
        src={getImageUrl(product.img)}
        alt={product.name}
        className="h-64 w-full object-cover"
        style={{ background: '#060d1a' }}
      />
      <div className="p-5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#e8c84a]">{product.category} · {product.color}</p>
        <h2 className="mt-2 font-display text-xl text-[#f5f0e8]">{product.name}</h2>
        <form className="mt-5" onSubmit={event => void upload(event)}>
          <label className="mb-3 block text-xs text-[#f5f0e8] opacity-70">
            Seleccionar imagen
            <input
              ref={fileInputRef}
              className="mt-2 block w-full text-xs text-[#f5f0e8] file:mr-3 file:border-0 file:bg-[#e8c84a] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#0a0a0f]"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={event => {
                setFile(event.target.files?.[0] ?? null)
                setMessage(null)
                setUploadError(null)
              }}
            />
          </label>
          <button type="submit" className="btn-gold w-full" disabled={!file || uploading}>
            {uploading ? 'Subiendo…' : 'Guardar imagen'}
          </button>
          {message && <p role="status" className="mt-3 text-xs text-green-300">{message}</p>}
          {uploadError && <p role="alert" className="mt-3 text-xs text-red-300">{uploadError}</p>}
        </form>
      </div>
    </article>
  )
}

function Storefront() {
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [productsError, setProductsError] = useState<string | null>(null)
  const [productsAttempt, setProductsAttempt] = useState(0)
  const [account, setAccount] = useState<Account | null>(null)
  const [cart, setCart] = useState<CartLine[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [cartLoading, setCartLoading] = useState(false)
  const [cartError, setCartError] = useState<string | null>(null)
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [checkoutBusy, setCheckoutBusy] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const pendingVariant = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadProducts() {
      setProductsLoading(true)
      setProductsError(null)

      try {
        const response = await apiRequest('/api/products')
        if (!response.ok) {
          throw new Error(`No se pudieron cargar los productos (HTTP ${response.status}).`)
        }

        const data: unknown = await response.json()
        if (!Array.isArray(data) || !data.every(isProduct)) {
          throw new Error('La respuesta del servidor contiene productos con formato inválido.')
        }

        if (!cancelled) setProducts(data)
      } catch (error) {
        if (!cancelled) {
          setProductsError(
            error instanceof Error ? error.message : 'Ocurrió un error al cargar los productos.',
          )
        }
      } finally {
        if (!cancelled) setProductsLoading(false)
      }
    }

    void loadProducts()
    return () => {
      cancelled = true
    }
  }, [productsAttempt])

  useEffect(() => {
    let cancelled = false

    async function restoreAccount() {
      try {
        const response = await apiRequest('/api/auth/me')
        if (response.status === 401) return
        if (!response.ok) throw new Error(await getApiError(response))

        const data: unknown = await response.json()
        if (typeof data !== 'object' || data === null || !('account' in data) || !isAccount(data.account)) {
          throw new Error('La respuesta de la cuenta tiene un formato inválido.')
        }
        if (cancelled) return

        setAccount(data.account)
        const cartResponse = await apiRequest('/api/cart')
        if (!cartResponse.ok) throw new Error(await getApiError(cartResponse))
        const items = await parseCartResponse(cartResponse)
        if (!cancelled) setCart(items)
      } catch (error) {
        if (!cancelled) {
          setCartError(error instanceof Error ? error.message : 'No se pudo recuperar tu carrito.')
        }
      } finally {
        if (!cancelled) setCartLoading(false)
      }
    }

    void restoreAccount()
    return () => {
      cancelled = true
    }
  }, [])

  const fetchCart = async () => {
    setCartLoading(true)
    setCartError(null)
    try {
      const response = await apiRequest('/api/cart')
      if (!response.ok) throw new Error(await getApiError(response))
      setCart(await parseCartResponse(response))
    } finally {
      setCartLoading(false)
    }
  }

  const addVariantToAuthenticatedCart = async (variantId: number) => {
    setCartLoading(true)
    try {
      const response = await apiRequest('/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId, quantity: 1 }),
      })
      if (!response.ok) throw new Error(await getApiError(response))
      setCart(await parseCartResponse(response))
      setCartOpen(true)
    } catch (error) {
      setCartError(error instanceof Error ? error.message : 'No se pudo agregar el producto.')
      setCartOpen(true)
    } finally {
      setCartLoading(false)
    }
  }

  const addToCart = async (variantId: number) => {
    setCartError(null)
    if (!account) {
      pendingVariant.current = variantId
      setAuthError('Inicia sesión o crea una cuenta para guardar este producto.')
      setCartOpen(true)
      return
    }
    await addVariantToAuthenticatedCart(variantId)
  }

  const authenticate = async (mode: 'login' | 'register', form: AccountForm) => {
    setAuthBusy(true)
    setAuthError(null)
    setCartError(null)
    try {
      const response = await apiRequest(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!response.ok) throw new Error(await getApiError(response))
      const data: unknown = await response.json()
      if (typeof data !== 'object' || data === null || !('account' in data) || !isAccount(data.account)) {
        throw new Error('La respuesta de la cuenta tiene un formato inválido.')
      }
      setAccount(data.account)
      await fetchCart()

      const variantId = pendingVariant.current
      pendingVariant.current = null
      if (variantId !== null) await addVariantToAuthenticatedCart(variantId)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo autenticar la cuenta.'
      setAuthError(message)
      setCartError(message)
      throw new Error(message)
    } finally {
      setAuthBusy(false)
    }
  }

  const updateQuantity = async (variantId: number, quantity: number) => {
    setCartLoading(true)
    setCartError(null)
    try {
      const response = await apiRequest(`/api/cart/items/${variantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      })
      if (!response.ok) throw new Error(await getApiError(response))
      setCart(await parseCartResponse(response))
    } catch (error) {
      setCartError(error instanceof Error ? error.message : 'No se pudo actualizar la cantidad.')
    } finally {
      setCartLoading(false)
    }
  }

  const removeFromCart = async (variantId: number) => {
    setCartLoading(true)
    setCartError(null)
    try {
      const response = await apiRequest(`/api/cart/items/${variantId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error(await getApiError(response))
      setCart(await parseCartResponse(response))
    } catch (error) {
      setCartError(error instanceof Error ? error.message : 'No se pudo eliminar el producto.')
    } finally {
      setCartLoading(false)
    }
  }

  const logout = async () => {
    const response = await apiRequest('/api/auth/logout', { method: 'POST' })
    if (!response.ok) {
      setCartError(await getApiError(response))
      return
    }
    pendingVariant.current = null
    setAccount(null)
    setCart([])
    setAuthError(null)
    setCartError(null)
  }

  const checkout = async (address: string, phone: string): Promise<OrderConfirmation> => {
    setCheckoutBusy(true)
    setCheckoutError(null)
    try {
      const response = await apiRequest('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, phone }),
      })
      if (!response.ok) throw new Error(await getApiError(response))
      const data: unknown = await response.json()
      if (
        typeof data !== 'object' ||
        data === null ||
        !('reference' in data) ||
        typeof data.reference !== 'string' ||
        !('total' in data) ||
        typeof data.total !== 'number'
      ) {
        throw new Error('La respuesta del pedido tiene un formato inválido.')
      }
      setCart([])
      return { reference: data.reference, total: data.total }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo confirmar el pedido.'
      setCheckoutError(message)
      throw new Error(message)
    } finally {
      setCheckoutBusy(false)
    }
  }

  return (
    <div style={{ background: '#060d1a', minHeight: '100vh' }}>
      <Navbar cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)} onCartClick={() => setCartOpen(true)} />
      <Hero />
      <FeaturedBanner />
      <Collection
        products={products}
        loading={productsLoading}
        error={productsError}
        onRetry={() => setProductsAttempt(attempt => attempt + 1)}
        onAdd={addToCart}
      />
      <Lookbook />
      <MoonPhases />
      <About />
      <Testimonials />
      <Newsletter />
      <Footer />
      <CartDrawer
        open={cartOpen}
        account={account}
        items={cart}
        loading={cartLoading}
        error={cartError}
        authBusy={authBusy}
        authError={authError}
        checkoutBusy={checkoutBusy}
        checkoutError={checkoutError}
        onAuthenticate={authenticate}
        onLogout={() => void logout()}
        onQuantityChange={(variantId, quantity) => void updateQuantity(variantId, quantity)}
        onClose={() => setCartOpen(false)}
        onRemove={removeFromCart}
        onCheckout={checkout}
      />
    </div>
  )
}

export default function App() {
  const invoiceMatch = window.location.pathname.match(/^\/factura\/([A-Fa-f0-9]{20})\/?$/)
  if (invoiceMatch) return <InvoicePage reference={invoiceMatch[1].toUpperCase()} />
  return window.location.pathname === '/admin' ? <ImageManager /> : <Storefront />
}
