import axios, { AxiosError, AxiosResponse } from 'axios';

// Use Vite environment variable in the browser instead of Node's process.env
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
axios.defaults.withCredentials = true;

const responseBody = (response: AxiosResponse) => response.data;

// Intercept responses to handle errors globally
axios.interceptors.response.use(
  async (response) => {
    return response;
  },
  (error: AxiosError<any, any>) => {
    const { data, status } = error.response!;
    switch (status) {
      case 400:
        if (data.errors) {
          const modelStateErrors: string[] = [];
          for (const key in data.errors) {
            if (data.errors[key]) {
              modelStateErrors.push(data.errors[key]);
            }
          }
          console.error('Validation errors:', modelStateErrors.flat());
        } else {
          console.error('Bad request:', data.title);
        }
        break;
      case 401:
        console.error('Unauthorized:', data.title || 'Unauthorized');
        break;
      case 403:
        console.error('Forbidden: You are not allowed to do that!');
        break;
      case 500:
        console.error('Server Error:', data.title || 'Server Error!');
        break;
      default:
        console.error('An unexpected error occurred.');
        break;
    }
    return Promise.reject(error.response);
  }
);

const requests = {
  get: (url: string, params?: URLSearchParams) =>
    axios.get(url, { params }).then(responseBody),
  post: (url: string, body: {}) => axios.post(url, body).then(responseBody),
  put: (url: string, body: {}) => axios.put(url, body).then(responseBody),
  delete: (url: string) => axios.delete(url).then(responseBody),
};

const Search = {
  global: (query: string) =>
    requests.get('search/global', new URLSearchParams({ query })),
  local: (query: string) =>
    requests.get('search/local', new URLSearchParams({ query })),
  drift: (query: string) =>
    requests.get('search/drift', new URLSearchParams({ query })),
};

const Chat = {
  // Edit the cover letter via chat (calls root API)
  editCoverLetter: (payload: {}) => requests.post('cover-letter/edit', payload),
};

const Status = {
  // Health check against root API
  check: () => requests.get('status'),
};

const agent = {
  Search,
  Chat,
  Status,
};

export default agent;