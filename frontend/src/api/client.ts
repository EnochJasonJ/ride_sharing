import axios from 'axios';
import { io } from 'socket.io-client';

const API_URL = 'http://localhost:5001/api';
const SOCKET_URL = 'http://localhost:5001';

export const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const socket = io(SOCKET_URL);
