<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Candy AI - AI-Powered Kanban for Backlog Management</title>
    <meta name="description" content="Transform your project management with Candy AI's intelligent kanban boards. AI agents help prioritize, organize, and clear backlogs 3x faster than traditional tools.">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --color-primary: #2563eb;
            --color-secondary: #64748b;
            --color-accent: #f59e0b;
            --color-background: #ffffff;
            --color-surface: #f8fafc;
            --color-text-primary: #0f172a;
            --color-text-secondary: #475569;
            --font-display: 'Inter', sans-serif;
            --font-body: 'Inter', sans-serif;
            --border-radius: 8px;
            --shadow-subtle: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
            --spacing-xs: 0.25rem;
            --spacing-sm: 0.5rem;
            --spacing-md: 1rem;
            --spacing-lg: 1.5rem;
            --spacing-xl: 2rem;
            --spacing-2xl: 3rem;
            --spacing-3xl: 4rem;
            --spacing-4xl: 6rem;
            --spacing-5xl: 8rem;
        }

        * {
            box-sizing: border-box;
        }

        html {
            scroll-behavior: smooth;
        }

        body {
            margin: 0;
            padding: 0;
            font-family: var(--font-body);
            font-size: 16px;
            line-height: 1.6;
            color: var(--color-text-primary);
            background-color: var(--color-background);
        }

        .skip-to-content {
            position: absolute;
            top: -40px;
            left: 6px;
            background: var(--color-primary);
            color: white;
            padding: var(--spacing-sm) var(--spacing-md);
            z-index: 1000;
            text-decoration: none;
            border-radius: var(--border-radius);
        }

        .skip-to-content:focus {
            top: 6px;
        }

        /* Navigation */
        .header {
            background: var(--color-background);
            border-bottom: 1px solid #e2e8f0;
            position: sticky;
            top: 0;
            z-index: 100;
            transition: transform 0.3s ease;
        }

        .nav-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 var(--spacing-md);
            display: flex;
            justify-content: space-between;
            align-items: center;
            height: 80px;
        }

        .logo {
            display: flex;
            align-items: center;
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--color-primary);
            text-decoration: none;
        }

        .logo-icon {
            width: 32px;
            height: 32px;
            margin-right: var(--spacing-sm);
        }

        .nav-links {
            display: none;
            list-style: none;
            margin: 0;
            padding: 0;
            align-items: center;
            gap: var(--spacing-xl);
        }

        .nav-links a {
            color: var(--color-text-secondary);
            text-decoration: none;
            font-weight: 500;
            transition: color 0.2s ease;
        }

        .nav-links a:hover,
        .nav-links a:focus-visible {
            color: var(--color-primary);
        }

        .nav-cta {
            background: var(--color-primary);
            color: white;
            padding: var(--spacing-sm) var(--spacing-md);
            border-radius: var(--border-radius);
            text-decoration: none;
            font-weight: 600;
            transition: background-color 0.2s ease;
            min-height: 44px;
            display: flex;
            align-items: center;
        }

        .nav-cta:hover,
        .nav-cta:focus-visible {
            background: #1d4ed8;
        }

        .mobile-menu-toggle {
            display: block;
            background: none;
            border: none;
            padding: var(--spacing-sm);
            cursor: pointer;
            min-height: 44px;
            min-width: 44px;
        }

        .mobile-menu {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: var(--color-background);
            border-bottom: 1px solid #e2e8f0;
            transform: translateY(-100%);
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        }

        .mobile-menu.active {
            transform: translateY(0);
            opacity: 1;
            visibility: visible;
        }

        .mobile-nav-links {
            list-style: none;
            margin: 0;
            padding: var(--spacing-md);
        }

        .mobile-nav-links li {
            margin-bottom: var(--spacing-md);
        }

        .mobile-nav-links a {
            display: block;
            padding: var(--spacing-md);
            color: var(--color-text-secondary);
            text-decoration: none;
            font-weight: 500;
            min-height: 44px;
            display: flex;
            align-items: center;
        }

        .mobile-nav-links a:hover,
        .mobile-nav-links a:focus-visible {
            background: var(--color-surface);
            color: var(--color-primary);
        }

        /* Hero Section */
        .hero {
            padding: var(--spacing-4xl) var(--spacing-md);
            text-align: center;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        }

        .hero-container {
            max-width: 900px;
            margin: 0 auto;
        }

        .hero h1 {
            font-size: clamp(2rem, 5vw, 3.5rem);
            font-weight: 700;
            line-height: 1.2;
            margin: 0 0 var(--spacing-lg) 0;
            color: var(--color-text-primary);
        }

        .hero-subheadline {
            font-size: clamp(1.125rem, 2.5vw, 1.5rem);
            color: var(--color-text-secondary);
            margin-bottom: var(--spacing-xl);
        }

        .hero-body {
            font-size: 1.125rem;
            color: var(--color-text-secondary);
            margin-bottom: var(--spacing-2xl);
        }

        .hero-cta {
            background: var(--color-primary);
            color: white;
            padding: var(--spacing-md) var(--spacing-2xl);
            border-radius: var(--border-radius);
            text-decoration: none;
            font-weight: 600;
            font-size: 1.125rem;
            transition: background-color 0.2s ease;
            display: inline-block;
            min-height: 44px;
            line-height: 1;
        }

        .hero-cta:hover,
        .hero-cta:focus-visible {
            background: #1d4ed8;
        }

        /* Section Styles */
        .section {
            padding: var(--spacing-4xl) var(--spacing-md);
        }

        .section-container {
            max-width: 1200px;
            margin: 0 auto;
        }

        .section-header {
            text-align: center;
            margin-bottom: var(--spacing-3xl);
        }

        .section-header h2 {
            font-size: clamp(2rem, 4vw, 2.5rem);
            font-weight: 700;
            margin: 0 0 var(--spacing-md) 0;
            color: var(--color-text-primary);
        }

        .section-subheadline {
            font-size: clamp(1.125rem, 2.5vw, 1.25rem);
            color: var(--color-text-secondary);
            margin-bottom: var(--spacing-lg);
        }

        .section-body {
            font-size: 1.125rem;
            color: var(--color-text-secondary);
            max-width: 600px;
            margin: 0 auto;
        }

        /* How It Works */
        .how-it-works {
            background: var(--color-surface);
        }

        .steps-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: var(--spacing-2xl);
        }

        .step {
            text-align: center;
            padding: var(--spacing-xl);
            background: var(--color-background);
            border-radius: var(--border-radius);
            box-shadow: var(--shadow-subtle);
        }

        .step-icon {
            width: 64px;
            height: 64px;
            margin: 0 auto var(--spacing-lg) auto;
            background: var(--color-primary);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .step h3 {
            font-size: 1.5rem;
            font-weight: 600;
            margin: 0 0 var(--spacing-md) 0;
            color: var(--color-text-primary);
        }

        .step p {
            color: var(--color-text-secondary);
            margin: 0;
        }

        /* Features */
        .features-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: var(--spacing-xl);
        }

        .feature {
            padding: var(--spacing-xl);
            background: var(--color-background);
            border-radius: var(--border-radius);
            border: 1px solid #e2e8f0;
        }

        .feature-icon {
            width: 48px;
            height: 48px;
            margin-bottom: var(--spacing-md);
            background: var(--color-accent);
            border-radius: var(--border-radius);
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .feature h3 {
            font-size: 1.25rem;
            font-weight: 600;
            margin: 0 0 var(--spacing-sm) 0;
            color: var(--color-text-primary);
        }

        .feature p {
            color: var(--color-text-secondary);
            margin: 0;
        }

        /* Stats */
        .stats {
            background: var(--color-primary);
            color: white;
        }

        .stats .section-header h2,
        .stats .section-subheadline {
            color: white;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: var(--spacing-xl);
        }

        .stat {
            text-align: center;
            padding: var(--spacing-xl);
        }

        .stat-number {
            font-size: clamp(2.5rem, 6vw, 4rem);
            font-weight: 700;
            margin-bottom: var(--spacing-sm);
            color: var(--color-accent);
        }

        .stat-description {
            font-size: 1.125rem;
            opacity: 0.9;
        }

        /* Testimonials */
        .testimonials {
            background: var(--color-surface);
        }

        .testimonials-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: var(--spacing-xl);
        }

        .testimonial {
            padding: var(--spacing-xl);
            background: var(--color-background);
            border-radius: var(--border-radius);
            box-shadow: var(--shadow-subtle);
        }

        .testimonial-content {
            font-size: 1.125rem;
            color: var(--color-text-secondary);
            margin-bottom: var(--spacing-lg);
            font-style: italic;
        }

        .testimonial-author {
            font-weight: 600;
            color: var(--color-text-primary);
        }

        /* Pricing */
        .pricing-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: var(--spacing-xl);
        }

        .pricing-card {
            padding: var(--spacing-2xl);
            background: var(--color-background);
            border-radius: var(--border-radius);
            border: 1px solid #e2e8f0;
            text-align: center;
            position: relative;
        }

        .pricing-card.featured {
            border-color: var(--color-primary);
            transform: scale(1.02);
        }

        .pricing-icon {
            width: 48px;
            height: 48px;
            margin: 0 auto var(--spacing-lg) auto;
            background: var(--color-primary);
            border-radius: var(--border-radius);
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .pricing-title {
            font-size: 1.5rem;
            font-weight: 600;
            margin: 0 0 var(--spacing-md) 0;
            color: var(--color-text-primary);
        }

        .pricing-description {
            color: var(--color-text-secondary);
            margin-bottom: var(--spacing-xl);
        }

        .pricing-cta {
            background: var(--color-primary);
            color: white;
            padding: var(--spacing-md) var(--spacing-xl);
            border-radius: var(--border-radius);
            text-decoration: none;
            font-weight: 600;
            transition: background-color 0.2s ease;
            display: inline-block;
            min-height: 44px;
        }

        .pricing-cta:hover,
        .pricing-cta:focus-visible {
            background: #1d4ed8;
        }

        /* CTA Section */
        .cta-section {
            background: var(--color-accent);
            color: var(--color-text-primary);
            text-align: center;
        }

        .cta-section h2 {
            color: var(--color-text-primary);
        }

        .cta-section .section-subheadline,
        .cta-section .section-body {
            color: var(--color-text-secondary);
        }

        .cta-button {
            background: var(--color-primary);
            color: white;
            padding: var(--spacing-lg) var(--spacing-2xl);
            border-radius: var(--border-radius);
            text-decoration: none;
            font-weight: 600;
            font-size: 1.125rem;
            transition: background-color 0.2s ease;
            display: inline-block;
            min-height: 44px;
        }

        .cta-button:hover,
        .cta-button:focus-visible {
            background: #1d4ed8;
        }

        /* Footer */
        .footer {
            background: var(--color-text-primary);
            color: white;
            padding: var(--spacing-3xl) var(--spacing-md) var(--spacing-xl) var(--spacing-md);
        }

        .footer-container {
            max-width: 1200px;
            margin: 0 auto;
        }

        .footer-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: var(--spacing-xl);
            margin-bottom: var(--spacing-xl);
        }

        .footer-column h4 {
            font-size: 1.125rem;
            font-weight: 600;
            margin: 0 0 var(--spacing-md) 0;
        }

        .footer-column p {
            color: #94a3b8;
            margin: 0;
        }

        .footer-links {
            list-style: none;
            margin: 0;
            padding: 0;
        }

        .footer-links li {
            margin-bottom: var(--spacing-sm);
        }

        .footer-links a {
            color: #94a3b8;
            text-decoration: none;
            transition: color 0.2s ease;
        }

        .footer-links a:hover,
        .footer-links a:focus-visible {
            color: white;
        }

        .footer-bottom {
            border-top: 1px solid #334155;
            padding-top: var(--spacing-xl);
            text-align: center;
            color: #94a3b8;
        }

        /* Back to Top Button */
        .back-to-top {
            position: fixed;
            bottom: var(--spacing-xl);
            right: var(--spacing-xl);
            background: var(--color-primary);
            color: white;
            border: none;
            border-radius: 50%;
            width: 56px;
            height: 56px;
            cursor: pointer;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
            z-index: 100;
        }

        .back-to-top.visible {
            opacity: 1;
            visibility: visible;
        }

        .back-to-top:hover,
        .back-to-top:focus-visible {
            background: #1d4ed8;
            transform: translateY(-2px);
        }

        /* Contact Form */
        .contact-form {
            max-width: 600px;
            margin: var(--spacing-2xl) auto 0 auto;
            padding: var(--spacing-2xl);
            background: var(--color-background);
            border-radius: var(--border-radius);
            box-shadow: var(--shadow-subtle);
        }

        .form-group {
            margin-bottom: var(--spacing-lg);
        }

        .form-group label {
            display: block;
            margin-bottom: var(--spacing-sm);
            font-weight: 600;
            color: var(--color-text-primary);
        }

        .form-group input,
        .form-group textarea {
            width: 100%;
            padding: var(--spacing-md);
            border: 1px solid #d1d5db;
            border-radius: var(--border-radius);
            font-size: 16px;
            transition: border-color 0.2s ease;
        }

        .form-group input:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: var(--color-primary);
        }

        .form-group textarea {
            resize: vertical;
            min-height: 120px;
        }

        .form-error {
            color: #ef4444;
            font-size: 0.875rem;
            margin-top: var(--spacing-xs);
            display: none;
        }

        .form-submit {
            background: var(--color-primary);
            color: white;
            border: none;
            padding: var(--spacing-md) var(--spacing-2xl);
            border-radius: var(--border-radius);
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: background-color 0.2s ease;
            min-height: 44px;
        }

        .form-submit:hover,
        .form-submit:focus-visible {
            background: #1d4ed8;
        }

        /* Focus styles */
        *:focus-visible {
            outline: 2px solid var(--color-primary);
            outline-offset: 2px;
        }

        /* Animations */
        .fade-in {
            opacity: 0;
            transform: translateY(20px);
            transition: opacity 0.6s ease, transform 0.6s ease;
        }

        .fade-in.visible {
            opacity: 1;
            transform: translateY(0);
        }

        /* Responsive Design */
        @media (max-width: 319px) {
            .section {
                padding: var(--spacing-xl) var(--spacing-sm);
            }
            .nav-container {
                padding: 0 var(--spacing-sm);
            }
            .hero {
                padding: var(--spacing-xl) var(--spacing-sm);
            }
        }

        @media (min-width: 768px) {
            .nav-links {
                display: flex;
            }

            .mobile-menu-toggle {
                display: none;
            }

            .steps-grid {
                grid-template-columns: repeat(3, 1fr);
            }

            .features-grid {
                grid-template-columns: repeat(2, 1fr);
            }

            .stats-grid {
                grid-template-columns: repeat(2, 1fr);
            }

            .testimonials-grid {
                grid-template-columns: 1fr;
            }

            .pricing-grid {
                grid-template-columns: repeat(3, 1fr);
            }

            .footer-grid {
                grid-template-columns: repeat(3, 1fr);
            }
        }

        @media (min-width: 1024px) {
            .stats-grid {
                grid-template-columns: repeat(4, 1fr);
            }

            .features-grid {
                grid-template-columns: repeat(3, 1fr);
            }
        }
    </style>
