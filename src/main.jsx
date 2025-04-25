import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import React from 'react'
import ReactDOM from 'react-dom/client'

import Login from './pages/login'
import Register from './pages/register'
import Dashboard from './pages/dashboard'
import Game from './pages/game'
import QuestionEdit from './pages/question'
import PlayGame from './pages/play'
import GameManagement from './pages/game-management'
import SessionResults from './pages/session'

const router = createBrowserRouter([
  {
    path:'/',
    element:<Navigate to='/dashboard' />
  },
  {
    path:'/login',
    element:<Login />
  },
  {
    path:'/register',
    element:<Register />
  },
  {
    path:'/dashboard',
    element:<Dashboard />
  },
  {
    path:'/game/:game_id',
    element:<Game />
  },
  {
    path:'/game-management/:game_id',
    element:<GameManagement />
  },
  {
    path:'/game/:game_id/question',
    element:<QuestionEdit />
  },
  {
    path:'/game/:game_id/question/:question_id',
    element:<QuestionEdit />
  },
  {
    path:'/play/:session_id',
    element:<PlayGame />
  },
  {
    path:'/session/:session_id',
    element:<SessionResults />
  }
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
