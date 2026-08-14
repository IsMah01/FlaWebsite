import type { ReactElement } from "react";
import { Navigate, Route, Routes } from 'react-router'
import Home from './pages/Home'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import ConfirmEmail from './pages/ConfirmEmail'
import EditionDetail from './pages/EditionDetail'
import ActivityDetail from './pages/ActivityDetail'
import NewsPage from './pages/NewsPage'
import CandidateQuestionnaire from './pages/CandidateQuestionnaire'
import Login from "./pages/Login"
import NotFound from "./pages/NotFound"
import AdminDashboard from "./pages/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import InterviewBooking from "./pages/InterviewBooking";
import AdminInterviewsPage from "./pages/AdminInterviewsPage";
import AdminMiniAdminsPage from "./pages/AdminMiniAdminsPage";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import FlaInterviews from "./pages/FlaInterviews";
import ActivateCandidate from "./pages/ActivateCandidate";
import AdminCandidateInvitationsPage from "./pages/AdminCandidateInvitationsPage";
import AdminFinalAdmissionsPage from "./pages/AdminFinalAdmissionsPage";
import Edition18Results from "./pages/Edition18Results";
import FinalCandidateConfirmation from "./pages/FinalCandidateConfirmation";
import FinalCandidateProgramme from "./pages/FinalCandidateProgramme";
import FinalCandidateProfile from "./pages/FinalCandidateProfile";
import AdminFinalCandidatesPage from "./pages/AdminFinalCandidatesPage";
import AdminAttendancePage from "./pages/AdminAttendancePage";
import AttendanceCheckIn from "./pages/AttendanceCheckIn";
import ScrollManager from "./components/ScrollManager";
import { useViewerSession } from "./hooks/useViewerSession";

function CandidateOnlyPublicRoute({ children }: { children: ReactElement }) {
  const { isCandidateAccount } = useViewerSession();

  if (isCandidateAccount) {
    return <Navigate to="/candidate-questionnaire" replace />;
  }

  return children;
}

export default function App() {
  return (
    <>
      <ScrollManager />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signin" element={<SignIn />} />
        <Route
          path="/signup"
          element={
            <CandidateOnlyPublicRoute>
              <SignUp />
            </CandidateOnlyPublicRoute>
          }
        />
        <Route path="/confirm-email" element={<ConfirmEmail />} />
        <Route path="/activate-candidate" element={<ActivateCandidate />} />
        <Route path="/forgot-password" element={<ForgotPassword accountType="candidate" />} />
        <Route path="/reset-password" element={<ResetPassword accountType="candidate" />} />
        <Route path="/edition/:id" element={<EditionDetail />} />
        <Route path="/activities/:slug" element={<ActivityDetail />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/resultats/edition-18" element={<Edition18Results />} />
        <Route path="/confirmation-finale" element={<FinalCandidateConfirmation />} />
        <Route path="/espace-candidat-final" element={<FinalCandidateProgramme />} />
        <Route path="/espace-candidat-final/profil" element={<FinalCandidateProfile />} />
        <Route path="/presence/session/:token" element={<AttendanceCheckIn />} />
        <Route path="/candidate-questionnaire" element={<CandidateQuestionnaire />} />
        <Route path="/interview" element={<InterviewBooking />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/fla-interviews" element={<FlaInterviews />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/interviews" element={<AdminInterviewsPage />} />
        <Route path="/admin/mini-admins" element={<AdminMiniAdminsPage />} />
        <Route path="/admin/candidate-invitations" element={<AdminCandidateInvitationsPage />} />
        <Route path="/admin/final-admissions" element={<AdminFinalAdmissionsPage />} />
        <Route path="/admin/final-candidates" element={<AdminFinalCandidatesPage />} />
        <Route path="/admin/attendance" element={<AdminAttendancePage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/forgot-password" element={<ForgotPassword accountType="admin" />} />
        <Route path="/admin/reset-password" element={<ResetPassword accountType="admin" />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}
