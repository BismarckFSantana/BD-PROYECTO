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

const PRODUCTS = [
  {
    id: 1,
    name: 'Noche Eterna',
    price: 289000,
    category: 'Noche',
    color: 'Negro',
    tag: 'Más vendido',
    img: 'https://images.unsplash.com/photo-1589212987511-4a924cb9d8ac?w=600&h=800&fit=crop&auto=format',
    desc: 'Vestido largo en seda mate con escote en V profundo. Silueta columna.',
  },
  {
    id: 2,
    name: 'Luna Llena',
    price: 245000,
    category: 'Luna',
    color: 'Blanco',
    tag: 'Nuevo',
    img: 'https://images.unsplash.com/photo-1724491216344-86b16f56e57e?w=600&h=800&fit=crop&auto=format',
    desc: 'Vestido midi en gasa blanca con bordado lunar en el dobladillo.',
  },
  {
    id: 3,
    name: 'Medianoche',
    price: 312000,
    category: 'Noche',
    color: 'Negro',
    tag: null,
    img: 'https://images.unsplash.com/photo-1568251188392-ae32f898cb3b?w=600&h=800&fit=crop&auto=format',
    desc: 'Vestido asimétrico con capa translúcida. Detalles dorados en el corpiño.',
  },
  {
    id: 4,
    name: 'Solsticio',
    price: 198000,
    category: 'Luna',
    color: 'Blanco',
    tag: null,
    img: 'https://images.unsplash.com/photo-1688597168941-cc8ec4839069?w=600&h=800&fit=crop&auto=format',
    desc: 'Vestido mini de encaje blanco con forro en satén.',
  },
  {
    id: 5,
    name: 'Eclipse',
    price: 275000,
    category: 'Noche',
    color: 'Negro',
    tag: 'Exclusivo',
    img: 'https://images.unsplash.com/photo-1623580674393-edf6eb7090f8?w=600&h=800&fit=crop&auto=format',
    desc: 'Vestido corset negro con falda de capas y apliques dorados.',
  },
  {
    id: 6,
    name: 'Aura Lunar',
    price: 229000,
    category: 'Luna',
    color: 'Blanco',
    tag: 'Nuevo',
    img: 'https://images.unsplash.com/photo-1780255355074-b9a1a0272462?w=600&h=800&fit=crop&auto=format',
    desc: 'Vestido wrap en crepé blanco, manga larga con abertura lateral.',
  },
]

const CATEGORIES = ['Todos', 'Noche', 'Luna']

