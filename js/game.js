// Game class definition
class Game {
    constructor() {
        // Game state
        this.score = 0;
        this.isGameOver = false;
        this.isPlaying = false;
        this.speed = 5; // Speed in pixels per frame
        this.jumpForce = 0;
        this.gravity = 0.4; // Reduced from 0.6 to make jumps feel better
        this.consecutiveJumps = 0;
        this.maxJumps = 2; // Allow double jump

        // Game balance properties
        this.lastSpeedIncrease = 0;
        this.speedIncreaseInterval = 30000; // 30 seconds
        this.speedMultiplier = 1.05; // 5% increase
        this.lastObstacleSpawn = 0;
        this.spawnCooldown = 2000; // Initial spawn cooldown in milliseconds

        // Game objects
        this.player = document.getElementById('player');
        this.obstacles = [];
        this.clouds = [];
        this.birds = [];

        // UI elements
        this.gameContainer = document.getElementById('game-container');
        this.scoreElement = document.getElementById('score');
        this.startMenu = document.getElementById('start-menu');
        this.gameOverMenu = document.getElementById('game-over');
        this.finalScoreElement = document.getElementById('final-score');

        // Event listeners
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('touchstart', () => this.jump());

        // Button listeners
        document.getElementById('start-button').addEventListener('click', () => {
            console.log('Start button clicked');
            this.startGame();
        });
        document.getElementById('retry-button').addEventListener('click', () => {
            console.log('Retry button clicked');
            this.startGame();
        });

        // Setup initial scene
        this.setupClouds();

        // Start animation loop
        this.animate();
    }

    startGame() {
        // Reset game state
        this.score = 0;
        this.isGameOver = false;
        this.isPlaying = true;
        this.speed = 5;
        this.jumpForce = 0;
        this.consecutiveJumps = 0;
        this.lastSpeedIncrease = Date.now();

        // Reset player position
        this.player.style.bottom = '25%';

        // Clear existing obstacles
        this.obstacles.forEach(obstacle => {
            obstacle.element.remove();
        });
        this.obstacles = [];

        // Update UI
        this.scoreElement.textContent = 'Score: 0';
        this.startMenu.style.display = 'none';
        this.gameOverMenu.style.display = 'none';
    }

    setupClouds() {
        // Add clouds
        for (let i = 0; i < 10; i++) {
            this.createCloud();
        }

        // Initialize bird spawn timing
        this.lastBirdSpawn = 0;
        this.birdSpawnInterval = 10000; // 10 seconds
        
        // Add trees and grass
        this.setupEnvironment();
    }
    
    setupEnvironment() {
        // Add trees along the path
        for (let i = 0; i < 8; i++) {
            this.createTree(i * 15 + Math.random() * 10);
        }
        
        // Add tall grass patches
        for (let i = 0; i < 20; i++) {
            this.createGrass(i * 5 + Math.random() * 5);
        }
    }
    
    createTree(posX) {
        const tree = document.createElement('div');
        tree.className = 'tree';
        
        // Create tree trunk
        const trunk = document.createElement('div');
        trunk.className = 'tree-trunk';
        tree.appendChild(trunk);
        
        // Create tree top (foliage)
        const top = document.createElement('div');
        top.className = 'tree-top';
        tree.appendChild(top);
        
        // Position the tree
        tree.style.left = `${posX}%`;
        tree.style.bottom = `${25 + Math.random() * 5}%`; // Position above the path
        
        // Random size variation
        const scale = 0.7 + Math.random() * 0.6;
        tree.style.transform = `scale(${scale})`;
        
        this.gameContainer.appendChild(tree);
    }
    
    createGrass(posX) {
        const grass = document.createElement('div');
        grass.className = 'tall-grass';
        
        // Create grass blades
        for (let i = 0; i < 3; i++) {
            const blade = document.createElement('div');
            blade.className = 'grass-blade';
            grass.appendChild(blade);
        }
        
        // Position the grass
        grass.style.left = `${posX}%`;
        
        this.gameContainer.appendChild(grass);
    }

    createCloud() {
        const cloud = document.createElement('div');
        cloud.className = 'cloud';
        
        // Random cloud size
        const size = 50 + Math.random() * 100;
        cloud.style.width = `${size}px`;
        cloud.style.height = `${size * 0.6}px`;
        
        // Random position
        const posX = Math.random() * 100;
        const posY = Math.random() * 40 + 10;
        cloud.style.left = `${posX}%`;
        cloud.style.top = `${posY}%`;
        
        // Store cloud data
        const cloudObj = {
            element: cloud,
            speed: 0.05 + Math.random() * 0.1,
            posX: posX
        };
        
        this.clouds.push(cloudObj);
        this.gameContainer.appendChild(cloud);
    }

    spawnBird() {
        const currentTime = Date.now();
        if (currentTime - this.lastBirdSpawn < this.birdSpawnInterval) return;

        const bird = document.createElement('div');
        bird.className = 'bird';
        bird.innerHTML = '&#x1F985;'; // Eagle emoji
        
        // Random bird color
        bird.style.color = Math.random() < 0.5 ? '#40E0D0' : '#FF7F50';
        
        // Position
        bird.style.left = '0%';
        bird.style.top = `${Math.random() * 30 + 10}%`;
        
        // Store bird data
        const birdObj = {
            element: bird,
            speed: 0.2 + Math.random() * 0.1,
            posX: 0
        };
        
        this.birds.push(birdObj);
        this.gameContainer.appendChild(bird);
        this.lastBirdSpawn = currentTime;
    }

