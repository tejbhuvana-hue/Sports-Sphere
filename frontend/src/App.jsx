import React from 'react';
import { useEffect } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';

import { PublicLayout } from './layouts/PublicLayout';
import { MainLayout } from './layouts/MainLayout';

// Public Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { PasswordResetPage } from './pages/PasswordResetPage';
import { BlogsPage } from './pages/BlogsPage';
import { BlogDetailPage } from './pages/BlogDetailPage';
import { ContactPage } from './pages/ContactPage';

// Authenticated App Pages
import { HomePage } from './pages/HomePage';
import { FeedPage } from './pages/FeedPage';
import { ExplorePage } from './pages/ExplorePage';
import { SearchPage } from './pages/SearchPage';
import { ProfilePage } from './pages/ProfilePage';
import { ProfileEditPage } from './pages/ProfileEditPage';
import { FollowListPage } from './pages/FollowListPage';
import { MessagesPage } from './pages/MessagesPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { TournamentsPage } from './pages/TournamentsPage';
import { TournamentDetailPage } from './pages/TournamentDetailPage';
import { RecruitmentPage } from './pages/RecruitmentPage';
import { ClubDashboardPage } from './pages/ClubDashboardPage';
import { SponsorshipsPage } from './pages/SponsorshipsPage';
import { SponsorDashboardPage } from './pages/SponsorDashboardPage';
import { PlayerSponsorshipsPage } from './pages/PlayerSponsorshipsPage';
import { SettingsPage } from './pages/SettingsPage';
import { SavedPage } from './pages/SavedPage';
import { useAuth } from './context/AuthContext';

// Smart Home Route: renders HomePage if authenticated, LandingPage if guest
const SmartHomeRoute = () => {
  const { user, token, isLoading } = useAuth();
  if (isLoading) {
    return <div className="page-loading" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading SportsSphere...</div>;
  }
  if (user && token) {
    return (
      <MainLayout>
        <HomePage />
      </MainLayout>
    );
  }
  return (
    <PublicLayout>
      <LandingPage />
    </PublicLayout>
  );
};

// Custom Super Admin Pages
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

// Mobile Push Notification Integration
import { PushNotificationHandler } from './components/PushNotificationHandler';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          {/* Push notification registration and tap listener */}
          <PushNotificationHandler />
          <Routes>
            {/* Smart Root Route: Home dashboard for users, Landing for guests */}
            <Route path="/" element={<SmartHomeRoute />} />

            {/* Public Website Layout */}
            <Route element={<PublicLayout />}>
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/password-reset" element={<PasswordResetPage />} />
              <Route path="/blogs" element={<BlogsPage />} />
              <Route path="/blogs/:slug" element={<BlogDetailPage />} />
              <Route path="/contact" element={<ContactPage />} />
            </Route>

            {/* Authenticated Application Layout */}
            <Route
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/home" element={<HomePage />} />
              <Route path="/feed" element={<FeedPage />} />
              <Route path="/saved" element={<SavedPage />} />
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/profile/:username" element={<ProfilePage />} />
              <Route path="/profile/edit" element={<ProfileEditPage />} />
              <Route path="/followers/:username" element={<FollowListPage type="followers" />} />
              <Route path="/following/:username" element={<FollowListPage type="following" />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/tournaments" element={<TournamentsPage />} />
              <Route path="/tournaments/:tournamentId" element={<TournamentDetailPage />} />
              <Route path="/recruitment" element={<RecruitmentPage />} />
              <Route path="/club/dashboard" element={<ClubDashboardPage />} />
              <Route path="/sponsorships" element={<SponsorshipsPage />} />
              <Route path="/sponsorships/dashboard" element={<SponsorDashboardPage />} />
              <Route path="/sponsorships/my-applications" element={<PlayerSponsorshipsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* Full-width Messages Page */}
            <Route
              element={
                <ProtectedRoute>
                  <MainLayout hideRightSidebar={true} />
                </ProtectedRoute>
              }
            >
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/messages/:username" element={<MessagesPage />} />
            </Route>

            {/* Custom Admin Section */}
            <Route path="/admin-login" element={<AdminLoginPage />} />
            <Route
              path="/admin-dashboard"
              element={
                <AdminRoute>
                  <AdminDashboardPage />
                </AdminRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
