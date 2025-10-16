import React from "react";
import Sidebar from "../Common/Navbar";
import { Outlet } from "react-router-dom";
import "./Layout.css";

const Layout = () => {
  return (
    <div className="layout-container">
      <Sidebar />
      <div className="layout-content">
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;
