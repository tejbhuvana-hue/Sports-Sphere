import React from 'react';
import { Outlet } from 'react-router-dom';
import { PublicNavbar } from '../components/PublicNavbar';
import { Footer } from '../components/Footer';

export const PublicLayout = () => {
  return (
    <div className="app-container">
      <PublicNavbar />
      <div className="public-layout" style={{ paddingTop: 'calc(70px + var(--safe-top))' }}>
        <Outlet />
      </div>
      <Footer />
    </div>
  );
};
