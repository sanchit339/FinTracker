import { useEffect, useState } from 'react';
import './Landing.css';

function Landing() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    return (
        <section id="home" className="section landing">
            <div className="container">
                <div className={`landing-content ${isVisible ? 'animate-fade-in-up' : ''}`}>
                    <div className="hero-badge">
                        <span className="badge-dot"></span>
                        <span>Available for Opportunities</span>
                    </div>

                    <h1 className="hero-title">
                        Hi, I'm <span className="text-gradient">Your Name</span>
                    </h1>

                    <h2 className="hero-subtitle">
                        Full Stack Developer & Fintech Enthusiast
                    </h2>

                    <p className="hero-description">
                        Building modern web applications with cutting-edge technologies.
                        Specialized in fintech integrations and secure banking solutions.
                    </p>

                    <div className="hero-actions">
                        <a href="#projects" className="btn btn-primary btn-lg">
                            View My Work
                        </a>
                        <a href="#contact" className="btn btn-secondary btn-lg">
                            Get In Touch
                        </a>
                    </div>

                    <div className="hero-stats">
                        <div className="stat">
                            <div className="stat-value">3+</div>
                            <div className="stat-label">Years Experience</div>
                        </div>
                        <div className="stat">
                            <div className="stat-value">50+</div>
                            <div className="stat-label">Projects Completed</div>
                        </div>
                        <div className="stat">
                            <div className="stat-value">100%</div>
                            <div className="stat-label">Client Satisfaction</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating particles */}
            <div className="particles">
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
            </div>
        </section>
    );
}

export default Landing;
