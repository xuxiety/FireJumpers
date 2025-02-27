// Game class definition
class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        this.score = 0;
        this.isGameOver = false;
        this.isPlaying = false;
        this.speed = 0.15; // Increased initial speed
        this.jumpForce = 0;
        this.gravity = 0.015;
        this.consecutiveJumps = 0;

        // Game balance properties
        this.lastSpeedIncrease = 0;
        this.speedIncreaseInterval = 30000; // 30 seconds
        this.speedMultiplier = 1.05; // 5% increase
        this.minObstacleSpacing = 20;
        this.lastObstacleSpawn = 0;
        this.spawnCooldown = 2000; // Initial spawn cooldown in milliseconds

        // Game objects
        this.player = null;
        this.ground = null;
        this.obstacles = [];

        // Setup scene
        this.setupLights();
        this.setupGround();
        this.setupPlayer();
        this.setupCamera();

        // Event listeners
        window.addEventListener('resize', () => this.onWindowResize());
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('touchstart', () => this.jump());

        // UI elements
        this.scoreElement = document.getElementById('score');
        this.startMenu = document.getElementById('start-menu');
        this.gameOverMenu = document.getElementById('game-over');
        this.finalScoreElement = document.getElementById('final-score');

        // Button listeners
        document.getElementById('start-button').addEventListener('click', () => {
            console.log('Start button clicked');
            this.startGame();
        });
        document.getElementById('retry-button').addEventListener('click', () => {
            console.log('Retry button clicked');
            this.startGame();
        });

        // Start animation loop
        this.animate();
    }

    startGame() {
        // Reset game state
        this.score = 0;
        this.isGameOver = false;
        this.isPlaying = true;
        this.speed = 0.15;
        this.jumpForce = 0;
        this.consecutiveJumps = 0;
        this.lastSpeedIncrease = Date.now();

        // Reset player position
        if (this.player) {
            this.player.position.set(0, 0, 0);
        }

        // Clear existing obstacles
        this.obstacles.forEach(obstacle => {
            this.scene.remove(obstacle);
        });
        this.obstacles = [];

        // Update UI
        this.scoreElement.textContent = 'Score: 0';
        this.startMenu.style.display = 'none';
        this.gameOverMenu.style.display = 'none';
    }

    setupLights() {
        // Add sky background with new pastel color
        const skyGeometry = new THREE.BoxGeometry(1000, 1000, 1000);
        const skyMaterial = new THREE.MeshBasicMaterial({
            color: 0xB0E0E6, // Powder Blue sky
            side: THREE.BackSide
        });
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(sky);

        // Add clouds
        this.clouds = [];
        for (let i = 0; i < 10; i++) {
            const cloudGeometry = new THREE.SphereGeometry(5, 8, 8);
            const cloudMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.8 });
            const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
            cloud.position.set(
                Math.random() * 100 - 50,
                Math.random() * 20 + 20,
                Math.random() * 100 - 150
            );
            cloud.scale.set(1 + Math.random(), 0.8, 1 + Math.random());
            this.clouds.push(cloud);
            this.scene.add(cloud);
        }

        // Add birds
        this.birds = [];
        this.lastBirdSpawn = 0;
        this.birdSpawnInterval = 10000; // 10 seconds

        // Add ambient and directional lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        this.scene.add(directionalLight);
    }

    setupGround() {
        // Create terrain base
        const terrainGeometry = new THREE.PlaneGeometry(100, 1000);
        const terrainMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x90EE90, // Light green for grass base
            roughness: 0.8
        });
        this.terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
        this.terrain.rotation.x = -Math.PI / 2;
        this.terrain.position.y = -2;
        this.scene.add(this.terrain);

        // Main path with texture and details
        const pathGeometry = new THREE.PlaneGeometry(8, 1000);
        const pathMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xE1C699,
            roughness: 0.9,
            metalness: 0.1
        });
        this.ground = new THREE.Mesh(pathGeometry, pathMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.position.y = -1.99; // Slightly above terrain
        this.scene.add(this.ground);

        // Path edges for blending
        const edgeGeometry = new THREE.PlaneGeometry(2, 1000);
        const edgeMaterial = new THREE.MeshStandardMaterial({
            color: 0xCBAF87,
            transparent: true,
            opacity: 0.7
        });

        const leftEdge = new THREE.Mesh(edgeGeometry, edgeMaterial);
        leftEdge.rotation.x = -Math.PI / 2;
        leftEdge.position.set(-5, -1.98, 0);
        this.scene.add(leftEdge);

        const rightEdge = new THREE.Mesh(edgeGeometry, edgeMaterial);
        rightEdge.rotation.x = -Math.PI / 2;
        rightEdge.position.set(5, -1.98, 0);
        this.scene.add(rightEdge);

        // Add decorative elements
        this.decorations = new THREE.Group();
        
        // Add grass patches with better ground connection
        for (let i = 0; i < 200; i++) {
            const grassGeometry = new THREE.ConeGeometry(0.15, 0.5, 4);
            const grassMaterial = new THREE.MeshStandardMaterial({ color: 0xB5EAD7 });
            const grass = new THREE.Mesh(grassGeometry, grassMaterial);
            grass.position.set(
                Math.random() * 80 - 40,
                -1.75,
                Math.random() * 1000 - 500
            );
            grass.rotation.y = Math.random() * Math.PI;
            this.decorations.add(grass);
        }

        // Add flowers with stems
        for (let i = 0; i < 100; i++) {
            const flower = new THREE.Group();
            
            // Stem
            const stemGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4);
            const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x90EE90 });
            const stem = new THREE.Mesh(stemGeometry, stemMaterial);
            stem.position.y = 0.15;
            flower.add(stem);

            // Blossom
            const blossomGeometry = new THREE.SphereGeometry(0.1, 8, 8);
            const blossomMaterial = new THREE.MeshStandardMaterial({ 
                color: Math.random() < 0.5 ? 0xE6E6FA : 0xFFFACD
            });
            const blossom = new THREE.Mesh(blossomGeometry, blossomMaterial);
            blossom.position.y = 0.3;
            flower.add(blossom);

            flower.position.set(
                Math.random() * 80 - 40,
                -1.85,
                Math.random() * 1000 - 500
            );
            this.decorations.add(flower);
        }

        // Add trees with visible roots
        for (let i = 0; i < 30; i++) {
            const tree = new THREE.Group();
            
            // Roots
            for (let r = 0; r < 4; r++) {
                const rootGeometry = new THREE.CylinderGeometry(0.05, 0.02, 0.4, 4);
                const rootMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
                const root = new THREE.Mesh(rootGeometry, rootMaterial);
                root.position.y = -0.1;
                root.rotation.z = (Math.PI / 4) * r;
                root.rotation.y = Math.random() * Math.PI;
                tree.add(root);
            }
            
            // Trunk with wider base
            const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.4, 2, 8);
            const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.position.y = 1;
            tree.add(trunk);
            
            // Layered canopy for more natural look
            for (let l = 0; l < 3; l++) {
                const canopyGeometry = new THREE.SphereGeometry(1.2 - l * 0.2, 8, 8);
                const canopyMaterial = new THREE.MeshStandardMaterial({ 
                    color: 0xC1E1C1,
                    transparent: true,
                    opacity: 0.9
                });
                const canopy = new THREE.Mesh(canopyGeometry, canopyMaterial);
                canopy.position.y = 2 + l * 0.5;
                tree.add(canopy);
            }
            
            // Add blossoms
            for (let j = 0; j < 15; j++) {
                const blossomGeometry = new THREE.SphereGeometry(0.1, 8, 8);
                const blossomMaterial = new THREE.MeshStandardMaterial({ color: 0xFFB7C3 });
                const blossom = new THREE.Mesh(blossomGeometry, blossomMaterial);
                blossom.position.set(
                    (Math.random() - 0.5) * 2,
                    2 + Math.random() * 1.5,
                    (Math.random() - 0.5) * 2
                );
                tree.add(blossom);
            }
            
            tree.position.set(
                Math.random() * 80 - 40,
                -1.9,
                Math.random() * 1000 - 500
            );
            this.decorations.add(tree);
        }

        this.scene.add(this.decorations);
    }

    spawnBird() {
        const currentTime = Date.now();
        if (currentTime - this.lastBirdSpawn < this.birdSpawnInterval) return;

        const bird = new THREE.Group();
        
        // Bird body
        const bodyGeometry = new THREE.ConeGeometry(0.2, 0.6, 4);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: Math.random() < 0.5 ? 0x40E0D0 : 0xFF7F50 // Teal or coral
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.rotation.x = -Math.PI / 2;
        bird.add(body);

        // Wings
        const wingGeometry = new THREE.PlaneGeometry(0.6, 0.2);
        const wingMaterial = new THREE.MeshStandardMaterial({ 
            color: bodyMaterial.color,
            side: THREE.DoubleSide
        });
        
        const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
        leftWing.position.set(-0.3, 0, 0);
        bird.add(leftWing);

        const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
        rightWing.position.set(0.3, 0, 0);
        bird.add(rightWing);

        // Set initial position and properties
        bird.position.set(-20, 10 + Math.random() * 10, -50);
        bird.userData.speed = 0.2 + Math.random() * 0.1;
        bird.userData.wingAngle = 0;
        
        this.birds.push(bird);
        this.scene.add(bird);
        this.lastBirdSpawn = currentTime;
    }

    spawnObstacle() {
        const currentTime = Date.now();
        if (currentTime - this.lastObstacleSpawn < this.spawnCooldown) return;

        // Create fire obstacle group
        const fireGroup = new THREE.Group();

        // Create main fire body
        const mainFireGeometry = new THREE.ConeGeometry(0.6, 1.8, 12);
        const mainFireMaterial = new THREE.MeshStandardMaterial({
            color: 0xFF4500,
            emissive: 0xFF4500,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.9
        });
        const mainFire = new THREE.Mesh(mainFireGeometry, mainFireMaterial);
        mainFire.rotation.x = Math.PI;
        fireGroup.add(mainFire);

        // Add inner fire core
        const coreGeometry = new THREE.ConeGeometry(0.4, 1.4, 8);
        const coreMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFF00,
            emissive: 0xFFFF00,
            emissiveIntensity: 1,
            transparent: true,
            opacity: 0.7
        });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        core.rotation.x = Math.PI;
        core.position.y = -0.2;
        fireGroup.add(core);

        // Add smaller flame tendrils
        for (let i = 0; i < 4; i++) {
            const tendrilGeometry = new THREE.ConeGeometry(0.2, 1.2, 6);
            const tendrilMaterial = new THREE.MeshStandardMaterial({
                color: 0xFF6B00,
                emissive: 0xFF6B00,
                emissiveIntensity: 0.6,
                transparent: true,
                opacity: 0.6
            });
            const tendril = new THREE.Mesh(tendrilGeometry, tendrilMaterial);
            tendril.rotation.x = Math.PI;
            tendril.rotation.z = (Math.PI * 2 / 4) * i;
            tendril.position.set(
                Math.sin((Math.PI * 2 / 4) * i) * 0.3,
                -0.3,
                Math.cos((Math.PI * 2 / 4) * i) * 0.3
            );
            fireGroup.add(tendril);
        }

        // Position the fire group
        fireGroup.position.set(
            Math.random() * 6 - 3, // Random x position between -3 and 3
            0, // On the ground
            -100 // Start far ahead
        );

        // Add to scene and obstacles array
        this.obstacles.push(fireGroup);
        this.scene.add(fireGroup);
        this.lastObstacleSpawn = currentTime;

        // Decrease spawn cooldown as game progresses
        this.spawnCooldown = Math.max(500, this.spawnCooldown * 0.95);
    }

    updateObstacles() {
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            obstacle.position.z += this.speed;

            // Check for collision with player
            const distance = this.player.position.distanceTo(obstacle.position);
            if (distance < 1) {
                this.gameOver();
                return;
            }

            // Remove obstacles that are behind the player
            if (obstacle.position.z > 10) {
                this.scene.remove(obstacle);
                this.obstacles.splice(i, 1);
                this.score += 10;
                this.scoreElement.textContent = `Score: ${this.score}`;
            }
        }
    }

    gameOver() {
        this.isPlaying = false;
        this.isGameOver = true;
        this.finalScoreElement.textContent = this.score;
        this.gameOverMenu.style.display = 'block';
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.isPlaying) {
            // Update player
            this.player.position.y += this.jumpForce;
            this.jumpForce -= this.gravity;

            // Ground collision
            if (this.player.position.y < 0) {
                this.player.position.y = 0;
                this.jumpForce = 0;
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
                cloud.position.x += Math.sin(Date.now() * 0.001 + index) * 0.02;
                cloud.position.z += this.speed * 0.5;
                if (cloud.position.z > 50) {
                    cloud.position.z = -150;
                    cloud.position.x = Math.random() * 100 - 50;
                }
            });

            // Spawn and animate birds
            this.spawnBird();
            this.birds.forEach((bird, index) => {
                bird.position.x += bird.userData.speed;
                bird.position.z += this.speed * 0.3;
                
                // Animate wings
                bird.userData.wingAngle += 0.2;
                const wings = bird.children.slice(1); // Skip body
                wings.forEach(wing => {
                    wing.rotation.z = Math.sin(bird.userData.wingAngle) * 0.3;
                });

                // Remove birds that are out of view
                if (bird.position.x > 20 || bird.position.z > 50) {
                    this.scene.remove(bird);
                    this.birds.splice(index, 1);
                }
            });

            // Move ground
            this.ground.position.z += this.speed;
            if (this.ground.position.z > 500) {
                this.ground.position.z = 0;
            }

            // Move decorations
            if (this.decorations) {
                this.decorations.position.z += this.speed;
                if (this.decorations.position.z > 500) {
                    this.decorations.position.z = 0;
                }
            }
        }

        this.renderer.render(this.scene, this.camera);
    }

    setupPlayer() {
        // Create firefighter character with improved proportions
        this.player = new THREE.Group();

        // Body with more natural proportions
        const bodyGeometry = new THREE.CylinderGeometry(0.25, 0.3, 1.2, 16);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFF00 }); // Yellow shirt
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.6;
        this.player.add(body);

        // Head with better neck connection
        const headGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({ color: 0xFAD6A5 }); // Skin tone
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.3;
        this.player.add(head);

        // Improved hardhat with brim
        const hatGroup = new THREE.Group();
        const hatTopGeometry = new THREE.CylinderGeometry(0.22, 0.25, 0.15, 16);
        const hatBrimGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.05, 16);
        const hatMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFFFF00,
            metalness: 0.5,
            roughness: 0.3
        });
        const hatTop = new THREE.Mesh(hatTopGeometry, hatMaterial);
        const hatBrim = new THREE.Mesh(hatBrimGeometry, hatMaterial);
        hatBrim.position.y = -0.08;
        hatGroup.add(hatTop, hatBrim);
        hatGroup.position.y = 1.5;
        this.player.add(hatGroup);

        // Legs with better joint connections
        const legGeometry = new THREE.CylinderGeometry(0.08, 0.1, 0.6, 8);
        const legMaterial = new THREE.MeshStandardMaterial({ color: 0xB5EAD7 }); // Green pants
        
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.15, 0.3, 0);
        this.player.add(leftLeg);
        
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.15, 0.3, 0);
        this.player.add(rightLeg);

        // Improved boots with better ground contact
        const bootGeometry = new THREE.BoxGeometry(0.15, 0.1, 0.25);
        const bootMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 }); // Black boots
        
        const leftBoot = new THREE.Mesh(bootGeometry, bootMaterial);
        leftBoot.position.set(-0.15, 0.05, 0.02);
        this.player.add(leftBoot);
        
        const rightBoot = new THREE.Mesh(bootGeometry, bootMaterial);
        rightBoot.position.set(0.15, 0.05, 0.02);
        this.player.add(rightBoot);

        // Arms with shoulder definition
        const armGeometry = new THREE.CylinderGeometry(0.06, 0.08, 0.5, 8);
        const armMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFF00 }); // Yellow shirt
        
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-0.35, 0.9, 0);
        leftArm.rotation.z = -Math.PI / 6;
        this.player.add(leftArm);
        
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(0.35, 0.9, 0);
        rightArm.rotation.z = Math.PI / 6;
        this.player.add(rightArm);

        // Detailed toolbelt
        const beltGeometry = new THREE.CylinderGeometry(0.32, 0.32, 0.08, 16);
        const beltMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x4A4A4A,
            metalness: 0.3,
            roughness: 0.7
        });
        const belt = new THREE.Mesh(beltGeometry, beltMaterial);
        belt.position.y = 0.4;
        this.player.add(belt);

        // Add player to scene with proper ground placement
        this.player.position.y = 0;
        this.scene.add(this.player);

        // Store references for animation
        this.playerParts = {
            leftLeg,
            rightLeg,
            leftArm,
            rightArm
        };
    }

    setupCamera() {
        // Position camera at eye-level with the firefighter for better ground perspective
        this.camera.position.set(0, 2, 8);
        this.camera.lookAt(0, 1, -10); // Look slightly upward for better depth perception
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onKeyDown(event) {
        if (event.code === 'Space') {
            this.jump();
        }
    }

    jump() {
        if (this.isPlaying && this.player.position.y === 0) {
            this.jumpForce = 0.4;
        }
    }
}

// Start the game
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
});