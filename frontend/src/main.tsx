import { StrictMode, useReducer } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { appReducer, initialState } from './store/reducer';

function Root() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return (
    <BrowserRouter>
      <App state={state} dispatch={dispatch} />
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