function formatCOP(n: number) {
  return '$' + n.toLocaleString('es-CO')
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
          <span className="text-[#f5f0e8] opacity-60 ml-1 text-sm font-normal tracking-[0.3em] align-middle">NOIR</span>
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-10">
          {['Colección', 'Nueva Temporada', 'Lookbook', 'Sobre Nosotros'].map(item => (
            <a
              key={item}
              href="#"
              className="text-xs tracking-[0.15em] uppercase text-[#f5f0e8] opacity-70 hover:opacity-100 hover:text-[#e8c84a] transition-all duration-200"
            >
              {item}
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
            {['Colección', 'Nueva Temporada', 'Lookbook', 'Sobre Nosotros'].map(item => (
              <a
                key={item}
                href="#"
                onClick={() => setMenuOpen(false)}
                className="text-sm tracking-[0.15em] uppercase text-[#f5f0e8] opacity-70"
              >
                {item}
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
          <button className="btn-gold">Explorar Colección</button>
          <button className="btn-outline">Ver Lookbook</button>
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
            La Noche Como<br />
            <em className="text-[#e8c84a]">Segundo Piel</em>
          </h2>
          <p className="text-[#f5f0e8] opacity-50 leading-relaxed mb-8 max-w-md">
            Cada vestido LUNA NOIR está diseñado para quienes encuentran su poder al caer el sol.
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
          <button className="btn-gold">Nuestra Historia</button>
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
  product: (typeof PRODUCTS)[0]
  onAdd: (p: (typeof PRODUCTS)[0]) => void
}) {
  const [added, setAdded] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)

  const handleAdd = () => {
    onAdd(product)
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
          src={product.img}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          style={{ opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.4s' }}
          onLoad={() => setImgLoaded(true)}
        />
        {product.tag && (
          <div className="absolute top-3 left-3">
            <span
              className="text-[9px] tracking-[0.2em] uppercase font-medium px-2 py-1"
              style={{ background: '#e8c84a', color: '#0a0a0f' }}
            >
              {product.tag}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
        <button
          onClick={handleAdd}
          className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0"
          style={{
            background: added ? '#e8c84a' : 'rgba(13,27,46,0.95)',
            color: added ? '#0a0a0f' : '#f5f0e8',
            border: '1px solid rgba(232,200,74,0.5)',
            padding: '0.625rem',
            fontSize: '0.7rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {added ? '✓ Agregado' : 'Agregar al carrito'}
        </button>
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
          <p className="font-display text-[#e8c84a] text-base mt-1">{formatCOP(product.price)}</p>
        </div>
        <p className="text-[#f5f0e8] opacity-40 text-xs leading-relaxed mt-2">{product.desc}</p>
      </div>
    </div>
  )
}

function Collection({ onAdd }: { onAdd: (p: (typeof PRODUCTS)[0]) => void }) {
  const [active, setActive] = useState('Todos')

  const filtered = active === 'Todos' ? PRODUCTS : PRODUCTS.filter(p => p.category === active)

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
            {CATEGORIES.map(cat => (
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
                  borderColor: active === cat ? '#e8c84a' : 'rgba(232,200,74,0.2)',
                  background: active === cat ? '#e8c84a' : 'transparent',
                  color: active === cat ? '#0a0a0f' : '#e8c84a',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-8">
          {filtered.map(p => (
            <ProductCard key={p.id} product={p} onAdd={onAdd} />
          ))}
        </div>
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
  items,
  onClose,
  onRemove,
}: {
  open: boolean
  items: (typeof PRODUCTS)[0][]
  onClose: () => void
  onRemove: (id: number) => void
}) {
  const total = items.reduce((s, p) => s + p.price, 0)

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
          <h3 className="font-display text-lg text-[#f5f0e8]">Tu Selección</h3>
          <button onClick={onClose} className="text-[#f5f0e8] opacity-50 hover:opacity-100 transition-opacity">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="text-center py-16 text-[#f5f0e8] opacity-30 text-sm">
              Tu carrito está vacío
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {items.map((item, idx) => (
                <div key={`${item.id}-${idx}`} className="flex gap-4">
                  <img
                    src={item.img}
                    alt={item.name}
                    className="w-16 h-20 object-cover flex-shrink-0"
                    style={{ background: '#0d1b2e' }}
                  />
                  <div className="flex-1">
                    <p className="font-display text-sm text-[#f5f0e8]">{item.name}</p>
                    <p className="text-[#e8c84a] text-xs mt-1">{formatCOP(item.price)}</p>
                    <button
                      onClick={() => onRemove(idx)}
                      className="text-[#f5f0e8] opacity-30 hover:opacity-70 text-xs mt-2 transition-opacity"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div
            className="px-6 py-5"
            style={{ borderTop: '1px solid rgba(74,122,181,0.15)' }}
          >
            <div className="flex justify-between mb-5">
              <span className="text-[#f5f0e8] opacity-50 text-sm tracking-wider">Total</span>
              <span className="font-display text-[#e8c84a] text-lg">{formatCOP(total)}</span>
            </div>
            <button className="btn-gold w-full text-center">Finalizar Compra</button>
          </div>
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
              <span className="opacity-40 ml-1 text-sm font-normal tracking-[0.3em] align-middle">NOIR</span>
            </div>
            <p className="text-[#f5f0e8] opacity-30 text-xs leading-relaxed">
              Diseños nocturnos para mujeres que brillan en la oscuridad.
            </p>
          </div>
          {[
            ['Colección', ['Vestidos Negros', 'Vestidos Blancos', 'Nueva Temporada', 'Lookbook']],
            ['Atención', ['Mi Cuenta', 'Pedidos', 'Guía de Tallas', 'Devoluciones']],
            ['Contacto', ['hola@lunanoir.co', 'WhatsApp', 'Instagram', 'Facebook']],
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
            © 2026 LUNA NOIR · Todos los derechos reservados
          </p>
          <p className="text-[#e8c84a] opacity-20 text-[10px] tracking-wider">✦ Hecho con amor bajo la luna</p>
        </div>
      </div>
    </footer>
  )
}

export default function App() {
  const [cart, setCart] = useState<(typeof PRODUCTS)[0][]>([])
  const [cartOpen, setCartOpen] = useState(false)

  const addToCart = (p: (typeof PRODUCTS)[0]) => {
    setCart(prev => [...prev, p])
  }

  const removeFromCart = (idx: number) => {
    setCart(prev => prev.filter((_, i) => i !== idx))
  }

  return (
    <div style={{ background: '#060d1a', minHeight: '100vh' }}>
      <Navbar cartCount={cart.length} onCartClick={() => setCartOpen(true)} />
      <Hero />
      <FeaturedBanner />
      <Collection onAdd={addToCart} />
      <MoonPhases />
      <Testimonials />
      <Newsletter />
      <Footer />
      <CartDrawer
        open={cartOpen}
        items={cart}
        onClose={() => setCartOpen(false)}
        onRemove={removeFromCart}
      />
    </div>
  )
}
