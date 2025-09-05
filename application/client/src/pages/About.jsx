// pages/about.jsx
import React, { useState, useEffect, useRef } from 'react';

// Rubber Ducky Component
const RubberDucky = ({ variant = 'yellow', size = 60, animation = 'float' }) => {
  const animations = {
    float: 'animate-float',
    bounce: 'animate-bounce',
    spin: 'animate-spin',
    wiggle: 'animate-wiggle',
    dive: 'animate-dive'
  };

  const duckStyles = {
    yellow: { body: '#FFD700', beak: '#FFA500' },
    blue: { body: '#38BDF8', beak: '#0EA5E9' },
    pink: { body: '#FB7185', beak: '#F43F5E' },
    green: { body: '#4ADE80', beak: '#22C55E' },
    purple: { body: '#A78BFA', beak: '#8B5CF6' }
  };

  const style = duckStyles[variant];

  return (
    <div className={`inline-block ${animations[animation]}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Duck body */}
        <ellipse cx="50" cy="60" rx="30" ry="28" fill={style.body} />
        {/* Duck head */}
        <circle cx="50" cy="35" r="20" fill={style.body} />
        {/* Beak */}
        <path d="M30 35 L20 37 L30 39 Z" fill={style.beak} />
        {/* Eye */}
        <circle cx="42" cy="32" r="3" fill="#000" />
        <circle cx="43" cy="31" r="1" fill="#FFF" />
        {/* Wing detail */}
        <path d="M60 55 Q65 60 60 65" stroke={style.beak} strokeWidth="2" fill="none" />
        {/* Volleyball lines on body */}
        <path d="M35 60 Q50 55 65 60" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
        <path d="M35 60 Q50 65 65 60" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      </svg>
    </div>
  );
};

// Social Link Button Component
const SocialButton = ({ href, platform, children }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="social-button"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        transform: isHovered ? 'scale(1.1) rotate(5deg)' : 'scale(1)',
        background: isHovered
          ? 'linear-gradient(135deg, rgba(14, 165, 233, 0.2), rgba(139, 92, 246, 0.2))'
          : 'rgba(255, 255, 255, 0.05)',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {children}
      <span className="social-label">{platform}</span>
    </a>
  );
};

// Stat Card Component with Duck
const StatCard = ({ number, label, duckVariant, delay = 0 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      ref={cardRef}
      className={`stat-card-fun ${isVisible ? 'visible' : ''}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.9)',
        transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        transitionDelay: `${delay}ms`
      }}
    >
      <div className="stat-duck">
        <RubberDucky variant={duckVariant} size={50} animation="bounce" />
      </div>
      <div className="stat-number">{number}</div>
      <div className="stat-label-fun">{label}</div>
    </div>
  );
};

