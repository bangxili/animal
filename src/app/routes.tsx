import { createBrowserRouter } from 'react-router';
import { WelcomePage } from './components/WelcomePage';
import { PetProfilePage } from './components/PetProfilePage';
import { HomePage } from './components/HomePage';
import { MyPetsPage } from './components/MyPetsPage';
import { ConsultationPage } from './components/ConsultationPage';
import { ToiletPage } from './components/ToiletPage';
import { RecipePage } from './components/RecipePage';
import { GenePage } from './components/GenePage';
import { MatchPage } from './components/MatchPage';
import { HealthPage } from './components/HealthPage';
import { SBTIPage } from './components/SBTIPage';
import { RouteErrorBoundary } from './components/RouteErrorBoundary';

export const router = createBrowserRouter([
  { path: '/', Component: WelcomePage, ErrorBoundary: RouteErrorBoundary },
  { path: '/setup', Component: PetProfilePage, ErrorBoundary: RouteErrorBoundary },
  { path: '/home', Component: HomePage, ErrorBoundary: RouteErrorBoundary },
  { path: '/my', Component: MyPetsPage, ErrorBoundary: RouteErrorBoundary },
  { path: '/consultation', Component: ConsultationPage, ErrorBoundary: RouteErrorBoundary },
  { path: '/toilet', Component: ToiletPage, ErrorBoundary: RouteErrorBoundary },
  { path: '/recipe', Component: RecipePage, ErrorBoundary: RouteErrorBoundary },
  { path: '/health', Component: HealthPage, ErrorBoundary: RouteErrorBoundary },
  { path: '/gene', Component: GenePage, ErrorBoundary: RouteErrorBoundary },
  { path: '/match', Component: MatchPage, ErrorBoundary: RouteErrorBoundary },
  { path: '/sbti', Component: SBTIPage, ErrorBoundary: RouteErrorBoundary },
]);