    spawnObstacle() {
        const currentTime = Date.now();
        if (currentTime - this.lastObstacleSpawn < this.spawnCooldown) return;

        // Create obstacle container
        const obstacle = document.createElement('div');
        obstacle.className = 'obstacle';
        
        // Create fire effect
        const fire = document.createElement('div');
        fire.className = 'fire';
        obstacle.appendChild(fire);
        
        // Position the obstacle
        const posX = Math.random() * 40 + 30; // Random position on the path
        obstacle.style.left = `${posX}%`;
        
        // Store obstacle data
        const obstacleObj = {
            element: obstacle,
            posX: posX,
            passed: false
        };
        
        this.obstacles.push(obstacleObj);
        this.gameContainer.appendChild(obstacle);
        this.lastObstacleSpawn = currentTime;
        
        // Decrease spawn cooldown as game progresses
        this.spawnCooldown = Math.max(500, this.spawnCooldown * 0.95);
    }

    updateObstacles() {
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            
            // Move obstacle
            obstacle.posX -= this.speed / 10;
            obstacle.element.style.left = `${obstacle.posX}%`;
            
            // Check for collision with player
            if (this.checkCollision(obstacle)) {
                this.gameOver();
                return;
            }
            
            // Check if obstacle passed player
            if (!obstacle.passed && obstacle.posX < 15) {
                obstacle.passed = true;
                this.score += 10;
                this.scoreElement.textContent = `Score: ${this.score}`;
            }
            
            // Remove obstacles that are off-screen
            if (obstacle.posX < -10) {
                obstacle.element.remove();
                this.obstacles.splice(i, 1);
            }
        }
    }

    checkCollision(obstacle) {
        if (!this.isPlaying) return false;
        
        // Get player position
        const playerRect = this.player.getBoundingClientRect();
        const obstacleRect = obstacle.element.getBoundingClientRect();
        
        // Check for overlap
        return !(playerRect.right < obstacleRect.left || 
                playerRect.left > obstacleRect.right || 
                playerRect.bottom < obstacleRect.top || 
                playerRect.top > obstacleRect.bottom);
    }

    gameOver() {
        this.isPlaying = false;
        this.isGameOver = true;
        this.finalScoreElement.textContent = this.score;
        this.gameOverMenu.style.display = 'block';
    }

    animate() {
        if (this.isPlaying) {
            // Update player
            let playerBottom = parseFloat(this.player.style.bottom) || 25;
            playerBottom += this.jumpForce;
            this.jumpForce -= this.gravity;
            
            // Ground collision
            if (playerBottom <= 25) {
                playerBottom = 25;
                this.jumpForce = 0;
                this.consecutiveJumps = 0; // Reset jump counter when on ground
            }
            
            this.player.style.bottom = `${playerBottom}%`;
            
            // Animate player legs when on ground
            if (playerBottom === 25) {
                const leftLeg = this.player.querySelector('.player-leg.left');
                const rightLeg = this.player.querySelector('.player-leg.right');
                
                // Simple running animation
                const time = Date.now() * 0.01;
                leftLeg.style.transform = `rotate(${Math.sin(time) * 20}deg)`;
                rightLeg.style.transform = `rotate(${Math.sin(time + Math.PI) * 20}deg)`;
            }
            
            // Spawn and update obstacles
            this.spawnObstacle();
            this.updateObstacles();
            
            // Update speed progression
            const currentTime = Date.now();
            if (currentTime - this.lastSpeedIncrease >= this.speedIncreaseInterval) {
                this.speed *= this.speedMultiplier;
                this.lastSpeedIncrease = currentTime;
            }
            
            // Animate clouds
            this.clouds.forEach((cloud, index) => {
                cloud.posX -= cloud.speed;
                if (cloud.posX < -20) {
                    cloud.posX = 120;
                    cloud.element.style.top = `${Math.random() * 40 + 10}%`;
                }
                cloud.element.style.left = `${cloud.posX}%`;
            });
            
            // Spawn and animate birds
            this.spawnBird();
            this.birds.forEach((bird, index) => {
                bird.posX += bird.speed;
                bird.element.style.left = `${bird.posX}%`;
                
                // Remove birds that are off-screen
                if (bird.posX > 110) {
                    bird.element.remove();
                    this.birds.splice(index, 1);
                }
            });
        }
        
        requestAnimationFrame(() => this.animate());
    }

    onKeyDown(event) {
        if (event.code === 'Space') {
            this.jump();
        }
    }

    jump() {
        // Only allow jumping if the game is playing
        if (!this.isPlaying) return;
        
        // Allow jumping if on ground or if we haven't reached max jumps
        if (this.consecutiveJumps < this.maxJumps) {
            // Stronger jump force for better obstacle clearing
            this.jumpForce = 12;
            this.consecutiveJumps++;
        }
    }
}

// Start the game
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
});