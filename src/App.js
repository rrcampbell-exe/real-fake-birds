import './App.css';
import BirdName from './client/components/BirdName.js'
import PageTitle from './client/components/PageHeader';
import styled from 'styled-components'

const AppWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  width: 100%;
`

function App() {
  return (
    <AppWrapper>
      <PageTitle />
      <BirdName />
    </AppWrapper>
  );
}

export default App;
