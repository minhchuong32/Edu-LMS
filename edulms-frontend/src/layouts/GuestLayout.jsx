import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation, Outlet } from "react-router-dom";
import Button from "../components/common/Button";
import Footer from "../components/common/Footer";

export default function GuestLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const [activeSection, setActiveSection] = useState("top");
  const isClickingNavRef = useRef(false);

  // Smooth scroll listener for home page sections
  useEffect(() => {
    if (!isHomePage) return;

    const handleScroll = () => {
      if (isClickingNavRef.current) return;

      const scrollPosition = window.pageYOffset + 120;
      const sections = [
        { id: "top" },
        { id: "courses" },
        { id: "features" },
        { id: "roles" },
      ];

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section.id === "top") {
          if (window.pageYOffset < 300) {
            setActiveSection("top");
            break;
          }
          continue;
        }
        const element = document.getElementById(section.id);
        if (element) {
          const top = element.offsetTop;
          const height = element.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHomePage]);

  const animateScrollTo = (targetPosition, duration = 850, onComplete) => {
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    let startTime = null;

    const easeInOutCubic = (t) => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const animationStep = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      const easeProgress = easeInOutCubic(progress);

      window.scrollTo(0, startPosition + distance * easeProgress);

      if (timeElapsed < duration) {
        requestAnimationFrame(animationStep);
      } else {
        if (onComplete) onComplete();
      }
    };

    requestAnimationFrame(animationStep);
  };

  const scrollToSection = (e, id) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!isHomePage) {
      navigate("/#" + id);
      return;
    }

    setActiveSection(id);
    isClickingNavRef.current = true;

    if (id === "top") {
      animateScrollTo(0, 850, () => {
        isClickingNavRef.current = false;
      });
      return;
    }

    const element = document.getElementById(id);
    if (element) {
      const yOffset = -90;
      const targetY = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      animateScrollTo(targetY, 850, () => {
        isClickingNavRef.current = false;
      });
    } else {
      isClickingNavRef.current = false;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col font-sans selection:bg-primary selection:text-white">
      {/* STICKY PUBLIC GUEST HEADER */}
      <header className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-neutral-200/80 z-50 px-6 py-3.5 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link
            to="/"
            onClick={(e) => isHomePage && scrollToSection(e, "top")}
            className="flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary text-white font-extrabold font-outfit flex items-center justify-center text-2xl shadow-md shadow-primary/25 group-hover:scale-105 transition-transform">
              E
            </div>
            <div>
              <h1 className="font-outfit font-extrabold text-lg tracking-wide text-neutral-900 leading-none group-hover:text-primary transition-colors">
                EduLMS
              </h1>
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mt-0.5">
                Cổng Quản lý Học tập THPT
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-6 text-xs sm:text-sm font-semibold">
            {isHomePage ? (
              <>
                <a
                  href="#top"
                  onClick={(e) => scrollToSection(e, "top")}
                  className={`transition-colors hidden md:block ${
                    activeSection === "top"
                      ? "text-primary font-bold border-b-2 border-primary pb-0.5"
                      : "text-neutral-600 hover:text-primary"
                  }`}
                >
                  Giới thiệu
                </a>
                <a
                  href="#courses"
                  onClick={(e) => scrollToSection(e, "courses")}
                  className={`transition-colors hidden md:block ${
                    activeSection === "courses"
                      ? "text-primary font-bold border-b-2 border-primary pb-0.5"
                      : "text-neutral-600 hover:text-primary"
                  }`}
                >
                  Khóa học
                </a>
                <a
                  href="#features"
                  onClick={(e) => scrollToSection(e, "features")}
                  className={`transition-colors hidden md:block ${
                    activeSection === "features"
                      ? "text-primary font-bold border-b-2 border-primary pb-0.5"
                      : "text-neutral-600 hover:text-primary"
                  }`}
                >
                  Tính năng
                </a>
                <a
                  href="#roles"
                  onClick={(e) => scrollToSection(e, "roles")}
                  className={`transition-colors hidden md:block ${
                    activeSection === "roles"
                      ? "text-primary font-bold border-b-2 border-primary pb-0.5"
                      : "text-neutral-600 hover:text-primary"
                  }`}
                >
                  Phân hệ vai trò
                </a>
              </>
            ) : (
              <>
                <Link
                  to="/"
                  className="text-neutral-600 hover:text-primary transition-colors hidden sm:block"
                >
                  Trang chủ
                </Link>
                <Link
                  to="/portal"
                  className={`transition-colors hidden sm:block ${
                    location.pathname === "/portal"
                      ? "text-primary font-bold border-b-2 border-primary pb-0.5"
                      : "text-neutral-600 hover:text-primary"
                  }`}
                >
                  Cổng thông tin
                </Link>
                <Link
                  to="/guide"
                  className={`transition-colors hidden sm:block ${
                    location.pathname === "/guide"
                      ? "text-primary font-bold border-b-2 border-primary pb-0.5"
                      : "text-neutral-600 hover:text-primary"
                  }`}
                >
                  Hướng dẫn
                </Link>
                <Link
                  to="/terms"
                  className={`transition-colors hidden sm:block ${
                    location.pathname === "/terms"
                      ? "text-primary font-bold border-b-2 border-primary pb-0.5"
                      : "text-neutral-600 hover:text-primary"
                  }`}
                >
                  Điều khoản
                </Link>
              </>
            )}

            <div className="h-4 w-px bg-neutral-200 hidden sm:block"></div>

            {/* Header Login CTA Button */}
            <Button
              variant="primary"
              className="text-xs px-4 py-2 font-bold rounded-xl shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              onClick={() => navigate("/login")}
            >
              Đăng nhập ngay
            </Button>
          </div>
        </div>
      </header>

      {/* RENDER ACTIVE PUBLIC PAGE */}
      <div className="flex-1">
        <Outlet />
      </div>

      {/* COMMON FOOTER */}
      <Footer />
    </div>
  );
}
