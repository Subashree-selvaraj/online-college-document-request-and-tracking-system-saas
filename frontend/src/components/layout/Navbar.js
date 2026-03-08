import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar as BootstrapNavbar, Nav, Container, Button } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import { notificationsAPI } from '../../api';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        if (!user) {
          setNotifications([]);
          setUnreadCount(0);
          return;
        }
        const res = await notificationsAPI.getNotifications();
        const list = res.data || [];
        setNotifications(list);
        setUnreadCount(list.filter(n => !n.isRead).length);
      } catch (err) {
        console.error('Error loading notifications:', err);
      }
    };

    fetchNotifications();

    if (user) {
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const toggleDropdown = () => {
    setShowDropdown(prev => !prev);
  };

  const roleLabel = () => {
    if (!user) return '';
    if (user.role === 'admin') return 'Admin';
    if (user.role === 'principal') return 'Principal';
    if (user.role === 'hod') return 'HOD';
    return 'Student';
  };

  return (
    <BootstrapNavbar expand="lg" className="topbar">
      <Container>
        <BootstrapNavbar.Brand as={Link} to="/">
          <span className="brand-pill">
            <span className="brand-dot" aria-hidden="true" />
            <span>CampusDoc</span>
          </span>
        </BootstrapNavbar.Brand>
        <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" />
        <BootstrapNavbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto">
            {user ? (
              <>
                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className="notif-bell btn btn-link p-0 me-2"
                    onClick={toggleDropdown}
                    aria-label="Notifications"
                  >
                    <i className="bi bi-bell"></i>
                    {unreadCount > 0 && (
                      <span className="notif-badge">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                  {showDropdown && (
                    <div className="notif-dropdown">
                      <div className="notif-header">
                        Notifications
                      </div>
                      {notifications.length === 0 ? (
                        <div className="notif-empty">No notifications yet.</div>
                      ) : (
                        <ul className="notif-list">
                          {notifications.slice(0, 10).map((n) => (
                            <li
                              key={n._id}
                              className={`notif-item ${n.isRead ? '' : 'unread'}`}
                            >
                              <div className="notif-title">{n.title}</div>
                              <div className="notif-message">{n.message}</div>
                              <div className="notif-time">
                                {new Date(n.createdAt).toLocaleString()}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  <Nav.Link as="span" className="text-light" style={{ opacity: 0.9 }}>
                    {roleLabel()} • {user.name}
                  </Nav.Link>
                </div>
                <Button
                  variant="outline-light"
                  size="sm"
                  className="ms-2"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Nav.Link as={Link} to="/login" className="fw-semibold" style={{ color: '#fff' }}>
                  Login
                </Nav.Link>
              </>
            )}
          </Nav>
        </BootstrapNavbar.Collapse>
      </Container>
    </BootstrapNavbar>
  );
};

export default Navbar;