import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import HomePage from './pages/Home/HomePage';
import MenuPage from './pages/Menu/MenuPage'
import reportWebVitals from './reportWebVitals';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const root = ReactDOM.createRoot(document.getElementById('root'));

const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />
  },
  {
    path: 'menu',
    element: <MenuPage />
  }
])

root.render(
  <RouterProvider router={router} />
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