// Timeline Event Component
const TimelineEvent = ({ year, title, description, isLeft, delay = 0 }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`timeline-event ${isLeft ? 'left' : 'right'} ${isVisible ? 'visible' : ''}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible
          ? 'translateX(0)'
          : `translateX(${isLeft ? '-50px' : '50px'})`,
        transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        transitionDelay: `${delay}ms`
      }}
    >
      <div className="timeline-content">
        <div className="timeline-year">{year}</div>
        <h4>{title}</h4>
        <p>{description}</p>
      </div>
      <div className="timeline-duck">
        <RubberDucky
          variant={isLeft ? 'yellow' : 'blue'}
          size={40}
          animation="wiggle"
        />
      </div>
    </div>
  );
};

// Main About Component
export default function About() {
  const [activeDuck, setActiveDuck] = useState(null);
  const [scrollY, setScrollY] = useState(0);
  const [showSecretDucks, setShowSecretDucks] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Easter egg: Konami code for secret ducks
  useEffect(() => {
    const konami = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65];
    let progress = 0;

    const handleKeyDown = (e) => {
      if (e.keyCode === konami[progress]) {
        progress++;
        if (progress === konami.length) {
          setShowSecretDucks(true);
          setTimeout(() => setShowSecretDucks(false), 8000);
          progress = 0;
        }
      } else {
        progress = 0;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="about-container">
      <style>{`
        .about-container {
          min-height: 100vh;
          padding: var(--space-3xl) 0;
          position: relative;
          overflow: hidden;
        }

        /* Animations */
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-10px) rotate(-5deg); }
          75% { transform: translateY(10px) rotate(5deg); }
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }

        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-10deg); }
          75% { transform: rotate(10deg); }
        }

        @keyframes dive {
          0% { transform: translateY(-100px) rotate(0deg); opacity: 0; }
          50% { transform: translateY(0) rotate(180deg); opacity: 1; }
          100% { transform: translateY(0) rotate(360deg); opacity: 1; }
        }

        @keyframes swim {
          0% { transform: translateX(-100vw); }
          100% { transform: translateX(100vw); }
        }

        @keyframes swimReverse {
          0% { transform: translateX(100vw); }
          100% { transform: translateX(-100vw); }
        }

        @keyframes swimDiagonal {
          0% { transform: translate(-100vw, -100vh) rotate(0deg); }
          100% { transform: translate(100vw, 100vh) rotate(720deg); }
        }

        @keyframes swimZigzag {
          0% { transform: translateX(-100vw) translateY(0); }
          25% { transform: translateX(-25vw) translateY(-50px); }
          50% { transform: translateX(25vw) translateY(50px); }
          75% { transform: translateX(75vw) translateY(-50px); }
          100% { transform: translateX(100vw) translateY(0); }
        }

        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-bounce { animation: bounce 2s ease-in-out infinite; }
        .animate-wiggle { animation: wiggle 2s ease-in-out infinite; }
        .animate-dive { animation: dive 1s ease-out; }
        .animate-swim { animation: swim 8s linear infinite; }

        /* Hero Section */
        .hero-about {
          text-align: center;
          padding: var(--space-3xl) var(--space-xl);
          position: relative;
        }

        .hero-title-about {
          font-family: var(--font-display);
          font-size: clamp(2.5rem, 5vw, 4rem);
          background: linear-gradient(135deg, #FFD700, #FFA500, #38BDF8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: var(--space-lg);
          position: relative;
          display: inline-block;
        }

        .subtitle-fun {
          font-size: var(--text-xl);
          color: var(--text-secondary);
          margin-bottom: var(--space-2xl);
          font-style: italic;
        }

        /* Floating Ducks Background */
        .floating-ducks {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 0;
          opacity: 0.1;
        }

        .floating-duck {
          position: absolute;
          animation: float 6s ease-in-out infinite;
        }

        /* Story Section */
        .story-section {
          max-width: 800px;
          margin: var(--space-3xl) auto;
          padding: 0 var(--space-xl);
          position: relative;
          z-index: 2;
        }

        .story-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 2px solid rgba(255, 215, 0, 0.3);
          border-radius: var(--radius-xl);
          padding: var(--space-2xl);
          margin-bottom: var(--space-2xl);
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .story-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 40px rgba(255, 215, 0, 0.2);
          border-color: rgba(255, 215, 0, 0.5);
        }

        .story-card::before {
          content: '🦆';
          position: absolute;
          top: -20px;
          right: -20px;
          font-size: 100px;
          opacity: 0.05;
          transform: rotate(15deg);
        }

        .story-text {
          font-size: var(--text-lg);
          line-height: 1.8;
          color: var(--text-secondary);
          margin-bottom: var(--space-md);
        }

        .highlight {
          color: #FFD700;
          font-weight: 600;
          position: relative;
          display: inline-block;
        }

        .highlight:hover {
          animation: wiggle 0.5s ease;
        }

        /* Stats Grid */
        .stats-grid-fun {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--space-xl);
          margin: var(--space-3xl) auto;
          max-width: 1000px;
          padding: 0 var(--space-xl);
        }

        .stat-card-fun {
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(56, 189, 248, 0.1));
          border: 2px solid rgba(255, 215, 0, 0.3);
          border-radius: var(--radius-xl);
          padding: var(--space-xl);
          text-align: center;
          position: relative;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .stat-card-fun:hover {
          transform: scale(1.05) rotate(2deg);
          box-shadow: 0 15px 30px rgba(255, 215, 0, 0.3);
        }

        .stat-duck {
          margin-bottom: var(--space-md);
        }

        .stat-number {
          font-family: var(--font-display);
          font-size: var(--text-3xl);
          font-weight: 900;
          background: linear-gradient(135deg, #FFD700, #FFA500);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .stat-label-fun {
          font-size: var(--text-sm);
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-top: var(--space-sm);
        }

        /* Timeline */
        .timeline-section {
          max-width: 1200px;
          margin: var(--space-3xl) auto;
          padding: 0 var(--space-xl);
          position: relative;
        }

        .timeline-line {
          position: absolute;
          left: 50%;
          top: 100px;
          bottom: 0;
          width: 4px;
          background: linear-gradient(180deg, #FFD700, #38BDF8);
          transform: translateX(-50%);
          z-index: 0;
        }

        .timeline-event {
          display: flex;
          align-items: center;
          margin-bottom: var(--space-3xl);
          position: relative;
          z-index: 1;
          width: 100%;
        }

        .timeline-event.left {
          justify-content: flex-end;
          padding-right: calc(50% + 80px);
        }

        .timeline-event.right {
          justify-content: flex-start;
          padding-left: calc(50% + 80px);
        }

        .timeline-event.left .timeline-content {
          text-align: right;
        }

        .timeline-event.right .timeline-content {
          text-align: left;
        }

        .timeline-content {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 2px solid rgba(255, 215, 0, 0.3);
          border-radius: var(--radius-lg);
          padding: var(--space-lg);
          max-width: 450px;
          width: 100%;
          transition: all 0.3s ease;
        }

        .timeline-event:hover .timeline-content {
          transform: scale(1.05);
          box-shadow: 0 10px 25px rgba(255, 215, 0, 0.2);
        }

        .timeline-year {
          font-family: var(--font-display);
          font-size: var(--text-2xl);
          color: #FFD700;
          margin-bottom: var(--space-xs);
        }

        .timeline-duck {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          background: var(--bg-secondary);
          border-radius: 50%;
          padding: 10px;
          border: 3px solid #FFD700;
          z-index: 2;
        }

        /* Social Section */
        .social-section {
          text-align: center;
          margin: var(--space-3xl) auto;
          padding: var(--space-2xl);
          max-width: 600px;
        }

        .social-links {
          display: flex;
          justify-content: center;
          gap: var(--space-lg);
          margin-top: var(--space-xl);
        }

        .social-button {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-sm);
          padding: var(--space-md) var(--space-lg);
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 215, 0, 0.3);
          border-radius: var(--radius-lg);
          text-decoration: none;
          color: var(--text-primary);
          position: relative;
          overflow: hidden;
        }

        .social-button:hover {
          border-color: #FFD700;
        }

        .social-icon {
          width: 40px;
          height: 40px;
          fill: currentColor;
        }

        .social-label {
          font-size: var(--text-sm);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* Secret Ducks Easter Egg */
        .secret-ducks-parade {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 9999;
          pointer-events: none;
          overflow: hidden;
        }

        .secret-duck-wrapper {
          position: absolute;
          pointer-events: none;
        }

        .secret-duck-1 { animation: swim 3s linear; }
        .secret-duck-2 { animation: swimReverse 2.5s linear; }
        .secret-duck-3 { animation: swimDiagonal 4s linear; }
        .secret-duck-4 { animation: swimZigzag 3.5s linear; }
        .secret-duck-5 { animation: swim 2s linear; }

        /* Call to Action */
        .cta-section {
          text-align: center;
          padding: var(--space-3xl);
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(56, 189, 248, 0.1));
          border-radius: var(--radius-2xl);
          margin: var(--space-3xl) auto;
          max-width: 800px;
          position: relative;
          overflow: hidden;
        }

        .cta-ducks {
          display: flex;
          justify-content: center;
          gap: var(--space-md);
          margin-bottom: var(--space-xl);
        }

        .cta-title {
          font-family: var(--font-display);
          font-size: var(--text-2xl);
          margin-bottom: var(--space-md);
        }

        .cta-text {
          color: var(--text-secondary);
          margin-bottom: var(--space-xl);
        }

        .cta-button {
          display: inline-flex;
          align-items: center;
          gap: var(--space-sm);
          padding: var(--space-md) var(--space-2xl);
          background: linear-gradient(135deg, #FFD700, #FFA500);
          color: var(--ink);
          font-weight: 700;
          font-size: var(--text-lg);
          border: none;
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .cta-button:hover {
          transform: scale(1.05) rotate(-2deg);
          box-shadow: 0 10px 30px rgba(255, 215, 0, 0.4);
        }

        /* Fun Facts */
        .fun-facts {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: var(--space-lg);
          margin: var(--space-2xl) 0;
        }

        .fun-fact {
          background: rgba(255, 255, 255, 0.03);
          border-left: 4px solid #FFD700;
          padding: var(--space-md);
          border-radius: var(--radius-md);
          transition: all 0.3s ease;
        }

        .fun-fact:hover {
          background: rgba(255, 215, 0, 0.1);
          transform: translateX(10px);
        }

        .fun-fact-emoji {
          font-size: var(--text-2xl);
          margin-bottom: var(--space-xs);
        }

        .fun-fact-text {
          font-size: var(--text-sm);
          color: var(--text-secondary);
        }

        /* Responsive */
        @media (max-width: 768px) {
          .timeline-line { display: none; }
          .timeline-event { 
            padding-left: 0 !important; 
            padding-right: 0 !important;
            justify-content: flex-start !important;
          }
          .timeline-event .timeline-content { 
            text-align: left !important;
          }
          .timeline-duck { display: none; }
          .stats-grid-fun { grid-template-columns: 1fr; }
          .social-links { flex-direction: column; }
        }
      `}</style>

      {/* Floating Background Ducks */}
      <div className="floating-ducks">
        <div className="floating-duck" style={{ top: '10%', left: '5%', animationDelay: '0s' }}>
          <RubberDucky variant="yellow" size={80} animation="float" />
        </div>
        <div className="floating-duck" style={{ top: '60%', right: '10%', animationDelay: '2s' }}>
          <RubberDucky variant="blue" size={60} animation="float" />
        </div>
        <div className="floating-duck" style={{ bottom: '20%', left: '15%', animationDelay: '4s' }}>
          <RubberDucky variant="pink" size={70} animation="float" />
        </div>
      </div>

      {/* Secret Ducks Easter Egg - DUCK SWARM! */}
      {showSecretDucks && (
        <div className="secret-ducks-parade">
          {/* Generate 30 ducks at random positions with different animations */}
          {Array.from({ length: 30 }, (_, i) => {
            const colors = ['yellow', 'blue', 'pink', 'green', 'purple'];
            const animations = ['secret-duck-1', 'secret-duck-2', 'secret-duck-3', 'secret-duck-4', 'secret-duck-5'];
            const randomY = Math.random() * 90; // Random Y position (0-90% of screen height)
            const randomDelay = Math.random() * 2; // Random delay (0-2s)
            const randomSize = 40 + Math.random() * 60; // Random size (40-100px)

            return (
              <div
                key={i}
                className={`secret-duck-wrapper ${animations[i % animations.length]}`}
                style={{
                  top: `${randomY}%`,
                  animationDelay: `${randomDelay}s`,
                  zIndex: 9999 + i
                }}
              >
                <RubberDucky
                  variant={colors[i % colors.length]}
                  size={randomSize}
                  animation={i % 3 === 0 ? 'spin' : 'bounce'}
                />
              </div>
            );
          })}

          {/* Big message in the middle */}
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: 'clamp(2rem, 5vw, 4rem)',
            fontWeight: 'bold',
            color: '#FFD700',
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
            textAlign: 'center',
            zIndex: 10000,
            animation: 'bounce 1s ease-in-out'
          }}>
            DUCK INVASION! 🦆
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="hero-about">
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <RubberDucky variant="yellow" size={100} animation="bounce" />
        </div>
        <h1 className="hero-title-about">
          The Quackiest Stats App Ever! 🦆
        </h1>
        <p className="subtitle-fun">
          Where volleyball meets rubber duckies, and data becomes awesome!
        </p>
      </section>

      {/* Story Section */}
      <section className="story-section">
        <div className="story-card">
          <h2 style={{ marginBottom: 'var(--space-lg)', color: '#FFD700' }}>
            🏐 The Origin Story
          </h2>
          <p className="story-text">
            Welcome to <span className="highlight">Volley Stats</span>, a project that started
            when I was captaining a volleyball team in an adult league.
          </p>
          <p className="story-text">
            Picture this: Me, watching game recordings, initially just to
            <span className="highlight"> cheer and cringe</span> at our plays. But then something
            clicked – what if I could actually help my teammates improve with real data? 🤔
          </p>
        </div>

        <div className="story-card">
          <h3 style={{ marginBottom: 'var(--space-md)', color: '#38BDF8' }}>
            📊 From Spreadsheets to... Rubber Duckies?
          </h3>
          <p className="story-text">
            I started tracking stats to identify player strengths, weaknesses, and opportunities
            for growth. Hours of Python code, countless Excel sheets, and
            probably <span className="highlight"> too much coffee</span> later, I realized...
          </p>
          <p className="story-text">
            Why should anyone else suffer through the coding marathon I did?
            So I built <span className="highlight"> Volley Stats</span> – making analytics as fun as the
            game itself!
          </p>
          <p className="story-text">
            And yes, the rubber duckies? They're here because debugging is better
            with friends! Haha jk, it's because my first volleyball team was called "Setting Ducks"
            and I carry that spirit with me 🦆
          </p>
        </div>

        <div className="fun-facts">
          <div className="fun-fact">
            <div className="fun-fact-emoji">☕</div>
            <div className="fun-fact-text">
              Cups of chai consumed:
              <p><strong>OVER 9000!</strong></p>
            </div>
          </div>
          <div className="fun-fact">
            <div className="fun-fact-emoji">🐛</div>
            <div className="fun-fact-text">
              Bugs squashed: <strong>Too many...</strong>
              <p>(the duckies helped debug though!)</p>
            </div>
          </div>
          <div className="fun-fact">
            <div className="fun-fact-emoji">🏐</div>
            <div className="fun-fact-text">
              Volleyball games analyzed: <strong>10+</strong>
              <p>(still can't do a proper spike)</p>
            </div>
          </div>
          <div className="fun-fact">
            <div className="fun-fact-emoji">🦆</div>
            <div className="fun-fact-text">
              Duckies in my office:
              <p><strong>Not enough</strong></p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-grid-fun">
        <StatCard
          number="∞"
          label="Hours Saved"
          duckVariant="yellow"
          delay={100}
        />
        <StatCard
          number="42"
          label="Teams Using"
          duckVariant="blue"
          delay={100}
        />
        <StatCard
          number="10K+"
          label="Serves Tracked"
          duckVariant="pink"
          delay={100}
        />
        <StatCard
          number="99%"
          label="Less Frustration"
          duckVariant="green"
          delay={100}
        />
      </section>

      {/* Timeline Section */}
      <section className="timeline-section" style={{ paddingTop: 'var(--spacexgl)' }}>
        <h2 style={{
          textAlign: 'center',
          marginBottom: 'calc(var(--space-3xl)*1)',
          fontSize: 'var(--text-3xl)',
          background: 'linear-gradient(135deg, #FFD700, #38BDF8)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          The Journey 🚀
        </h2>

        <div className="timeline-line"></div>

        <TimelineEvent
          year="January 2023"
          title="The Spark ⚡"
          description="First started getting into volleyball by playing in ZogSports in the SF Bay Area!"
          isLeft={true}
          delay={100}
        />

        <TimelineEvent
          year="May 2024"
          title="Python Era 🐍"
          description="Started my Masters in Data Science and learned how to code."
          isLeft={false}
          delay={200}
        />

        <TimelineEvent
          year="May 2025"
          title="Going Public 🌟"
          description="Shared my first rendition of this as a standalone python notebook."
          isLeft={true}
          delay={300}
        />

        <TimelineEvent
          year="Present"
          title="You Are Here! 📍"
          description="Making volleyball analytics fun, one quack at a time!"
          isLeft={false}
          delay={400}
        />
      </section>

      {/* Creator Section */}
      <section className="story-section" style={{ paddingTop: 'var(--space-3xl)' }}>
        <div className="story-card" style={{ textAlign: 'center' }}>
          <h2 style={{ marginBottom: 'var(--space-lg)', color: '#FFD700' }}>
            Meet the Developer 👋
          </h2>
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <RubberDucky variant="purple" size={80} animation="wiggle" />
          </div>
          <p className="story-text">
            Hi! I'm <span className="highlight">Jasmol Dhesi</span>, a volleyball enthusiast
            who believes that data should be as fun as the game itself!
          </p>
          <p className="story-text">
            When I'm not diving for impossible saves on the court (and usually missing),
            I'm coding, analyzing game footage, or explaining to my rubber duckies why
            my serve percentage needs improvement.
          </p>
          <p className="story-text" style={{ color: 'var(--text-muted)' }}>
            "Here's to fewer hours in front of the keyboard and more on the court!" 🏐
          </p>
        </div>
      </section>

      {/* Social Section */}
      <section className="social-section">
        <h2 style={{
          marginBottom: 'var(--space-md)',
          color: '#FFD700'
        }}>
          Let's Connect! 🤝
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xl)' }}>
          Follow the journey, contribute code, or just say hi!
        </p>

        <div className="social-links">
          <SocialButton
            href="https://www.linkedin.com/in/jasmoldhesi/"
            platform="LinkedIn"
          >
            <svg className="social-icon" viewBox="0 0 24 24">
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
            </svg>
          </SocialButton>

          <SocialButton
            href="https://github.com/JasmolSD/volley-stats"
            platform="GitHub"
          >
            <svg className="social-icon" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </SocialButton>
        </div>
      </section>

      {/* Call to Action */}
      <section className="cta-section">
        <div className="cta-ducks">
          <RubberDucky variant="yellow" size={60} animation="bounce" />
          <RubberDucky variant="blue" size={60} animation="bounce" />
          <RubberDucky variant="pink" size={60} animation="bounce" />
        </div>

        <h2 className="cta-title">Ready to Make Your Stats Quack-tastic? 🦆</h2>
        <p className="cta-text">
          Join thousands of volleyball teams who've discovered that data analysis
          doesn't have to be boring. Upload your CSV, meet your duck analytics team,
          and transform your game!
        </p>

        <button
          className="cta-button"
          onClick={() => window.location.href = '/'}
        >
          <span>Start Your Analysis</span>
          <span style={{ fontSize: '1.5em' }}>🏐</span>
        </button>

        <p style={{
          marginTop: 'var(--space-xl)',
          fontSize: 'var(--text-sm)',
          color: 'var(--text-muted)',
          fontStyle: 'italic'
        }}>
          P.S. Try the Konami code (↑↑↓↓←→←→BA) for a special surprise! 🎮
        </p>
      </section>
    </div>
  );
}