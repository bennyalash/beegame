import { useNavigate } from 'react-router-dom';

export function Home({ logout }) {
    const navigate = useNavigate();

    return (
        <div className="auth-buttons">
            <h1>Go Bee</h1>
            <button onClick={() => navigate('/game')}>Pass + Play</button>
           {/* <button onClick={() => navigate('/friends')}>Online</button>
            <button onClick={() => navigate('/settings')}>Settings</button>*/}
            <button onClick={() => logout()}>Logout</button>
        </div>
    );
}
