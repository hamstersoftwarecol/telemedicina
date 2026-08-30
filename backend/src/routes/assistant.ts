import { Hono } from 'hono'
import { Bindings, Variables } from '../types'
import { GoogleGenAI, Type } from '@google/genai'
import { authMiddleware } from '../middleware/auth'

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Tipos para D1
interface Doctor { id: number; user_id: number; first_name: string; last_name: string; specialty_id: number; specialty_name: string }

router.post('/chat', async (c) => {
  try {
    const { message, history } = await c.req.json() as { message: string, history: any[] }
    const apiKey = c.env.GEMINI_API_KEY || ''
    
    if (!apiKey) {
      return c.json({ reply: 'Lo siento, el asistente de IA no está configurado (Falta GEMINI_API_KEY).' }, 500)
    }

    const ai = new GoogleGenAI({ apiKey })

    // Tools definition
    const tools = [{
      functionDeclarations: [
        {
          name: 'get_doctors',
          description: 'Obtiene la lista de doctores y sus especialidades para que el paciente pueda elegir.',
          parameters: { type: Type.OBJECT, properties: {} }
        },
        {
          name: 'check_availability',
          description: 'Verifica los horarios libres de un doctor en una fecha.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              doctor_id: { type: Type.NUMBER, description: 'ID del doctor' },
              date: { type: Type.STRING, description: 'Fecha en formato YYYY-MM-DD' }
            },
            required: ['doctor_id', 'date']
          }
        },
        {
          name: 'book_appointment',
          description: 'Reserva una cita médica.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              patient_name: { type: Type.STRING, description: 'Nombre completo' },
              patient_phone: { type: Type.STRING, description: 'Teléfono' },
              doctor_id: { type: Type.NUMBER, description: 'ID del doctor' },
              date: { type: Type.STRING, description: 'YYYY-MM-DD' },
              time: { type: Type.STRING, description: 'HH:MM' },
              type: { type: Type.STRING, description: 'Tipo de cita: presencial o virtual' },
              reason: { type: Type.STRING, description: 'Motivo de consulta (ej. Chequeo de rutina)' }
            },
            required: ['patient_name', 'doctor_id', 'date', 'time', 'type', 'reason']
          }
        },
        {
          name: 'validate_payment',
          description: 'Valida un pago.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              reference: { type: Type.STRING, description: 'Código de pago' }
            },
            required: ['reference']
          }
        },
        {
          name: 'get_patient_appointments',
          description: 'Obtiene la lista de citas futuras de un paciente (buscando por nombre o teléfono) para saber su ID.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              patient_info: { type: Type.STRING, description: 'Nombre o teléfono del paciente' }
            },
            required: ['patient_info']
          }
        },
        {
          name: 'reschedule_appointment',
          description: 'Cambia la fecha u hora de una cita existente.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              appointment_id: { type: Type.NUMBER, description: 'ID de la cita a reagendar' },
              new_date: { type: Type.STRING, description: 'Nueva fecha YYYY-MM-DD' },
              new_time: { type: Type.STRING, description: 'Nueva hora HH:MM' }
            },
            required: ['appointment_id', 'new_date', 'new_time']
          }
        },
        {
          name: 'cancel_appointment',
          description: 'Cancela una cita existente.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              appointment_id: { type: Type.NUMBER, description: 'ID de la cita a cancelar' }
            },
            required: ['appointment_id']
          }
        }
      ]
    }]

    const systemInstruction = `Eres un asistente médico virtual por voz. Tus capacidades:
1. Ver doctores disponibles.
2. Consultar horarios libres.
3. Agendar citas.
4. Reagendar citas.
5. Cancelar citas.
6. Validar pagos.

REGLAS ESTRICTAS PARA VOZ:
- RESPUESTAS CORTAS Y DIRECTAS: Estás hablando, NO escribiendo. Usa oraciones cortas. Evita listas largas o Markdown.
- IDENTIDAD: Eres el "Asistente Médico Virtual de la clínica". NUNCA reveles qué modelo de lenguaje o inteligencia artificial eres (ej. nunca digas que eres Gemini, GPT, Claude, etc). Si te preguntan, responde amablemente que eres el sistema de asistencia médica de la clínica.
- NUNCA inventes IDs de pacientes ni de citas.
- PARA AGENDAR: Necesitas recolectar Nombre completo, Teléfono, Especialista/Doctor, Fecha, Hora, Tipo (presencial/virtual) y Motivo de consulta. 
  ¡MUY IMPORTANTE!: NO PIDAS ESTOS DATOS TODOS DE GOLPE EN UN SOLO MENSAJE. Pregúntalos de uno en uno (máximo dos a la vez) de forma natural y conversacional, esperando a que el usuario responda cada cosa. No agendes hasta tenerlo todo.
- Para reagendar o cancelar:
  1. Pregunta el nombre o teléfono del paciente.
  2. Usa 'get_patient_appointments' para buscar sus citas.
  3. Menciona la cita encontrada y pregunta a qué nueva fecha/hora desea cambiarla.
  4. Usa 'reschedule_appointment' con el ID de la cita, la nueva fecha y la nueva hora.
- Si falta información, haz una pregunta corta de forma amigable antes de ejecutar cualquier acción.`

    // Crear la sesión de chat con el historial
    const chat = ai.chats.create({
      model: 'gemini-2.0-flash',
      config: { tools: tools as any, systemInstruction, temperature: 0.2 },
      history: history || []
    })

    let response = await chat.sendMessage({ message })
    let replyText = response.text

    // Si Gemini decide llamar a una función, iteramos (hasta 3 veces)
    let callCount = 0
    while (response.functionCalls && response.functionCalls.length > 0 && callCount < 3) {
      callCount++
      const call = response.functionCalls[0]
      const name = call.name
      const args = call.args as any

      let result: any = { error: 'Unknown tool' }

      if (name === 'get_doctors') {
        const doctors = await c.env.DB.prepare(`
          SELECT d.id, u.first_name, u.last_name, s.name as specialty_name 
          FROM doctors d
          JOIN users u ON d.user_id = u.id
          JOIN specialties s ON d.specialty_id = s.id
        `).all<Doctor>()
        result = { doctors: doctors.results }
      } 
      else if (name === 'check_availability') {
        // Mocking availability for demonstration (9am to 5pm)
        const existing = await c.env.DB.prepare('SELECT start_time FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND status != "cancelled"')
          .bind(args.doctor_id, args.date)
          .all<{start_time: string}>()
        
        const bookedTimes = existing.results.map(r => r.start_time)
        const allTimes = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00']
        const availableTimes = allTimes.filter(t => !bookedTimes.includes(t))
        result = { available_times: availableTimes }
      }
      else if (name === 'book_appointment') {
        try {
          // Buscamos si existe un paciente con ese teléfono o nombre
          let patientId = 1 // default fallback
          const searchName = args.patient_name ? args.patient_name.split(' ')[0] : ''
          const patientRecord = await c.env.DB.prepare('SELECT id FROM patients WHERE phone = ? OR first_name LIKE ? OR last_name LIKE ?')
            .bind(args.patient_phone || '___', `%${searchName}%`, `%${searchName}%`).first<{id: number}>()
          
          if (patientRecord) {
            patientId = patientRecord.id
          } else {
            // Create a temporary patient record so that future lookups by this name/phone will work
            const fName = searchName || 'Paciente'
            const lName = args.patient_name ? args.patient_name.split(' ').slice(1).join(' ') : 'Demo'
            const docNum = 'TMP-' + Date.now()
            
            try {
              const result = await c.env.DB.prepare(`
                INSERT INTO patients (first_name, last_name, document_type, document_number, date_of_birth, gender, phone) 
                VALUES (?, ?, 'DNI', ?, '1990-01-01', 'O', ?) RETURNING id
              `).bind(fName, lName || 'Demo', docNum, args.patient_phone || '').first<{id: number}>()
              if (result) patientId = result.id
            } catch (err) {
              console.error('Error auto-creating patient:', err)
              // Fallback to patient 1
            }
          }

          // Calculate end time (+30 mins)
          const [h, m] = args.time.split(':')
          const endM = (parseInt(m) + 30) % 60
          const endH = parseInt(h) + Math.floor((parseInt(m) + 30) / 60)
          const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`

          await c.env.DB.prepare(`
            INSERT INTO appointments (patient_id, doctor_id, appointment_date, start_time, end_time, type, reason, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
          `).bind(patientId, args.doctor_id, args.date, args.time, endTime, args.type || 'presencial', args.reason || `Cita agendada por IA para ${args.patient_name}`).run()

          result = { success: true, message: 'Cita agendada correctamente. El estado es "pending".' }
        } catch (e: any) {
          result = { success: false, error: e.message }
        }
      }
      else if (name === 'validate_payment') {
        // Simulador de validación
        if (args.reference.length > 4) {
          result = { valid: true, message: 'Pago encontrado y aprobado.' }
        } else {
          result = { valid: false, error: 'Código de pago inválido.' }
        }
      }
      else if (name === 'get_patient_appointments') {
        const info = `%${args.patient_info}%`
        const existingApps = await c.env.DB.prepare(`
          SELECT a.id, a.appointment_date, a.start_time, a.status, d.first_name as doctor_name
          FROM appointments a
          JOIN patients p ON a.patient_id = p.id
          JOIN doctors doc ON a.doctor_id = doc.id
          JOIN users d ON doc.user_id = d.id
          WHERE (p.phone LIKE ? OR p.first_name LIKE ? OR p.last_name LIKE ?) AND a.status != 'cancelled'
        `).bind(info, info, info).all()
        result = { appointments: existingApps.results }
      }
      else if (name === 'reschedule_appointment') {
        try {
          const [h, m] = args.new_time.split(':')
          const endM = (parseInt(m) + 30) % 60
          const endH = parseInt(h) + Math.floor((parseInt(m) + 30) / 60)
          const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`

          await c.env.DB.prepare(`
            UPDATE appointments SET appointment_date = ?, start_time = ?, end_time = ? WHERE id = ?
          `).bind(args.new_date, args.new_time, endTime, args.appointment_id).run()
          result = { success: true, message: 'Cita reagendada correctamente.' }
        } catch (e: any) {
          result = { success: false, error: e.message }
        }
      }
      else if (name === 'cancel_appointment') {
        try {
          await c.env.DB.prepare(`
            UPDATE appointments SET status = 'cancelled' WHERE id = ?
          `).bind(args.appointment_id).run()
          result = { success: true, message: 'Cita cancelada.' }
        } catch (e: any) {
          result = { success: false, error: e.message }
        }
      }

      // Enviar resultado de la herramienta de vuelta a Gemini
      response = await chat.sendMessage({
        message: [{
          functionResponse: {
            name: name,
            response: result
          }
        }] as any
      })
      replyText = response.text
    }

    // Devolvemos la respuesta final en texto, junto con la información actualizada del historial para que el frontend lo guarde
    const updatedHistory = await chat.getHistory()
    
    return c.json({ 
      reply: replyText,
      // Solo enviamos texto al frontend en el historial (simplificado)
      history: updatedHistory
    })

  } catch (error: any) {
    console.error('Error en AI assistant:', error)
    return c.json({ error: error.message, reply: 'Ocurrió un error en mi procesamiento.' }, 500)
  }
})

