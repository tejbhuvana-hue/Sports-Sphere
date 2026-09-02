import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { LeftSidebar } from '../components/LeftSidebar';
import { RightSidebar } from '../components/RightSidebar';
import { MobileTopBar } from '../components/mobile/MobileTopBar';
import { MobileBottomNav } from '../components/mobile/MobileBottomNav';
import { MobileMoreMenu } from '../components/mobile/MobileMoreMenu';
import { CreatePostModal } from '../components/mobile/CreatePostModal';

export const MainLayout = ({ children, hideRightSidebar = false }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const location = useLocation();
  const isFeedPage = location.pathname === '/feed';

  const handlePostCreated = (newPost) => {
    // Dispatch custom window event so FeedPage or ExplorePage can prepend new post
    window.dispatchEvent(new CustomEvent('sports_sphere_new_post', { detail: newPost }));
  };

  return (
    <div className={`app-container ${isFeedPage ? 'app-container-feed' : ''}`}>
      {/* Mobile Top Bar (visible on <= 768px) */}
      <MobileTopBar onOpenCreatePost={() => setCreatePostOpen(true)} />

      {/* Desktop Top Navbar (visible on > 768px) */}
      <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className={`main-layout ${isFeedPage ? 'main-layout-feed' : ''}`}>
        {/* Left Sidebar (Desktop fixed, Tablet drawer) */}
        <LeftSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content Area */}
        <main className="main-content" id="main-content-scroll">
          {children || <Outlet />}
        </main>

        {/* Right Sidebar (Desktop only) */}
        {!hideRightSidebar && <RightSidebar />}
      </div>

      {/* Mobile Bottom Navigation (visible on <= 768px) */}
      <MobileBottomNav
        onToggleMore={() => setMoreMenuOpen((prev) => !prev)}
        isMoreOpen={moreMenuOpen}
      />

      {/* Mobile More Drawer Menu */}
      <MobileMoreMenu
        isOpen={moreMenuOpen}
        onClose={() => setMoreMenuOpen(false)}
      />

      {/* Mobile Create Post Modal */}
      <CreatePostModal
        isOpen={createPostOpen}
        onClose={() => setCreatePostOpen(false)}
        onPostCreated={handlePostCreated}
      />
    </div>
  );
};
