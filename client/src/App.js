import './App.css';
import BirdNameSection from './components/BirdNameSection'
import PageTitle from './components/PageHeader';
import Footer from './components/Footer';
import Confetti from './components/Confetti';

function App() {
  return (
    <>
      <Confetti />
      <PageTitle />
      <BirdNameSection />
      <Footer />
    </>
  );
}

export default App;
