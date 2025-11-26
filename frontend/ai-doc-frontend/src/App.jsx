// src/App.jsx
import React, { useState, useEffect } from "react";
import "./App.css";
import "./word.css";

import Navbar from "./components/Navbar.jsx";
import Home from "./components/home/Home.jsx";
import Footer from "./components/layout/Footer.jsx";
import PptGenerator from "./components/ppt/PptGenerator.jsx";
import WordGenerator from "./components/word/WordGenerator.jsx";
import AuthPage from "./components/auth/AuthPage.jsx";
import Dashboard from "./components/dashboard/Dashboard.jsx";

function App() {
  // which page is visible
  const [activePage, setActivePage] = useState("home");
  // logged-in user
  const [currentUser, setCurrentUser] = useState(null);

  // restore user from localStorage on first load
  useEffect(() => {
    const storedUser = localStorage.getItem("authUser");
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse authUser from localStorage", e);
      }
    }
  }, []);

  const changePage = (page) => {
    setActivePage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLogin = (user) => {
    setCurrentUser(user);
    changePage("home");
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authEmail");
    localStorage.removeItem("authUser");
    setCurrentUser(null);
    changePage("home");
  };

  // dashboard “+ New project” -> go to PPT or Word
  const handleCreateProject = (kind) => {
    if (kind === "ppt") changePage("ppt");
    else changePage("word");
  };

  return (
    <div className="app">
      <Navbar
        activePage={activePage}
        onChangePage={changePage}
        user={currentUser}
        onLogout={handleLogout}
      />

      <main className="main">
        <div className="page-container">
          {activePage === "home" && (
            <Home
              onStartPpt={() => changePage("ppt")}
              onStartWord={() => changePage("word")}
            />
          )}

          {activePage === "ppt" && (
            <section className="page page-narrow">
              <PptGenerator />
            </section>
          )}

          {activePage === "word" && (
            <section className="page page-narrow">
              <WordGenerator />
            </section>
          )}

          {activePage === "dashboard" && (
            <section className="page page-narrow">
              <Dashboard
                user={currentUser}
                onCreateProject={handleCreateProject}
              />
            </section>
          )}

          {activePage === "login" && (
            <section className="page">
              <AuthPage
                onBackHome={() => changePage("home")}
                onLogin={handleLogin}
              />
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default App;