</head>
<body>
    <a href="#main-content" class="skip-to-content">Skip to content</a>
    
    <header class="header">
        <div class="nav-container">
            <a href="#" class="logo" aria-label="Candy AI home">
                <svg class="logo-icon" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
                    <rect x="4" y="8" width="8" height="8" rx="2"/>
                    <rect x="14" y="8" width="8" height="8" rx="2"/>
                    <rect x="24" y="8" width="4" height="8" rx="2"/>
                    <rect x="4" y="18" width="4" height="8" rx="2"/>
                    <rect x="10" y="18" width="8" height="8" rx="2"/>
                    <rect x="20" y="18" width="8" height="8" rx="2"/>
                </svg>
                Candy AI
            </a>
            
            <nav role="navigation" aria-label="Main navigation">
                <ul class="nav-links">
                    <li><a href="#how-it-works">How It Works</a></li>
                    <li><a href="#features">Features</a></li>
                    <li><a href="#pricing">Pricing</a></li>
                    <li><a href="#testimonials">Customers</a></li>
                    <li><a href="#contact">Contact</a></li>
                    <li><a href="#pricing" class="nav-cta">Start Free Trial</a></li>
                </ul>
            </nav>

            <button class="mobile-menu-toggle" aria-expanded="false" aria-controls="mobile-menu" aria-label="Toggle mobile menu">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <rect x="3" y="6" width="18" height="2"/>
                    <rect x="3" y="11" width="18" height="2"/>
                    <rect x="3" y="16" width="18" height="2"/>
                </svg>
            </button>

            <div class="mobile-menu" id="mobile-menu">
                <ul class="mobile-nav-links">
                    <li><a href="#how-it-works">How It Works</a></li>
                    <li><a href="#features">Features</a></li>
                    <li><a href="#pricing">Pricing</a></li>
                    <li><a href="#testimonials">Customers</a></li>
                    <li><a href="#contact">Contact</a></li>
                </ul>
            </div>
        </div>
    </header>

    <main id="main-content">
        <section class="hero">
            <div class="hero-container">
                <h1>Stop drowning in backlogs. Start shipping with AI.</h1>
                <p class="hero-subheadline">Candy AI transforms your chaotic project backlogs into organized, actionable kanban boards with intelligent agents that prioritize, categorize, and guide your team to completion.</p>
                <p class="hero-body">Join over 2,000 teams who've reduced their backlog clearing time by 73% using AI-powered project management. No more endless grooming sessions or lost priorities.</p>
                <a href="#pricing" class="hero-cta">Try Candy AI Free</a>
            </div>
        </section>

        <section id="how-it-works" class="section how-it-works">
            <div class="section-container">
                <div class="section-header">
                    <h2>How Candy AI clears your backlogs</h2>
                    <p class="section-subheadline">Three simple steps to transform overwhelming backlogs into manageable workflows</p>
                    <p class="section-body">Our AI agents work alongside your team to intelligently organize, prioritize, and guide backlog items through completion using advanced kanban methodology.</p>
                </div>
                
                <div class="steps-grid">
                    <div class="step fade-in">
                        <div class="step-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14,2 14,8 20,8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                                <polyline points="10,9 9,9 8,9"/>
                            </svg>
                        </div>
                        <h3>Import & Analyze</h3>
                        <p>Upload your existing backlog from any tool. Our AI analyzes each item for complexity, dependencies, and business value to create intelligent groupings.</p>
                    </div>
                    
                    <div class="step fade-in">
                        <div class="step-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                                <circle cx="12" cy="12" r="3"/>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                            </svg>
                        </div>
                        <h3>AI-Powered Organization</h3>
                        <p>Smart agents automatically categorize items, suggest priorities, identify blockers, and create optimal kanban columns tailored to your workflow.</p>
                    </div>
                    
                    <div class="step fade-in">
                        <div class="step-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12,6 12,12 16,14"/>
                                <path d="m9 12 2 2 4-4"/>
                            </svg>
                        </div>
                        <h3>Guided Execution</h3>
                        <p>AI agents provide real-time suggestions, flag risks, recommend next actions, and keep your team focused on high-impact items that move the needle.</p>
                    </div>
                </div>
            </div>
        </section>

        <section id="features" class="section">
            <div class="section-container">
                <div class="section-header">
                    <h2>Built for teams who ship, not just plan</h2>
                    <p class="section-subheadline">Every feature designed to get work done faster with AI assistance</p>
                    <p class="section-body">Candy AI combines proven kanban methodology with cutting-edge AI to eliminate the busywork that slows down high-performing teams.</p>
                </div>
                
                <div class="features-grid">
                    <div class="feature fade-in">
                        <div class="feature-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                                <circle cx="11" cy="11" r="8"/>
                                <path d="m21 21-4.35-4.35"/>
                                <rect x="8" y="8" width="6" height="2"/>
                                <rect x="8" y="12" width="4" height="2"/>
                            </svg>
                        </div>
                        <h3>Smart Backlog Analysis</h3>
                        <p>AI instantly categorizes and prioritizes hundreds of backlog items based on business impact, effort, and dependencies.</p>
                    </div>
                    
                    <div class="feature fade-in">
                        <div class="feature-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                                <rect x="3" y="3" width="7" height="7"/>
                                <rect x="14" y="3" width="7" height="7"/>
                                <rect x="14" y="14" width="7" height="7"/>
                                <rect x="3" y="14" width="7" height="7"/>
                                <path d="M12 8l-4 4h8l-4-4z"/>
                            </svg>
                        </div>
                        <h3>Intelligent Board Creation</h3>
                        <p>Automatically generates optimized kanban columns and swim lanes that match your team's workflow patterns and bottlenecks.</p>
                    </div>
                    
                    <div class="feature fade-in">
                        <div class="feature-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                                <rect x="2" y="6" width="20" height="2" rx="1"/>
                                <rect x="2" y="14" width="12" height="2" rx="1"/>
                                <circle cx="20" cy="15" r="3"/>
                                <path d="m19 14 1 1-1 1"/>
                            </svg>
                        </div>
                        <h3>AI Progress Tracking</h3>
                        <p>Smart agents monitor work in progress, predict completion dates, and alert you to potential blockers before they impact delivery.</p>
                    </div>
                    
                    <div class="feature fade-in">
                        <div class="feature-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="m12 6-4 6h8l-4-6z"/>
                                <path d="M8 12h8"/>
                            </svg>
                        </div>
                        <h3>Context-Aware Suggestions</h3>
                        <p>Get personalized recommendations for next actions, resource allocation, and task sequencing based on your team's historical performance.</p>
                    </div>
                    
                    <div class="feature fade-in">
                        <div class="feature-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14,2 14,8 20,8"/>
                                <line x1="8" y1="13" x2="16" y2="13"/>
                                <line x1="8" y1="17" x2="12" y2="17"/>
                                <polyline points="10,9 12,11 16,7"/>
                            </svg>
                        </div>
                        <h3>Automated Reporting</h3>
                        <p>AI generates executive summaries, burndown insights, and team velocity reports without manual data entry or configuration.</p>
                    </div>
                    
                    <div class="feature fade-in">
                        <div class="feature-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                                <circle cx="12" cy="12" r="2"/>
                                <circle cx="12" cy="2" r="2"/>
                                <circle cx="12" cy="22" r="2"/>
                                <circle cx="20" cy="8" r="2"/>
                                <circle cx="20" cy="16" r="2"/>
                                <circle cx="4" cy="8" r="2"/>
                                <circle cx="4" cy="16" r="2"/>
                                <line x1="12" y1="4" x2="12" y2="10"/>
                                <line x1="12" y1="14" x2="12" y2="20"/>
                                <line x1="14" y1="12" x2="18" y2="8"/>
                                <line x1="18" y1="16" x2="14" y2="12"/>
                                <line x1="10" y1="12" x2="6" y2="8"/>
                                <line x1="6" y1="16" x2="10" y2="12"/>
                            </svg>
                        </div>
                        <h3>Seamless Integrations</h3>
                        <p>Connect with Jira, Asana, Trello, GitHub, and 50+ tools to sync data automatically and eliminate duplicate work across platforms.</p>
                    </div>
                </div>
            </div>
        </section>

        <section class="section stats">
            <div class="section-container">
                <div class="section-header">
                    <h2>The numbers speak for themselves</h2>
                    <p class="section-subheadline">Real results from teams using Candy AI to manage their backlogs</p>
                </div>
                
                <div class="stats-grid">
                    <div class="stat fade-in">
                        <div class="stat-number">73%</div>
                        <p class="stat-description">Faster backlog clearing time on average across all customer teams</p>
                    </div>
                    
                    <div class="stat fade-in">
                        <div class="stat-number">2,847</div>
                        <p class="stat-description">Teams actively using Candy AI to manage over 50,000 backlog items monthly</p>
                    </div>
                    
                    <div class="stat fade-in">
                        <div class="stat-number">89%</div>
                        <p class="stat-description">Reduction in time spent on backlog grooming and prioritization meetings</p>
                    </div>
                    
                    <div class="stat fade-in">
                        <div class="stat-number">4.9/5</div>
                        <p class="stat-description">Average customer satisfaction rating from project managers and team leads</p>
                    </div>
                </div>
            </div>
        </section>

        <section id="testimonials" class="section testimonials">
            <div class="section-container">
                <div class="section-header">
                    <h2>Trusted by teams who deliver</h2>
                    <p class="section-subheadline">See how product teams use Candy AI to ship faster and stress less</p>
                </div>
                
                <div class="testimonials-grid">
                    <div class="testimonial fade-in">
                        <p class="testimonial-content">"Candy AI cut our sprint planning time in half. The AI agents are like having an expert project manager who never sleeps. Our team went from drowning in technical debt to shipping features customers actually want."</p>
                        <p class="testimonial-author">Sarah Chen, Head of Product at Streamline</p>
                    </div>
                    
                    <div class="testimonial fade-in">
                        <p class="testimonial-content">"We had 400+ backlog items that nobody wanted to touch. Candy AI organized them in 20 minutes and helped us identify the 15% that actually mattered for our Q4 goals. Game changer."</p>
                        <p class="testimonial-author">Marcus Rodriguez, Engineering Manager at BuildTech</p>
                    </div>
                    
                    <div class="testimonial fade-in">
                        <p class="testimonial-content">"The AI suggestions are scary good. It caught dependencies our senior developers missed and helped us avoid three potential blockers that would have delayed our product launch by weeks."</p>
                        <p class="testimonial-author">Emily Watson, CTO at DataFlow Solutions</p>
                    </div>
                </div>
            </div>
        </section>

        <section id="pricing" class="section">
            <div class="section-container">
                <div class="section-header">
                    <h2>Simple pricing that scales with your team</h2>
                    <p class="section-subheadline">Start free, upgrade when you need more AI power</p>
                    <p class="section-body">No hidden fees, no per-user costs that punish growing teams. Pay for the AI capabilities you use.</p>
                </div>
                
                <div class="pricing-grid">
                    <div class="pricing-card fade-in">
                        <div class="pricing-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                                <path d="M12 2a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
                                <path d="M12 15a4 4 0 0 1-4-4V8H6a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0v-4a2 2 0 0 0-2-2h-2v3a4 4 0 0 1-4 4z"/>
                            </svg>
                        </div>
                        <h3 class="pricing-title">Starter</h3>
                        <p class="pricing-description">Perfect for small teams getting started with AI-powered kanban. Up to 500 backlog items, basic AI analysis, and essential integrations.</p>
                        <a href="#contact" class="pricing-cta">Start Your Free Trial</a>
                    </div>
                    
                    <div class="pricing-card featured fade-in">
                        <div class="pricing-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                                <line x1="8" y1="21" x2="16" y2="21"/>
                                <line x1="12" y1="17" x2="12" y2="21"/>
                            </svg>
                        </div>
                        <h3 class="pricing-title">Professional</h3>
                        <p class="pricing-description">For growing teams who need advanced AI agents. Unlimited backlogs, predictive analytics, custom workflows, and priority support.</p>
                        <a href="#contact" class="pricing-cta">Start Your Free Trial</a>
                    </div>
                    
                    <div class="pricing-card fade-in">
                        <div class="pricing-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                                <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
                                <line x1="8" y1="6" x2="16" y2="6"/>
                                <line x1="8" y1="10" x2="16" y2="10"/>
                                <line x1="8" y1="14" x2="12" y2="14"/>
                            </svg>
                        </div>
                        <h3 class="pricing-title">Enterprise</h3>
                        <p class="pricing-description">Full AI power for large organizations. Advanced security, custom AI training, dedicated success manager, and white-label options.</p>
                        <a href="#contact" class="pricing-cta">Start Your Free Trial</a>
                    </div>
                </div>
            </div>
        </section>

        <section class="section cta-section">
            <div class="section-container">
                <div class="section-header">
                    <h2>Ready to clear your backlog chaos?</h2>
                    <p class="section-subheadline">Join 2,000+ teams shipping faster with AI-powered kanban boards</p>
                    <p class="section-body">Start your free trial today. No credit card required, no setup fees, no risk. See how AI agents can transform your project management in under 10 minutes.</p>
                </div>
                <a href="#contact" class="cta-button">Get Started Free</a>
            </div>
        </section>

        <section id="contact" class="section">
            <div class="section-container">
                <div class="section-header">
                    <h2>Get Started Today</h2>
                    <p class="section-subheadline">Ready to transform your backlog management?</p>
                </div>
                
                <form class="contact-form" id="contactForm">
                    <div class="form-group">
                        <label for="name">Full Name</label>
                        <input type="text" id="name" name="name" required aria-describedby="nameError">
                        <div class="form-error" id="nameError" role="alert">Please enter your full name</div>
                    </div>
                    
                    <div class="form-group">
                        <label for="email">Work Email</label>
                        <input type="email" id="email" name="email" required aria-describedby="emailError">
                        <div class="form-error" id="emailError" role="alert">Please enter a valid email address</div>
                    </div>
                    
                    <div class="form-group">
                        <label for="company">Company Name</label>
                        <input type="text" id="company" name="company" required aria-describedby="companyError">
                        <div class="form-error" id="companyError" role="alert">Please enter your company name</div>
                    </div>
                    
                    <div class="form-group">
                        <label for="message">Tell us about your backlog challenges</label>
                        <textarea id="message" name="message" placeholder="e.g., We have 500+ items in our backlog and spend 4 hours weekly in grooming meetings..."></textarea>
                    </div>
                    
                    <button type="submit" class="form-submit">Start Free Trial</button>
                </form>
            </div>
        </section>
    </main>

    <footer class="footer">
        <div class="footer-container">
            <div class="footer-grid">
                <div class="footer-column">
                    <h4>Product</h4>
                    <ul class="footer-links">
                        <li><a href="#features">Features</a></li>
                        <li><a href="#pricing">Pricing</a></li>
                        <li><a href="#">Integrations</a></li>
                        <li><a href="#">Security</a></li>
                    </ul>
                </div>
                
                <div class="footer-column">
                    <h4>Company</h4>
                    <ul class="footer-links">
                        <li><a href="#">About</a></li>
                        <li><a href="#">Careers</a></li>
                        <li><a href="#">Blog</a></li>
                        <li><a href="#">Press</a></li>
                    </ul>
                </div>
                
                <div class="footer-column">
                    <h4>Support</h4>
                    <ul class="footer-links">
                        <li><a href="#">Help Center</a></li>
                        <li><a href="#">API Docs</a></li>
                        <li><a href="#">Status</a></li>
                        <li><a href="#contact">Contact</a></li>
                    </ul>
                </div>
            </div>
            
            <div class="footer-bottom">
                <p>© 2024 Candy AI. Built for teams who ship. AI agents that actually work.</p>
            </div>
        </div>
    </footer>

    <button class="back-to-top" id="backToTop" aria-label="Back to top">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="m7 14 5-5 5 5"/>
        </svg>
    </button>

    <script>
        // Mobile menu toggle
        const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
        const mobileMenu = document.querySelector('.mobile-menu');

        mobileMenuToggle.addEventListener('click', () => {
            const isExpanded = mobileMenuToggle.getAttribute('aria-expanded') === 'true';
            mobileMenuToggle.setAttribute('aria-expanded', !isExpanded);
            mobileMenu.classList.toggle('active');
        });

        // Close mobile menu on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && mobileMenu.classList.contains('active')) {
                mobileMenuToggle.setAttribute('aria-expanded', 'false');
                mobileMenu.classList.remove('active');
            }
        });

        // Close mobile menu when clicking on links
        const mobileNavLinks = document.querySelectorAll('.mobile-nav-links a');
        mobileNavLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenuToggle.setAttribute('aria-expanded', 'false');
                mobileMenu.classList.remove('active');
            });
        });

        // Sticky navigation with show/hide on scroll
        let lastScrollY = window.scrollY;
        const header = document.querySelector('.header');

        window.addEventListener('scroll', () => {
            const currentScrollY = window.scrollY;
            
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                header.style.transform = 'translateY(-100%)';
            } else {
                header.style.transform = 'translateY(0)';
            }
            
            lastScrollY = currentScrollY;
        });

        // Fade-in animation on scroll
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, observerOptions);

        const fadeInElements = document.querySelectorAll('.fade-in');
        fadeInElements.forEach(el => observer.observe(el));

        // Back to top button
        const backToTopButton = document.getElementById('backToTop');

        window.addEventListener('scroll', () => {
            if (window.scrollY > 500) {
                backToTopButton.classList.add('visible');
            } else {
                backToTopButton.classList.remove('visible');
            }
        });

        backToTopButton.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        // Contact form validation
        const contactForm = document.getElementById('contactForm');
        const nameInput = document.getElementById('name');
        const emailInput = document.getElementById('email');
        const companyInput = document.getElementById('company');
        const nameError = document.getElementById('nameError');
        const emailError = document.getElementById('emailError');
        const companyError = document.getElementById('companyError');

        function validateEmail(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email);
        }

        function showError(input, errorElement, message) {
            input.style.borderColor = '#ef4444';
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }

        function hideError(input, errorElement) {
            input.style.borderColor = '#d1d5db';
            errorElement.style.display = 'none';
        }

        nameInput.addEventListener('blur', () => {
            if (nameInput.value.trim().length < 2) {
                showError(nameInput, nameError, 'Please enter your full name');
            } else {
                hideError(nameInput, nameError);
            }
        });

        emailInput.addEventListener('blur', () => {
            if (!validateEmail(emailInput.value)) {
                showError(emailInput, emailError, 'Please enter a valid email address');
            } else {
                hideError(emailInput, emailError);
            }
        });

        companyInput.addEventListener('blur', () => {
            if (companyInput.value.trim().length < 2) {
                showError(companyInput, companyError, 'Please enter your company name');
            } else {
                hideError(companyInput, companyError);
            }
        });

        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            let isValid = true;

            if (nameInput.value.trim().length < 2) {
                showError(nameInput, nameError, 'Please enter your full name');
                isValid = false;
            }

            if (!validateEmail(emailInput.value)) {
                showError(emailInput, emailError, 'Please enter a valid email address');
                isValid = false;
            }

            if (companyInput.value.trim().length < 2) {
                showError(companyInput, companyError, 'Please enter your company name');
                isValid = false;
            }

            if (isValid) {
                // Form is valid, show success message
                alert('Thank you for your interest! We\'ll be in touch within 24 hours to set up your free trial.');
                contactForm.reset();
            }
        });

        // Smooth scroll for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    </script>
</body>
</html>