router.post('/copilot', authMiddleware, async (c) => {
  try {
    const user = c.get('user')
    if (!['doctor', 'admin'].includes(user?.role_name || user?.role || '')) {
      return c.json({ error: 'Unauthorized' }, 403)
    }

    const { context, prompt } = await c.req.json() as { context: string, prompt?: string }
    const apiKey = c.env.GEMINI_API_KEY || ''
    
    if (!apiKey) {
      return c.json({ reply: 'La IA no está configurada (Falta API Key).' }, 500)
    }

    const ai = new GoogleGenAI({ apiKey })

    const systemInstruction = `Eres un asistente de Inteligencia Artificial (Copilot) para un médico durante una videoconsulta. 
Tu objetivo es ayudar al doctor dándole respuestas rápidas, profesionales y empáticas que pueda decirle a su paciente o explicaciones simples de términos médicos.
Mantén tus sugerencias directas y al grano.`

    let finalPrompt = ''
    if (prompt) {
      finalPrompt = `Contexto del chat actual:\n"${context}"\n\nPregunta/Petición del doctor: ${prompt}`
    } else {
      finalPrompt = `Contexto del chat actual:\n"${context}"\n\nPor favor sugiere la próxima respuesta que el doctor debería dar al paciente.`
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: finalPrompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    })

    return c.json({ reply: response.text })

  } catch (error: any) {
    console.error('Error en AI copilot:', error)
    return c.json({ error: error.message, reply: 'Ocurrió un error al generar la sugerencia.' }, 500)
  }
})

export { router as assistantRouter }
