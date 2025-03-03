/*
 * Game Class
 * Main class that manages the core game mechanics, state, and interactions.
 * Handles player movement, obstacle generation, collision detection, and scoring.
 */
class Game {
    constructor() {
        // Core game state variables
        this.score = 0;
        this.isGameOver = false;
        this.isPlaying = false;
        this.speed = 5.75;      // Base movement speed (pixels/frame)
        this.jumpForce = 0;     // Current vertical force applied to player
        this.gravity = 0.4;     // Downward force applied during jumps
        this.consecutiveJumps = 0;
        this.maxJumps = 2;      // Double jump capability
        this.highScores = this.loadHighScores();
        this.hasShownExtraLargeWarning = false;  // Track if we've shown the warning for extra-large fire

        // Difficulty progression parameters
        this.lastSpeedIncrease = 0;
        this.speedIncreaseInterval = 30000;  // Speed up every 30 seconds
        this.speedMultiplier = 1.05;         // 5% speed increase
        this.lastObstacleSpawn = 0;
        this.spawnCooldown = 2000;           // Initial spawn delay
        
        // Fire obstacle spacing configuration
        this.baseSpacing = 3; // Base distance between fires in character widths
        this.spacingMultiplier = 1.0; // Spacing increases over time
        this.lastSpacingIncrease = 0;
        this.spacingIncreaseInterval = 60000; // Spacing increases every minute
        this.spacingIncreaseAmount = 0.1; // Spacing increases by 10% each time
        this.lastObstacleSize = null; // Tracks previous obstacle size for variety
        this.consecutiveIdenticalGaps = 0; // Prevents repetitive gap patterns
        this.missedLastJump = false; // Used for dynamic difficulty adjustment
        
        // Fire progression tracking
        this.smallFiresEncountered = 0;     // Count of small fires player has seen
        this.mediumFiresJumped = 0;         // Count of medium fires player has jumped
        this.largeFiresJumped = 0;         // Count of large fires player has jumped
        this.smallFiresSinceNonSmall = 0;   // Count of small fires since last medium/large
        this.gamePhase = 'initial';         // Current game phase (initial, ramp-up, full-challenge)

        // Cluster fire configuration
        this.clusterEnabled = false;
        this.clusterSpawnCount = 0;
        this.clusterCooldown = 5; // Number of regular fires before cluster is possible
        this.clusterSpawnChance = 0.3; // 30% chance to spawn cluster when conditions met
        this.lastClusterTime = 0;
        this.clusterPenaltyEndTime = 0; // Time until next cluster is allowed after player hit
        this.path = document.getElementById('path');

        // Reference to game objects and elements
        this.player = document.getElementById('player');
        this.obstacles = [];
        this.clouds = [];
        this.birds = [];
        this.trees = [];
        this.grasses = [];

        // UI elements
        this.gameContainer = document.getElementById('game-container');
        this.scoreElement = document.getElementById('score');
        this.startMenu = document.getElementById('start-menu');
        this.gameOverMenu = document.getElementById('game-over');
        this.finalScoreElement = document.getElementById('final-score');

        // Set up event listeners for player input
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('touchstart', () => this.jump());

        // Initialize button click handlers
        document.getElementById('start-button').addEventListener('click', () => {
            console.log('Start button clicked');
            this.startGame();
        });
        document.getElementById('retry-button').addEventListener('click', () => {
            console.log('Retry button clicked');
            this.startGame();
        });

        // Initialize game environment
        this.setupClouds();

        // Start the game loop
        this.animate();
    }

