import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// Registrar fuentes modernas (Google Fonts)
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
  header: { flexDirection: 'row', justifyContent: 'space-between', borderBottom: '2pt solid #0ea5e9', paddingBottom: 15, marginBottom: 20 },
  headerLeft: { flex: 1 },
  clinicName: { fontSize: 24, fontWeight: 700, color: '#0ea5e9', marginBottom: 4 },
  clinicSub: { fontSize: 9, color: '#000000' },
  headerRight: { alignItems: 'flex-end', justifyContent: 'flex-end' },
  docTitle: { fontSize: 18, fontWeight: 600, color: '#000000', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
  docMeta: { fontSize: 9, color: '#000000' },
  
  sectionTitle: { fontSize: 12, fontWeight: 600, color: '#0ea5e9', textTransform: 'uppercase', marginBottom: 8, marginTop: 15, borderBottom: '1pt solid #e2e8f0', paddingBottom: 4 },
  
  patientBox: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 6, marginBottom: 20, flexDirection: 'row', flexWrap: 'wrap' },
  patientCol: { width: '50%', marginBottom: 6 },
  label: { fontSize: 8, color: '#000000', textTransform: 'uppercase', marginBottom: 2 },
  value: { fontSize: 10, fontWeight: 600, color: '#000000' },
  
  diagnosisBox: { marginBottom: 20 },
  
  table: { width: '100%', marginBottom: 20 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', padding: 8, borderBottom: '1pt solid #cbd5e1' },
  tableRow: { flexDirection: 'row', padding: 8, borderBottom: '1pt solid #e2e8f0' },
  col1: { width: '40%' },
  col2: { width: '20%' },
  col3: { width: '20%' },
  col4: { width: '20%' },
  th: { fontSize: 9, fontWeight: 600, color: '#000000' },
  td: { fontSize: 9, color: '#000000' },
  tdMain: { fontSize: 10, fontWeight: 600, color: '#000000' },
  tdSub: { fontSize: 8, color: '#000000', marginTop: 2 },
  
  notesBox: { marginTop: 10, padding: 10, backgroundColor: '#f8fafc', borderRadius: 6, borderLeft: '3pt solid #eab308' },
  notesTitle: { fontSize: 9, fontWeight: 600, color: '#a16207', marginBottom: 4 },
  notesText: { fontSize: 9, color: '#000000' },
  
  footer: { position: 'absolute', bottom: 40, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  signatureBox: { width: 200, borderTop: '1pt solid #cbd5e1', paddingTop: 8, alignItems: 'center' },
  signatureName: { fontSize: 10, fontWeight: 600, color: '#000000' },
  signatureTitle: { fontSize: 9, color: '#000000' },
  footerText: { fontSize: 8, color: '#000000' }
})

export interface PrescriptionData {
  id: number
  patient_name: string
  patient_document_number?: string
  patient_blood_type?: string
  patient_allergies?: string
  doctor_name: string
  license_number?: string
  prescription_date: string
  valid_until?: string | null
  diagnosis?: string | null
  notes?: string | null
  items?: Array<{
    id: number
    medication_name: string
    generic_name?: string | null
    dosage: string
    frequency: string
    duration: string
    quantity?: number | null
    instructions?: string | null
    route: string
  }>
}

interface Props {
  data: PrescriptionData
}

export function PrescriptionDocument({ data }: Props) {
  const dateFormatted = data.prescription_date 
    ? format(new Date(data.prescription_date), "d 'de' MMMM, yyyy", { locale: es })
    : ''
    
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.clinicName}>Telemedicina Pro</Text>
            <Text style={styles.clinicSub}>Salud Digital y Cuidado Especializado</Text>
            <Text style={styles.clinicSub}>Tel: (555) 123-4567 | info@telemedicina.pro</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.docTitle}>Receta Médica</Text>
            <Text style={styles.docMeta}>Folio: #{data.id.toString().padStart(6, '0')}</Text>
            <Text style={styles.docMeta}>Fecha: {dateFormatted}</Text>
          </View>
        </View>

        {/* Patient Info */}
        <View style={styles.patientBox}>
          <View style={styles.patientCol}>
            <Text style={styles.label}>Paciente</Text>
            <Text style={styles.value}>{data.patient_name}</Text>
          </View>
          <View style={styles.patientCol}>
            <Text style={styles.label}>Documento</Text>
            <Text style={styles.value}>{data.patient_document_number || 'No especificado'}</Text>
          </View>
          <View style={styles.patientCol}>
            <Text style={styles.label}>Alergias</Text>
            <Text style={[styles.value, data.patient_allergies && data.patient_allergies !== '[]' ? { color: '#ef4444' } : {}]}>
              {data.patient_allergies && data.patient_allergies !== '[]' ? data.patient_allergies : 'Ninguna conocida'}
            </Text>
          </View>
          <View style={styles.patientCol}>
            <Text style={styles.label}>Validez</Text>
            <Text style={styles.value}>
              {data.valid_until ? format(new Date(data.valid_until), "d 'de' MMM, yyyy", { locale: es }) : 'No especificada'}
            </Text>
          </View>
        </View>

        {/* Diagnosis */}
        {data.diagnosis && (
          <View style={styles.diagnosisBox}>
            <Text style={styles.sectionTitle}>Diagnóstico</Text>
            <Text style={styles.td}>{data.diagnosis}</Text>
          </View>
        )}

        {/* Medications Table */}
        <Text style={styles.sectionTitle}>Prescripción</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.col1, styles.th]}>Medicamento</Text>
            <Text style={[styles.col2, styles.th]}>Dosis / Vía</Text>
            <Text style={[styles.col3, styles.th]}>Frecuencia</Text>
            <Text style={[styles.col4, styles.th]}>Duración</Text>
          </View>
          
          {(data.items || []).map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <View style={styles.col1}>
                <Text style={styles.tdMain}>{item.medication_name}</Text>
                {item.generic_name && <Text style={styles.tdSub}>{item.generic_name}</Text>}
                {item.instructions && <Text style={[styles.tdSub, { marginTop: 4 }]}>Indicaciones: {item.instructions}</Text>}
              </View>
              <View style={styles.col2}>
                <Text style={styles.td}>{item.dosage}</Text>
                <Text style={styles.tdSub}>{item.route}</Text>
              </View>
              <View style={styles.col3}>
                <Text style={styles.td}>{item.frequency}</Text>
              </View>
              <View style={styles.col4}>
                <Text style={styles.td}>{item.duration}</Text>
                {item.quantity && <Text style={styles.tdSub}>Cant: {item.quantity}</Text>}
              </View>
            </View>
          ))}
        </View>

        {/* Notes */}
        {data.notes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesTitle}>Notas Adicionales</Text>
            <Text style={styles.notesText}>{data.notes}</Text>
          </View>
        )}

        {/* Footer with Signature */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Generado el {format(new Date(), "dd/MM/yyyy HH:mm")}</Text>
          
          <View style={styles.signatureBox}>
            <Text style={styles.signatureName}>Dr/a. {data.doctor_name}</Text>
            <Text style={styles.signatureTitle}>Médico Tratante</Text>
            {data.license_number && <Text style={styles.signatureTitle}>Licencia: {data.license_number}</Text>}
          </View>
        </View>
      </Page>
    </Document>
  )
}
