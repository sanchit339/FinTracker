import './Projects.css';

function Projects() {
    const projects = [
        {
            title: 'Banking Portfolio Dashboard',
            description: 'A secure banking dashboard with Gmail integration for automated transaction tracking from bank emails.',
            tags: ['React', 'Node.js', 'PostgreSQL', 'Gmail API'],
            github: '#',
            demo: '#'
        },
        {
            title: 'E-Commerce Platform',
            description: 'Full-stack e-commerce solution with payment gateway integration and inventory management.',
            tags: ['Next.js', 'MongoDB', 'Stripe', 'AWS'],
            github: '#',
            demo: '#'
        },
        {
            title: 'Task Management System',
            description: 'Collaborative task management tool with real-time updates and team collaboration features.',
            tags: ['React', 'Firebase', 'Material-UI'],
            github: '#',
            demo: '#'
        },
        {
            title: 'API Analytics Dashboard',
            description: 'Real-time analytics dashboard for monitoring API performance and usage metrics.',
            tags: ['Vue.js', 'Express', 'Redis', 'Chart.js'],
            github: '#',
            demo: '#'
        }
    ];

    return (
        <section id="projects" className="section">
            <div className="container">
                <h2 className="section-title text-center">Featured Projects</h2>
                <p className="section-subtitle text-center">
                    A selection of my recent work and side projects
                </p>

                <div className="projects-grid">
                    {projects.map((project, index) => (
                        <div key={index} className="project-card glass-card">
                            <div className="project-header">
                                <h3>{project.title}</h3>
                            </div>

                            <p className="project-description">{project.description}</p>

                            <div className="project-tags">
                                {project.tags.map((tag, i) => (
                                    <span key={i} className="tag">{tag}</span>
                                ))}
                            </div>

                            <div className="project-links">
                                <a href={project.github} className="btn btn-secondary btn-sm">
                                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.430.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                    </svg>
                                    GitHub
                                </a>
                                <a href={project.demo} className="btn btn-primary btn-sm">
                                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm-1 17v-10l9 5.146-9 4.854z" />
                                    </svg>
                                    Live Demo
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default Projects;
