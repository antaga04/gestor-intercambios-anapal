import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AnonymousOnly, PrivateRoute } from '@/app/guards/PrivateRoute';
import { RoleRoute } from '@/app/guards/RoleRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { ComingSoonPage } from '@/pages/ComingSoonPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { LandingPage } from '@/pages/LandingPage';
import { LegalPage } from '@/pages/LegalPage';
import { LoginPage } from '@/pages/LoginPage';
import { NewExchangePage } from '@/pages/NewExchangePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ResendVerificationPage } from '@/pages/ResendVerificationPage';
import { VerifyEmailPage } from '@/pages/VerifyEmailPage';
import { AdminCampaignsPage } from '@/pages/admin/AdminCampaignsPage';

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
                        {/* Phase 4–7 */}
                        <Route path="/intercambios" element={<ComingSoonPage title="Intercambios" />} />
                        <Route path="/intercambios/nuevo" element={<NewExchangePage />} />
                        <Route path="/intercambios/:id" element={<ComingSoonPage title="Intercambio" />} />
                        <Route
                            path="/intercambios/:id/editar"
                            element={<ComingSoonPage title="Editar intercambio" />}
                        />
                        <Route path="/mi-loteria" element={<ComingSoonPage title="Mi lotería" />} />
                        <Route path="/lista-control" element={<ComingSoonPage title="Lista de control" />} />
                        {/* Phase 9 */}
                        <Route element={<RoleRoute roles={['admin', 'superadmin']} />}>
                            <Route path="/admin" element={<ComingSoonPage title="Panel de administración" />} />
                            <Route path="/admin/usuarios" element={<ComingSoonPage title="Usuarios" />} />
                            <Route path="/admin/usuarios/:id" element={<ComingSoonPage title="Usuario" />} />
                            <Route
                                path="/admin/solicitudes"
                                element={<ComingSoonPage title="Solicitudes de contraseña" />}
                            />
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
