import axios from 'axios';

axios.defaults.withCredentials = true;
axios.defaults.baseURL = '/api';

export const api = axios;
