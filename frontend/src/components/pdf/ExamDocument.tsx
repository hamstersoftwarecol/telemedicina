import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import { format } from 'date-fns'
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
  header: { flexDirection: 'row', justifyContent: 'space-between', borderBottom: '2pt solid #8b5cf6', paddingBottom: 15, marginBottom: 20 },
  headerLeft: { flex: 1 },
  clinicName: { fontSize: 24, fontWeight: 700, color: '#8b5cf6', marginBottom: 4 },
  clinicSub: { fontSize: 9, color: '#000000' },
  headerRight: { alignItems: 'flex-end', justifyContent: 'flex-end' },
  docTitle: { fontSize: 16, fontWeight: 600, color: '#000000', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
  docMeta: { fontSize: 9, color: '#000000' },
  
  infoBox: { backgroundColor: '#f5f3ff', padding: 12, borderRadius: 6, marginBottom: 20, flexDirection: 'row', flexWrap: 'wrap', borderLeft: '3pt solid #8b5cf6' },
  infoCol: { width: '50%', marginBottom: 6 },
  label: { fontSize: 8, color: '#000000', textTransform: 'uppercase', marginBottom: 2 },
  value: { fontSize: 10, fontWeight: 600, color: '#000000' },
  
  sectionTitle: { fontSize: 12, fontWeight: 600, color: '#8b5cf6', textTransform: 'uppercase', marginBottom: 8, marginTop: 10, borderBottom: '1pt solid #e2e8f0', paddingBottom: 4 },
  
  resultsBox: { marginTop: 10, padding: 15, backgroundColor: '#ffffff', borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0', minHeight: 200 },
  resultsText: { fontSize: 10, color: '#000000', lineHeight: 1.6 },
  
  footer: { position: 'absolute', bottom: 40, left: 40, right: 40 },
  disclaimer: { fontSize: 8, color: '#000000', textAlign: 'center', borderTop: '1pt solid #cbd5e1', paddingTop: 8, marginBottom: 10 },
  footerText: { fontSize: 8, color: '#000000', textAlign: 'center' }
})

export interface ExamData {
  id: number
  patient_name: string
  doctor_name: string | null
  exam_type: string
  exam_name: string
  exam_date: string
  status: string
  results_summary: string | null
}

interface Props {
  data: ExamData
}

const EXAM_TYPE_LABELS: Record<string, string> = {
  laboratory: 'Laboratorio',
  imaging: 'Imagen (RX/TAC/MRI)',
  pathology: 'Patología',
  cardiology: 'Cardiología'
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  completed: 'Completado',
  cancelled: 'Cancelado'
}

export function ExamDocument({ data }: Props) {
  const dateFormatted = data.exam_date 
    ? format(new Date(data.exam_date), "d 'de' MMMM, yyyy", { locale: es })
    : ''
    
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.clinicName}>Telemedicina Pro</Text>
            <Text style={styles.clinicSub}>Departamento de Diagnóstico y Laboratorio</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.docTitle}>Resultado de Examen</Text>
            <Text style={styles.docMeta}>Folio: #{data.id.toString().padStart(6, '0')}</Text>
            <Text style={styles.docMeta}>Fecha: {dateFormatted}</Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <View style={styles.infoCol}>
            <Text style={styles.label}>Paciente</Text>
            <Text style={styles.value}>{data.patient_name}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.label}>Médico Solicitante</Text>
            <Text style={styles.value}>{data.doctor_name || 'No especificado'}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.label}>Tipo de Examen</Text>
            <Text style={styles.value}>{EXAM_TYPE_LABELS[data.exam_type] || data.exam_type}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.label}>Examen</Text>
            <Text style={styles.value}>{data.exam_name}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.label}>Estado</Text>
            <Text style={styles.value}>{STATUS_LABELS[data.status] || data.status}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Resumen de Resultados</Text>
        <View style={styles.resultsBox}>
          {data.results_summary ? (
            <Text style={styles.resultsText}>{data.results_summary}</Text>
          ) : (
            <Text style={[styles.resultsText, { color: '#000000', textAlign: 'center', marginTop: 80 }]}>
              {data.status === 'pending' ? 'El examen se encuentra en proceso o pendiente de resultados.' : 'No hay detalles registrados para este examen.'}
            </Text>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.disclaimer}>
            Este documento es un resumen informativo. Los resultados deben ser interpretados por un médico especialista dentro del contexto clínico del paciente.
          </Text>
          <Text style={styles.footerText}>Generado el {format(new Date(), "dd/MM/yyyy HH:mm")}</Text>
        </View>
      </Page>
    </Document>
  )
}
