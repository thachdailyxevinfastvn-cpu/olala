// src/api/axiosClient.js
import axios from 'axios';
import { API_URL } from './constants';

const axiosClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'text/plain;charset=utf-8',
  },
});

axiosClient.interceptors.response.use(
  (response) => {
    if (response && response.data) {
      return response.data;
    }
    return response;
  },
  (error) => {
    throw error;
  }
);

export const sendRequest = async (action, data = {}) => {
  try {
    const payload = JSON.stringify({ action, ...data });
    const response = await axiosClient.post('', payload);
    return response;
  } catch (error) {
    throw error;
  }
};

export default axiosClient;