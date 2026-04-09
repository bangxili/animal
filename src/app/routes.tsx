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

export const router = createBrowserRouter([
  { path: '/', Component: WelcomePage },
  { path: '/setup', Component: PetProfilePage },
  { path: '/home', Component: HomePage },
  { path: '/my', Component: MyPetsPage },
  { path: '/consultation', Component: ConsultationPage },
  { path: '/toilet', Component: ToiletPage },
  { path: '/recipe', Component: RecipePage },
  { path: '/health', Component: HealthPage },
  { path: '/gene', Component: GenePage },
  { path: '/match', Component: MatchPage },
]);
