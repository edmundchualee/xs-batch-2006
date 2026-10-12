import { Link, NavLink } from 'react-router-dom';

export function Header() {
  return (
    <header className="top">
      <div className="wrap">
        <Link to="/" className="logo">
          <img src="/xs-seal.png" alt="" />
          <span>XS · MMVI</span>
        </Link>
        <nav aria-label="Main">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/events">Events</NavLink>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer>
      <div className="wrap">
        <span>Xavier School Batch 2006 · A batch-run alumni site, not an official school website.</span>
        <Link to="/committee">Committee</Link>
      </div>
    </footer>
  );
}

export function Spinner() {
  return <div className="spinner" role="status" aria-label="Loading" />;
}
