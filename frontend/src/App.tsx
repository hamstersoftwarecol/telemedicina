import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { UsersPage } from '@/pages/UsersPage'
import { PatientsPage } from '@/pages/PatientsPage'
import { DoctorsPage } from '@/pages/DoctorsPage'
import { AppointmentsPage } from '@/pages/AppointmentsPage'
import { VideoconsultaPage } from '@/pages/VideoconsultaPage'
import { MedicalHistoryPage } from '@/pages/MedicalHistoryPage'
import { SpecialtiesPage } from '@/pages/SpecialtiesPage'
import { ConsultationsPage } from '@/pages/ConsultationsPage'
import { PrescriptionsPage } from '@/pages/PrescriptionsPage'
import { ExamsPage } from '@/pages/ExamsPage'
import { MessagesPage } from '@/pages/MessagesPage'
import { HelpPage } from '@/pages/HelpPage'
import { InvoicesPage } from '@/pages/InvoicesPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { NotificationsPage } from '@/pages/NotificationsPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { PatientPortalPage } from '@/pages/PatientPortalPage'
import { PaymentSuccessPage } from '@/pages/PaymentSuccessPage'
import { PaymentCancelledPage } from '@/pages/PaymentCancelledPage'
import {
  Stethoscope, FileText, FlaskConical, MessageSquare,
  ClipboardList, HelpCircle,
} from 'lucide-react'

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/portal" element={<PatientPortalPage />} />
        <Route path="/portal/payment-success" element={<PaymentSuccessPage />} />
        <Route path="/portal/payment-cancelled" element={<PaymentCancelledPage />} />
        {/* Public video room — allows guests to join test rooms via shared link */}
        <Route path="/sala/:roomId" element={<VideoconsultaPage />} />


        {/* Protected routes */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="usuarios" element={<UsersPage />} />
          <Route path="pacientes" element={<PatientsPage />} />
          <Route path="medicos" element={<DoctorsPage />} />
          <Route path="especialidades" element={<SpecialtiesPage />} />
          <Route path="agenda" element={<AppointmentsPage />} />
          <Route path="consultas" element={<ConsultationsPage />} />
          <Route path="videollamadas" element={<VideoconsultaPage />} />
          <Route path="recetas" element={<PrescriptionsPage />} />
          <Route path="examenes" element={<ExamsPage />} />
          <Route path="historial" element={<MedicalHistoryPage />} />
          <Route path="facturacion" element={<InvoicesPage />} />
          <Route path="reportes" element={<ReportsPage />} />
          <Route path="mensajes" element={<MessagesPage />} />
          <Route path="notificaciones" element={<NotificationsPage />} />
          <Route path="configuracion" element={<SettingsPage />} />
          <Route path="ayuda" element={<HelpPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
