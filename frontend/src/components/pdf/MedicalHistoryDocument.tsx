import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import { format, differenceInYears } from 'date-fns'
import { es } from 'date-fns/locale'

Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyeMZhrib2Bg-4.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYMZhrib2Bg-4.ttf', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYMZhrib2Bg-4.ttf', fontWeight: 700 }
  ]
})

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Inter', fontSize: 10, color: '#000000', backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', borderBottom: '2pt solid #10b981', paddingBottom: 15, marginBottom: 20 },
  headerLeft: { flex: 1 },
  clinicName: { fontSize: 24, fontWeight: 700, color: '#10b981', marginBottom: 4 },
  clinicSub: { fontSize: 9, color: '#000000' },
  headerRight: { alignItems: 'flex-end', justifyContent: 'flex-end' },
  docTitle: { fontSize: 16, fontWeight: 600, color: '#000000', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
  docMeta: { fontSize: 9, color: '#000000' },
  
  patientBox: { backgroundColor: '#f0fdf4', padding: 12, borderRadius: 6, marginBottom: 20, flexDirection: 'row', flexWrap: 'wrap', borderLeft: '3pt solid #10b981' },
  patientCol: { width: '33.33%', marginBottom: 8 },
  label: { fontSize: 8, color: '#000000', textTransform: 'uppercase', marginBottom: 2 },
  value: { fontSize: 10, fontWeight: 600, color: '#000000' },
  
  sectionTitle: { fontSize: 12, fontWeight: 600, color: '#10b981', textTransform: 'uppercase', marginBottom: 12, marginTop: 10, borderBottom: '1pt solid #e2e8f0', paddingBottom: 4 },
  
  eventCard: { marginBottom: 12, paddingBottom: 12, borderBottom: '1pt solid #f1f5f9' },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  eventTitle: { fontSize: 11, fontWeight: 700, color: '#000000', flex: 1 },
  eventType: { fontSize: 8, fontWeight: 600, color: '#ffffff', backgroundColor: '#000000', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  eventMeta: { flexDirection: 'row', marginBottom: 6 },
  eventMetaText: { fontSize: 9, color: '#000000', marginRight: 15 },
  eventDesc: { fontSize: 10, color: '#000000', lineHeight: 1.5 },
  
  footer: { position: 'absolute', bottom: 40, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', borderTop: '1pt solid #cbd5e1', paddingTop: 8 },
  footerText: { fontSize: 8, color: '#000000' }
})

export interface MedicalHistoryData {
  patient: {
    first_name: string
    last_name: string
    document_number: string
    document_type: string
    date_of_birth: string
    gender: string
    blood_type: string | null
    phone: string | null
    email: string | null
    allergies: string | null
  }
  events: Array<{
    id: number
    event_type: string
    event_date: string
    title: string
    description: string | null
    doctor_name: string | null
  }>
}

interface Props {
  data: MedicalHistoryData
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  consultation: 'Consulta',
  prescription: 'Receta',
  exam: 'Examen',
  hospitalization: 'Hospitalización',
  surgery: 'Cirugía',
  allergy: 'Alergia',
  note: 'Nota'
}

export function MedicalHistoryDocument({ data }: Props) {
  const { patient, events } = data
  const age = patient.date_of_birth ? differenceInYears(new Date(), new Date(patient.date_of_birth)) : 'N/A'
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.clinicName}>Telemedicina Pro</Text>
            <Text style={styles.clinicSub}>Departamento de Registros Médicos</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.docTitle}>Historial Clínico</Text>
            <Text style={styles.docMeta}>Exportado el: {format(new Date(), "dd/MM/yyyy")}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Datos del Paciente</Text>
        <View style={styles.patientBox}>
          <View style={styles.patientCol}>
            <Text style={styles.label}>Nombre completo</Text>
            <Text style={styles.value}>{patient.first_name} {patient.last_name}</Text>
          </View>
          <View style={styles.patientCol}>
            <Text style={styles.label}>Documento ({patient.document_type})</Text>
            <Text style={styles.value}>{patient.document_number}</Text>
          </View>
          <View style={styles.patientCol}>
            <Text style={styles.label}>Edad</Text>
            <Text style={styles.value}>{age} años</Text>
          </View>
          <View style={styles.patientCol}>
            <Text style={styles.label}>Género</Text>
            <Text style={styles.value}>{patient.gender === 'M' ? 'Masculino' : patient.gender === 'F' ? 'Femenino' : 'Otro'}</Text>
          </View>
          <View style={styles.patientCol}>
            <Text style={styles.label}>Tipo de Sangre</Text>
            <Text style={styles.value}>{patient.blood_type || 'No especificado'}</Text>
          </View>
          <View style={styles.patientCol}>
            <Text style={styles.label}>Teléfono</Text>
            <Text style={styles.value}>{patient.phone || 'No registrado'}</Text>
          </View>
          <View style={[styles.patientCol, { width: '100%', marginBottom: 0, marginTop: 4 }]}>
            <Text style={styles.label}>Alergias Conocidas</Text>
            <Text style={[styles.value, patient.allergies && patient.allergies !== '[]' ? { color: '#ef4444' } : {}]}>
              {patient.allergies && patient.allergies !== '[]' ? patient.allergies : 'Ninguna registrada'}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Registro de Eventos</Text>
        
        {events.length === 0 ? (
          <Text style={{ fontSize: 10, color: '#000000', textAlign: 'center', marginTop: 20 }}>
            No hay eventos registrados en el historial de este paciente.
          </Text>
        ) : (
          events.map(event => (
            <View key={event.id} style={styles.eventCard}>
              <View style={styles.eventHeader}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventType}>{EVENT_TYPE_LABELS[event.event_type] || event.event_type}</Text>
              </View>
              <View style={styles.eventMeta}>
                <Text style={styles.eventMetaText}>Fecha: {format(new Date(event.event_date), "dd/MM/yyyy")}</Text>
                {event.doctor_name && <Text style={styles.eventMetaText}>Médico: {event.doctor_name}</Text>}
              </View>
              {event.description && (
                <Text style={styles.eventDesc}>{event.description}</Text>
              )}
            </View>
          ))
        )}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Documento generado automáticamente por Telemedicina Pro</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => (`Página ${pageNumber} de ${totalPages}`)} />
        </View>
      </Page>
    </Document>
  )
}
