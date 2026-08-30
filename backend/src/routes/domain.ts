import { Hono } from 'hono'
import { Bindings } from '../types'

const domain = new Hono<{ Bindings: Bindings }>()

domain.post('/', async (c) => {
  const { domain: hostname } = await c.req.json()

  if (!hostname) {
    return c.json({ error: 'El dominio es requerido' }, 400)
  }

  try {
    // 1. Llama a Cloudflare Pages API para asociar el dominio
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${c.env.CLOUDFLARE_ACCOUNT_ID}/pages/projects/${c.env.CLOUDFLARE_PAGES_PROJECT}/domains`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${c.env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: hostname
      })
    })

    const cfData: any = await response.json()

    if (!cfData.success) {
      return c.json({ error: cfData.errors[0]?.message || 'Error al configurar el dominio en Cloudflare' }, 400)
    }

    // 2. Guarda el estado en la base de datos (settings)
    await c.env.DB.prepare(`
      INSERT INTO settings (key, value, type, description)
      VALUES 
        ('custom_domain.hostname', ?, 'string', 'Dominio personalizado'),
        ('custom_domain.status', 'pending', 'string', 'Estado del dominio')
      ON CONFLICT(key) DO UPDATE SET value=excluded.value
    `).bind(hostname).run()

    return c.json({ 
      success: true, 
      message: 'Dominio registrado. Por favor configura los DNS.',
      ownership_verification: {
        type: 'CNAME',
        name: hostname,
        value: 'telemedicina-frontend.pages.dev'
      }
    })
  } catch (error) {
    return c.json({ error: 'Error interno del servidor' }, 500)
  }
})

domain.get('/status', async (c) => {
  try {
    const setting = await c.env.DB.prepare(`SELECT value FROM settings WHERE key = 'custom_domain.hostname'`).first()
    
    if (!setting) {
      return c.json({ status: 'unconfigured' })
    }

    const hostname = setting.value

    // Llama a Cloudflare para revisar el estado del dominio de Pages
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${c.env.CLOUDFLARE_ACCOUNT_ID}/pages/projects/${c.env.CLOUDFLARE_PAGES_PROJECT}/domains/${hostname}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${c.env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    const cfData: any = await response.json()

    if (!cfData.success) {
      return c.json({ error: 'No se pudo obtener el estado del dominio' }, 400)
    }

    const cfStatus = cfData.result.status

    // Actualiza en base de datos si ya está activo
    if (cfStatus === 'active') {
       await c.env.DB.prepare(`UPDATE settings SET value = 'active' WHERE key = 'custom_domain.status'`).run()
    }

    return c.json({
      status: cfStatus,
      hostname: cfData.result.name,
      ownership_verification: cfStatus !== 'active' ? {
        type: 'CNAME',
        name: hostname,
        value: 'telemedicina-frontend.pages.dev'
      } : undefined
    })

  } catch (error) {
    return c.json({ error: 'Error interno del servidor' }, 500)
  }
})

export default domain
