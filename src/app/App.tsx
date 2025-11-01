import { RouterProvider } from 'react-router-dom';
import { Router } from './router';
import './styles/global.css'

const App = () => {
    return (
        <RouterProvider router={Router} />
    );
};

export default App;