    startGame() {
        // Reset game state
        this.score = 0;
        this.isGameOver = false;
        this.isPlaying = true;
        this.speed = 5.75; // 15% faster than original
        this.jumpForce = 0;
        this.consecutiveJumps = 0;
        this.lastSpeedIncrease = Date.now();
        this.lastSpacingIncrease = Date.now();
        this.spacingMultiplier = 1.0;
        this.lastObstacleSize = null;
        this.consecutiveIdenticalGaps = 0;
        this.missedLastJump = false;
        this.hasShownExtraLargeWarning = false; // Reset warning flag for new game
        
        // Start grass animations
        document.documentElement.style.setProperty('--grass-animation-state', 'running');
        document.documentElement.style.setProperty('--grass-move-duration', '8s');
        document.documentElement.style.setProperty('--grass-wave-duration', '2s');

        // Reset environmental elements
        this.setupEnvironment();
        
        // No need to set animation properties as we're handling movement in JavaScript

        // Reset fire progression tracking
        this.smallFiresEncountered = 0;
        this.mediumFiresJumped = 0;
        this.largeFiresJumped = 0;
        this.smallFiresSinceNonSmall = 0;
        this.gamePhase = 'initial';

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

    loadHighScores() {
        const scores = localStorage.getItem('highScores');
        return scores ? JSON.parse(scores) : [];
    }

    saveHighScore(score) {
        this.highScores.push(score);
        this.highScores.sort((a, b) => b - a);
        if (this.highScores.length > 10) {
            this.highScores = this.highScores.slice(0, 10);
        }
        localStorage.setItem('highScores', JSON.stringify(this.highScores));
    }

    updateHighScoresDisplay() {
        const highScoresList = document.getElementById('high-scores-list');
        highScoresList.innerHTML = '';
        this.highScores.forEach((score, index) => {
            const li = document.createElement('li');
            li.textContent = `${index + 1}. ${score}`;
            highScoresList.appendChild(li);
        });
    }

    gameOver() {
        this.isPlaying = false;
        this.isGameOver = true;
        this.finalScoreElement.textContent = this.score;
        this.saveHighScore(this.score);
        this.updateHighScoresDisplay();
        this.gameOverMenu.style.display = 'block';
        
        // Pause grass animations
        document.documentElement.style.setProperty('--grass-animation-state', 'paused');
        
        // Pause environmental animations
        const trees = document.querySelectorAll('.tree');
        const grasses = document.querySelectorAll('.tall-grass');
        
        trees.forEach(tree => {
            tree.style.animationPlayState = 'paused';
        });
        
        grasses.forEach(grass => {
            grass.style.animationPlayState = 'paused';
        });
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
        // Clear existing trees and grass
        this.trees = [];
        this.grasses = [];
        
        // Remove existing elements from DOM
        const existingTrees = document.querySelectorAll('.tree');
        const existingGrass = document.querySelectorAll('.tall-grass');
        
        existingTrees.forEach(tree => tree.remove());
        existingGrass.forEach(grass => grass.remove());
        
        // Add trees along the path with better distribution
        for (let i = 0; i < 8; i++) {
            this.createTree(i * 15 + Math.random() * 10);
        }
        
        // Add tall grass patches with better distribution
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
        
        // Store tree data for tracking
        const treeObj = {
            element: tree,
            posX: posX,
            scale: scale
        };
        
        this.trees.push(treeObj);
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
        
        // Store grass data for tracking
        const grassObj = {
            element: grass,
            posX: posX
        };
        
        this.grasses.push(grassObj);
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

    // Get a random value between min and max
    getRandomValue(min, max) {
        return min + Math.random() * (max - min);
    }
    
    // Determine fire size category and dimensions
    getFireSize() {
        // Initial Phase: Only small fires
        if (this.smallFiresEncountered < 10) {
            this.smallFiresEncountered++;
            return 'small';
        }

        // Ramp-Up Phase: Mix of small and medium fires (3:1 ratio)
        if (this.mediumFiresJumped < 5) {
            // Ensure at least 2 small fires between medium fires
            if (this.smallFiresSinceNonSmall < 2) {
                this.smallFiresSinceNonSmall++;
                this.smallFiresEncountered++;
                return 'small';
            }

            const sizeRoll = Math.random();
            if (sizeRoll < 0.75) { // 75% chance for small fire
                this.smallFiresSinceNonSmall++;
                this.smallFiresEncountered++;
                return 'small';
            } else {
                this.smallFiresSinceNonSmall = 0;
                return 'medium';
            }
        }

        // Full Challenge Phase: All fire sizes available
        // Ensure minimum 2 small fires between large/medium/extra-large
        if (this.smallFiresSinceNonSmall < 2 && this.lastObstacleSize !== 'small') {
            this.smallFiresSinceNonSmall++;
            this.smallFiresEncountered++;
            return 'small';
        }

        const sizeRoll = Math.random();
        if (sizeRoll < 0.4) {
            this.smallFiresSinceNonSmall++;
            this.smallFiresEncountered++;
            return 'small';
        } else if (sizeRoll < 0.65) {
            this.smallFiresSinceNonSmall = 0;
            return 'medium';
        } else if (sizeRoll < 0.85) {
            this.smallFiresSinceNonSmall = 0;
            return 'large';
        } else if (this.largeFiresJumped >= 5) {
            this.smallFiresSinceNonSmall = 0;
            return 'extra-large';
        } else {
            this.smallFiresSinceNonSmall = 0;
            return 'large';
        }
    }
    
    // Calculate spacing based on fire size and game progression
    calculateSpacing(fireSize) {
        // Base spacing ranges by fire size (in character widths)
        let minSpacing, maxSpacing;
        
        switch (fireSize) {
            case 'small':
                minSpacing = 2;
                maxSpacing = 3;
                break;
            case 'medium':
                minSpacing = 3;
                maxSpacing = 4;
                break;
            case 'large':
                minSpacing = 4;
                maxSpacing = 5;
                break;
            default:
                minSpacing = 3;
                maxSpacing = 4;
        }
        
        // Apply spacing multiplier from progression
        minSpacing *= this.spacingMultiplier;
        maxSpacing *= this.spacingMultiplier;
        
        // Hard cap at 6 character widths
        maxSpacing = Math.min(maxSpacing, 6);
        
        // Use random value for spacing
        let spacing = this.getRandomValue(minSpacing, maxSpacing);
        
        // Adaptive spacing algorithm
        if (this.consecutiveIdenticalGaps >= 2) {
            // Avoid boring patterns by forcing variation
            spacing *= (0.85 + Math.random() * 0.3); // 85-115% of calculated spacing
            this.consecutiveIdenticalGaps = 0;
        }
        
        // Dynamic balancing - make it easier if player missed last jump
        if (this.missedLastJump) {
            spacing *= 0.9; // Reduce difficulty temporarily
            this.missedLastJump = false;
        }
        
        // Ensure minimum jump distance (1.5x character width)
        const minJumpDistance = 1.5;
        spacing = Math.max(spacing, minJumpDistance);
        
        // Convert character widths to percentage
        // Assuming character width is roughly 60px and game container is 100vw
        const charWidthInPercent = 6; // 60px is roughly 6% of viewport width
        return spacing * charWidthInPercent;
    }
    // Create a fire element with common properties
    createFireElement(size, isCluster = false) {
        const fire = document.createElement('div');
        fire.className = `fire${isCluster ? ' cluster-fire' : ''}`;
        fire.innerHTML = '🔥';
        fire.style.display = 'flex';
        fire.style.alignItems = 'center';
        fire.style.justifyContent = 'center';
        return fire;
    }

    // Create spark effects for fire
    createSparkEffects(container, count, isWarning = false) {
        const sparkContainer = document.createElement('div');
        sparkContainer.className = 'spark-container';
        
        for (let i = 0; i < count; i++) {
            const spark = document.createElement('div');
            spark.className = `spark${isWarning ? ' warning-spark' : ''}`;
            
            if (!isWarning) {
                spark.style.left = `${this.getRandomValue(0, 100)}%`;
                spark.style.width = `${this.getRandomValue(4, 8)}px`;
                spark.style.height = spark.style.width;
                spark.style.animationDelay = `${this.getRandomValue(0, 2)}s`;
                spark.style.animationDuration = `${this.getRandomValue(1.5, 2.5)}s`;
                spark.style.backgroundColor = `hsl(${this.getRandomValue(20, 40)}, 100%, 60%)`;
            }
            
            sparkContainer.appendChild(spark);
        }
        
        container.appendChild(sparkContainer);
    }

    spawnClusterFires() {
        const currentTime = Date.now();
        this.lastClusterTime = currentTime;
        this.clusterSpawnCount = 0;

        const clusterSize = Math.random() < 0.5 ? 2 : 3;
        let baseX = 105;

        for (let i = 0; i < clusterSize; i++) {
            const obstacle = document.createElement('div');
            obstacle.className = 'obstacle';
            
            const fire = this.createFireElement('small', true);
            const sizeVariation = this.getRandomValue(0.8, 1.2);
            const width = (25 + Math.random() * 10) * sizeVariation;
            const height = width * 2;
            const fontSize = width * 1.6;

            fire.style.fontSize = `${fontSize}px`;
            obstacle.style.width = `${width}px`;
            obstacle.style.height = `${height}px`;

            if (!this.clusterEnabled) {
                this.createSparkEffects(obstacle, 3, true);
                this.path.classList.add('path-warning');
                setTimeout(() => this.path.classList.remove('path-warning'), 1500);
            }

            obstacle.appendChild(fire);

            const randomOffset = this.getRandomValue(-10, 10);
            const posX = baseX + (i * 15) + randomOffset;
            obstacle.style.left = `${posX}%`;

            const obstacleObj = {
                element: obstacle,
                posX: posX,
                passed: false,
                scale: 0.8,
                isCluster: true,
                spacing: 15,
                visibleTime: null
            };

            this.obstacles.push(obstacleObj);
            this.gameContainer.appendChild(obstacle);
        }

        this.spawnCooldown = Math.max(this.spawnCooldown, 2500);
    }

    spawnExtraLargeFire() {
        const currentTime = Date.now();
        this.lastObstacleSpawn = currentTime;

        // Show warning animation for first extra-large fire
        if (!this.hasShownExtraLargeWarning) {
            this.hasShownExtraLargeWarning = true;
            const sun = document.querySelector('.sun');
            if (sun) {
                // Add warning ray effect
                sun.style.position = 'relative';
                const rayEffect = document.createElement('div');
                rayEffect.className = 'sun-ray-warning';
                sun.appendChild(rayEffect);

                // Create screen flash effect
                const screenFlash = document.createElement('div');
                screenFlash.className = 'screen-flash';
                this.gameContainer.appendChild(screenFlash);

                // Remove the effects after animation
                setTimeout(() => {
                    rayEffect.remove();
                    screenFlash.remove();
                }, 3000);
            }
        }
        
        // Create a container for the extra-large fire bundle
        const container = document.createElement('div');
        container.className = 'obstacle extra-large-fire';
        container.style.display = 'flex';
        container.style.alignItems = 'flex-end';
        container.style.justifyContent = 'center';
        container.style.left = '105%';
        container.style.position = 'absolute';
        container.style.bottom = '25%';
        container.style.zIndex = '10';
        container.style.width = 'auto'; // Allow container to expand based on content
        
        // Fire sizes in order: small, large, medium
        const fireSizes = ['small', 'large', 'medium'];
        const fireElements = [];
        
        // Create each fire element in the bundle
        fireSizes.forEach((size, index) => {
            const fireContainer = document.createElement('div');
            fireContainer.className = 'fire-container';
            fireContainer.style.display = 'inline-block';
            fireContainer.style.position = 'relative';
            fireContainer.style.marginRight = index < fireSizes.length - 1 ? '30px' : '0'; // Increased spacing between fires
            
            const fire = this.createFireElement(size);
            fire.style.position = 'absolute';
            fire.style.bottom = '0';
            fire.style.left = '0'; // Position fire at the left edge of its container
            fire.style.right = '0'; // Stretch to right edge
            fire.style.textAlign = 'center'; // Center the fire emoji
            
            // Set size based on fire type
            let width, height, fontSize;
            switch(size) {
                case 'small':
                    width = 30;
                    height = 60;
                    fontSize = 48;
                    break;
                case 'medium':
                    width = 60;
                    height = 120;
                    fontSize = 96;
                    break;
                case 'large':
                    width = 90;
                    height = 180;
                    fontSize = 144;
                    fire.classList.add('giant-fire');
                    break;
            }
            
            fire.style.fontSize = `${fontSize}px`;
            fireContainer.style.width = `${width}px`;
            fireContainer.style.height = `${height}px`;
            
            // Add sparks to each fire
            const sparkCount = size === 'large' ? 8 : (size === 'medium' ? 5 : 3);
            this.createSparkEffects(fireContainer, sparkCount);
            
            // Add glow effect
            const glow = document.createElement('div');
            glow.className = 'fire-glow';
            glow.style.width = '100%';
            glow.style.height = '100%';
            glow.style.position = 'absolute';
            glow.style.bottom = '0';
            fireContainer.appendChild(glow);
            
            fireContainer.appendChild(fire);
            fireElements.push(fireContainer);
            container.appendChild(fireContainer);
        });
        
        // Calculate total width for collision detection
        const totalWidth = 30 + 60 + 90 + 30; // small + medium + large + spacing
        
        // Add to obstacles array
        const obstacleObj = {
            element: container,
            posX: 105,
            passed: false,
            scale: 1,
            isExtraLarge: true,
            width: totalWidth,
            visibleTime: currentTime
        };
        
        this.obstacles.push(obstacleObj);
        this.gameContainer.appendChild(container);
        
        // Set longer cooldown after extra-large fire
        this.spawnCooldown = 3000;
    }

    spawnObstacle() {
        const currentTime = Date.now();
        if (currentTime - this.lastObstacleSpawn < this.spawnCooldown) return;

        // Enable clusters after 45 seconds
        if (!this.clusterEnabled && currentTime - this.lastSpeedIncrease >= 45000) {
            this.clusterEnabled = true;
        }

        // Check if we should spawn a cluster
        const shouldSpawnCluster = this.clusterEnabled && 
            this.clusterSpawnCount >= this.clusterCooldown &&
            Math.random() < this.clusterSpawnChance &&
            currentTime - this.lastClusterTime > 5000 && // Minimum 5s between clusters
            (!this.lastObstacleSize || this.lastObstacleSize !== 'large') && // No clusters near large fires
            currentTime > this.clusterPenaltyEndTime;

        if (shouldSpawnCluster) {
            this.spawnClusterFires();
            return;
        }

        // Normal fire spawning logic
        const fireSize = this.getFireSize();
        this.lastObstacleSize = fireSize;
        this.clusterSpawnCount++;

        // Check if we should spawn an extra-large fire (bundled fires)
        if (fireSize === 'extra-large') {
            this.spawnExtraLargeFire();
            return;
        }

        // Create obstacle container
        const obstacle = document.createElement('div');
        obstacle.className = 'obstacle';
        
        // Create fire emoji effect using our helper method
        const fire = this.createFireElement(fireSize);
        
        // Set size based on fire size category with random variation
        let isGiantFire = false;
        let width, height, fontSize;
        
        // Use random variation to adjust the size within each category
        const sizeVariation = this.getRandomValue(0.9, 1.1);
        
        switch (fireSize) {
            case 'small':
                width = 20 * sizeVariation;  // Reduced from 30
                height = 40 * sizeVariation; // Reduced from 60
                fontSize = 32 * sizeVariation; // Reduced from 48
                break;
            case 'medium':
                width = 40 * sizeVariation;
                height = 80 * sizeVariation;
                fontSize = 64 * sizeVariation;
                break;
            case 'large':
                width = 80 * sizeVariation;  // Increased from 60
                height = 160 * sizeVariation; // Increased from 120
                fontSize = 128 * sizeVariation; // Increased from 96
                isGiantFire = true;
                break;
        }
        
        fire.style.fontSize = `${fontSize}px`;
        obstacle.style.width = `${width}px`;
        obstacle.style.height = `${height}px`;
        
        if (isGiantFire) {
            fire.classList.add('giant-fire');
            // Create enhanced spark effects for giant fires using our helper method
            const sparkCount = Math.floor(this.getRandomValue(5, 8));
            this.createSparkEffects(obstacle, sparkCount);
        } else {
            // Add glow effect to regular fires
            fire.classList.add('glow-effect');
            
            // Create a pulsing glow when spawned
            const glow = document.createElement('div');
            glow.className = 'fire-glow';
            obstacle.appendChild(glow);
        }
        
        obstacle.appendChild(fire);
        
        // Calculate spacing based on fire size and game progression
        const spacing = this.calculateSpacing(fireSize);
        
        // Position the obstacle off-screen at the far end of the path
        // Using 105% + spacing to ensure proper distance from previous obstacle
        const posX = 105 + spacing;
        obstacle.style.left = `${posX}%`;
        
        // Add a scaling effect to make fire appear to grow as it approaches
        const initialScale = isGiantFire ? 1.0 : 0.8;
        obstacle.style.transform = `scale(${initialScale})`;
        obstacle.style.transition = 'transform 2s linear';
        
        // Store obstacle data
        const obstacleObj = {
            element: obstacle,
            posX: posX,
            passed: false,
            scale: initialScale,
            isGiantFire: isGiantFire,
            fireSize: fireSize,
            spacing: spacing,
            // Track when the obstacle becomes visible for reaction time calculation
            visibleTime: null
        };
        
        this.obstacles.push(obstacleObj);
        this.gameContainer.appendChild(obstacle);
        this.lastObstacleSpawn = currentTime;
        
        // Check for identical gaps
        if (this.obstacles.length >= 2) {
            const lastObstacle = this.obstacles[this.obstacles.length - 2];
            if (Math.abs(lastObstacle.spacing - spacing) < 0.5) {
                this.consecutiveIdenticalGaps++;
            } else {
                this.consecutiveIdenticalGaps = 0;
            }
        }
        
        // Adjust spawn cooldown based on game progression
        // We want to maintain a good rhythm of obstacles based on speed
        this.spawnCooldown = Math.max(500, 2000 / (this.speed / 5));
        
        // Ensure spawn cooldown doesn't get too short at high speeds
        this.spawnCooldown = Math.max(this.spawnCooldown, 500);
        
        // Speed and spacing are now managed without debug logging
    }
    updateObstacles() {
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            
            // Move obstacle at a steady pace
            obstacle.posX -= this.speed / 10;
            obstacle.element.style.left = `${obstacle.posX}%`;
            
            // Track when obstacle becomes visible on screen (around 90% mark)
            if (obstacle.posX <= 90 && obstacle.visibleTime === null) {
                obstacle.visibleTime = Date.now();
            }
            
            // Gradually increase scale as the obstacle approaches the player
            if (obstacle.posX < 90) {
                // Scale from 0.8 to 1.2 as it approaches
                const newScale = 0.8 + (90 - obstacle.posX) / 90 * 0.4;
                obstacle.scale = newScale;
                obstacle.element.style.transform = `scale(${newScale})`;
            }
            
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
                
                // Track medium and large fires jumped for progression
                if (obstacle.fireSize === 'medium') {
                    this.mediumFiresJumped++;
                } else if (obstacle.fireSize === 'large' || obstacle.isExtraLarge) {
                    this.largeFiresJumped++;
                }
                
                // Calculate reaction time for analytics (could be used for difficulty adjustment)
                if (obstacle.visibleTime) {
                    const reactionTime = (Date.now() - obstacle.visibleTime) / 1000;
                    console.log(`Reaction time: ${reactionTime.toFixed(2)} seconds`);
                }
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
        this.saveHighScore(this.score);
        this.updateHighScoresDisplay();
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
                
                // Enhanced running animation with natural movement
                const time = Date.now() * 0.008; // Slowed down the animation speed
                const stepAngle = 25; // Increased max rotation angle
                
                // Add forward tilt and smoother transitions
                const rightAngle = Math.sin(time) * stepAngle - 5; // Slight forward tilt
                const leftAngle = Math.sin(time + Math.PI) * stepAngle - 5;
                
                // Apply eased transitions for smoother movement
                rightLeg.style.transform = `rotate(${rightAngle}deg)`;
                leftLeg.style.transform = `rotate(${leftAngle}deg)`;
                
                // Add slight bounce effect to the player body
                const bounceOffset = Math.abs(Math.sin(time * 2)) * 0.5;
                this.player.style.transform = `translateY(-${bounceOffset}px)`;
            } else {
                // Reset transform when jumping
                this.player.style.transform = 'none';
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
            
            // Animate trees - manually update position instead of relying only on CSS animation
            this.trees.forEach((tree, index) => {
                // Calculate new position based on game speed
                tree.posX -= this.speed * 0.05;
                
                // If tree moves off-screen, recycle it to the right side
                if (tree.posX < -15) {
                    tree.posX = 105 + Math.random() * 10;
                    tree.element.style.bottom = `${25 + Math.random() * 5}%`;
                    
                    // Vary the scale for visual diversity
                    tree.scale = 0.7 + Math.random() * 0.6;
                    tree.element.style.transform = `scale(${tree.scale})`;
                }
                
                // Update tree position
                tree.element.style.left = `${tree.posX}%`;
            });
            
            // Animate grass patches
            this.grasses.forEach((grass, index) => {
                // Calculate new position based on game speed
                grass.posX -= this.speed * 0.06;
                
                // If grass moves off-screen, recycle it to the right side
                if (grass.posX < -5) {
                    grass.posX = 105 + Math.random() * 5;
                }
                
                // Update grass position
                grass.element.style.left = `${grass.posX}%`;
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
            // Base jump force - reduced to keep player visible
            let jumpForce = 7.0;
            
            // Apply different force for double jump (slightly lower)
            if (this.consecutiveJumps > 0) {
                jumpForce = 5.5;
            }
            
            this.jumpForce = jumpForce;
            this.consecutiveJumps++;
            
            // Add maximum height constraint
            const playerBottom = parseFloat(this.player.style.bottom);
            if (playerBottom > 60) {
                // Significantly reduce jump force when already high
                this.jumpForce = Math.min(this.jumpForce, 4);
            }
        }
    }
}

// Start the game
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
});