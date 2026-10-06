import { BrowserRouter } from "react-router-dom";
import AuthProvider from "./context/AuthContext";
import AppRoutes from "./routes/AppRoutes";
import { Suspense } from "react";
import { Loading } from "./components/common/UI";
import AppearanceProvider from "./context/AppearanceContext";
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppearanceProvider>
          <Suspense fallback={<Loading />}>
            <AppRoutes />
          </Suspense>
        </AppearanceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
