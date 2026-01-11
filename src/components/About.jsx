import './About.css';

function About() {
    const skills = [
        { name: 'React / Node.js', level: 90 },
        { name: 'Python / Django', level: 85 },
        { name: 'PostgreSQL / MongoDB', level: 80 },
        { name: 'Docker / Kubernetes', level: 75 },
        { name: 'Fintech APIs / Banking', level: 85 },
        { name: 'Cloud (GCP / AWS)', level: 70 }
    ];

    return (
        <section id="about" className="section">
            <div className="container">
                <h2 className="section-title text-center">About Me</h2>
                <p className="section-subtitle text-center">
                    Passionate developer focused on building secure and scalable applications
                </p>

                <div className="about-content">
                    <div className="about-text glass-card">
                        <h3>Who I Am</h3>
                        <p>
                            I'm a full-stack developer with a passion for creating elegant solutions to complex problems.
                            Specialized in fintech applications and secure banking integrations using modern frameworks.
                        </p>
                        <p>
                            With experience in React, Node.js, Python, and cloud technologies, I build applications
                            that are not only functional but also beautiful and user-friendly.
                        </p>
                        <p>
                            Currently exploring Account Aggregator frameworks and open banking initiatives to
                            revolutionize how users interact with their financial data.
                        </p>
                    </div>

                    <div className="about-skills glass-card">
                        <h3>Technical Skills</h3>
                        <div className="skills-list">
                            {skills.map((skill, index) => (
                                <div key={index} className="skill-item">
                                    <div className="skill-info">
                                        <span className="skill-name">{skill.name}</span>
                                        <span className="skill-percentage">{skill.level}%</span>
                                    </div>
                                    <div className="skill-bar">
                                        <div
                                            className="skill-progress"
                                            style={{ width: `${skill.level}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default About;
