import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AnonymousOnly, PrivateRoute } from '@/app/guards/PrivateRoute';
import { RoleRoute } from '@/app/guards/RoleRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { ControlListPage } from '@/pages/ControlListPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { LandingPage } from '@/pages/LandingPage';
import { LegalPage } from '@/pages/LegalPage';
import { LoginPage } from '@/pages/LoginPage';
import { ExchangeDetailPage } from '@/pages/ExchangeDetailPage';
import { ExchangeEditorPage } from '@/pages/ExchangeEditorPage';
import { ExchangesListPage } from '@/pages/ExchangesListPage';
import { MyLotteryPage } from '@/pages/MyLotteryPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ResendVerificationPage } from '@/pages/ResendVerificationPage';
import { VerifyEmailPage } from '@/pages/VerifyEmailPage';
import { AdminCampaignsPage } from '@/pages/admin/AdminCampaignsPage';
import { AdminPanelPage } from '@/pages/admin/AdminPanelPage';
import { AdminPasswordRequestsPage } from '@/pages/admin/AdminPasswordRequestsPage';
import { AdminUserDetailPage } from '@/pages/admin/AdminUserDetailPage';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';

export function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                <Route element={<PublicLayout />}>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/aviso-legal" element={<LegalPage />} />
                    <Route path="/verificar-email" element={<VerifyEmailPage />} />
                    <Route path="/reenviar-verificacion" element={<ResendVerificationPage />} />
                    <Route element={<AnonymousOnly />}>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/registro" element={<RegisterPage />} />
                        <Route path="/olvide-contrasena" element={<ForgotPasswordPage />} />
                    </Route>
                </Route>

                <Route element={<PrivateRoute />}>
                    <Route element={<AppLayout />}>
                        <Route path="/dashboard" element={<DashboardPage />} />
                        <Route path="/perfil" element={<ProfilePage />} />
                        <Route path="/intercambios" element={<ExchangesListPage />} />
                        <Route path="/intercambios/nuevo" element={<ExchangeEditorPage mode="create" />} />
                        <Route path="/intercambios/:id" element={<ExchangeDetailPage />} />
                        <Route path="/intercambios/:id/editar" element={<ExchangeEditorPage mode="edit" />} />
                        <Route path="/mi-loteria" element={<MyLotteryPage />} />
                        <Route path="/lista-control" element={<ControlListPage />} />
                        <Route element={<RoleRoute roles={['admin', 'superadmin']} />}>
                            <Route path="/admin" element={<AdminPanelPage />} />
                            <Route path="/admin/usuarios" element={<AdminUsersPage />} />
                            <Route path="/admin/usuarios/:id" element={<AdminUserDetailPage />} />
                            <Route path="/admin/solicitudes" element={<AdminPasswordRequestsPage />} />
                            <Route element={<RoleRoute roles={['superadmin']} />}>
                                <Route path="/admin/campanas" element={<AdminCampaignsPage />} />
                            </Route>
                        </Route>
                    </Route>
                </Route>

                <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </BrowserRouter>
    );
}
