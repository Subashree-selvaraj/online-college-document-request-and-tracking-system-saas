import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';

const Layout = ({ children }) => {
  const { user } = useAuth();

  return (
    <div className="app-shell d-flex flex-column min-vh-100">
      <Navbar />
      <div className="flex-grow-1">
        {user ? (
          <Container fluid className="p-0">
            <Row className="g-0">
              <Col md={3} lg={2} className="d-md-block d-none">
                <Sidebar />
              </Col>
              <Col md={9} lg={10} className="content-surface">
                <div className="fade-in-up">{children}</div>
              </Col>
            </Row>
          </Container>
        ) : (
          <div className="auth-route">{children}</div>
        )}
      </div>
    </div>
  );
};

export default Layout;