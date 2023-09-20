import './App.css';
import BirdName from './components/BirdName'
import PageTitle from './components/PageHeader';
import Footer from './components/Footer';
import Confetti from './components/Confetti';

function App() {
  return (
    <>
      <Confetti />
      <PageTitle />
      <BirdName />
      <Footer />
    </>
  );
}

export default App;
