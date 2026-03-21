/**
 * Particle Effect Animation
 * Creates floating particles with connections for background effect
 */
(function() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return; // Exit if canvas element doesn't exist

    const ctx = canvas.getContext('2d');

    // Set canvas size
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Particle class
    class Particle {
        constructor() {
            this.reset();
            this.y = Math.random() * canvas.height;
            this.opacity = Math.random() * 0.5 + 0.1;
        }

        reset() {
            this.x = Math.random() * canvas.width;
            this.y = canvas.height + 10;
            this.size = Math.random() * 2 + 0.5;
            this.speedY = Math.random() * 1 + 0.5;
            this.speedX = (Math.random() - 0.5) * 0.5;
            this.opacity = 0;
            this.fadeIn = true;
        }

        update() {
            this.y -= this.speedY;
            this.x += this.speedX;

            // Fade in/out effect
            if (this.fadeIn) {
                this.opacity += 0.01;
                if (this.opacity >= 0.5) {
                    this.fadeIn = false;
                }
            } else if (this.y < canvas.height * 0.2) {
                this.opacity -= 0.01;
            }

            // Reset particle when it goes off screen
            if (this.y < -10 || this.opacity <= 0) {
                this.reset();
            }
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(139, 92, 246, ${this.opacity})`;
            ctx.fill();

            // Add glow effect
            ctx.shadowBlur = 10;
            ctx.shadowColor = `rgba(139, 92, 246, ${this.opacity * 0.5})`;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    // Create particle connections
    function drawConnections(particles) {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 150) {
                    const opacity = (1 - distance / 150) * 0.2 *
                                  Math.min(particles[i].opacity, particles[j].opacity);
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(99, 102, 241, ${opacity})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
    }

    // Initialize particles
    const particleCount = 50;
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }

    // Animation loop
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Update and draw particles
        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });

        // Draw connections
        drawConnections(particles);

        requestAnimationFrame(animate);
    }

    animate();
})();
